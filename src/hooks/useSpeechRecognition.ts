import { useCallback, useEffect, useRef, useState } from 'react'

export type ListenLang = 'zh-HK' | 'en-US'

type BrowserSpeechRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<{
    isFinal: boolean
    0: { transcript: string }
  }>
}

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

function langFallbacks(lang: ListenLang): string[] {
  if (lang === 'en-US') return ['en-US', 'en-GB', 'en-HK', 'en']
  // Put zh-TW / zh-CN early as they often work when zh-HK/yue fail on phones
  return ['zh-HK', 'zh-TW', 'zh-CN', 'yue-HK', 'yue-Hant-HK']
}

function errorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return '需要開咪高峰。去瀏覽器設定允許麥克風，再撳 ●。'
    case 'audio-capture':
      return '搵唔到麥克風。請檢查電話咪高峰。'
    case 'network':
      return '語音轉文字連線唔穩——唔緊要，繼續講，最後撳 ★。'
    case 'language-not-supported':
      return '轉文字語言唔支援——唔緊要，繼續講，最後撳 ★。'
    case 'no-speech':
      return ''
    case 'aborted':
      return ''
    default:
      return ''
  }
}

function detach(rec: BrowserSpeechRecognition | null) {
  if (!rec) return
  rec.onstart = null
  rec.onresult = null
  rec.onerror = null
  rec.onend = null
}

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => {
    try {
      t.stop()
    } catch {
      /* ignore */
    }
  })
}

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg']
  return candidates.find((t) => MediaRecorder.isTypeSupported(t))
}

/**
 * Mic session is owned by getUserMedia + MediaRecorder (stays open until ■).
 * Web Speech STT is best-effort only — many phones kill it in <1s ("flash").
 */
export function useSpeechRecognition() {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [sttAlive, setSttAlive] = useState(false)

  const sessionId = useRef(0)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recRef = useRef<BrowserSpeechRecognition | null>(null)
  const wantListen = useRef(false)
  const langIdx = useRef(0)
  const langsRef = useRef<string[]>(['zh-HK'])
  const tickTimer = useRef<number | null>(null)
  const sttRestartTimer = useRef<number | null>(null)
  const startedAt = useRef(0)

  const clearTimers = () => {
    if (tickTimer.current) {
      window.clearInterval(tickTimer.current)
      tickTimer.current = null
    }
    if (sttRestartTimer.current) {
      window.clearTimeout(sttRestartTimer.current)
      sttRestartTimer.current = null
    }
  }

  const hardStopStt = () => {
    const rec = recRef.current
    detach(rec)
    try {
      rec?.abort()
    } catch {
      /* ignore */
    }
    recRef.current = null
    setSttAlive(false)
  }

  const hardStopSession = useCallback(() => {
    wantListen.current = false
    clearTimers()
    hardStopStt()
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }
    } catch {
      /* ignore */
    }
    recorderRef.current = null
    stopTracks(streamRef.current)
    streamRef.current = null
    setListening(false)
    setInterim('')
    setElapsedSec(0)
  }, [])

  useEffect(() => {
    const hasMic = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
    const hasStt = !!getRecognitionCtor()
    // Supported if we can at least open a mic session (STT optional)
    setSupported(hasMic || hasStt)
    return () => {
      sessionId.current += 1
      hardStopSession()
    }
  }, [hardStopSession])

  const reset = useCallback(() => {
    setTranscript('')
    setInterim('')
    setError(null)
    setElapsedSec(0)
  }, [])

  const stop = useCallback(() => {
    sessionId.current += 1
    hardStopSession()
  }, [hardStopSession])

  const startStt = useCallback((sid: number) => {
    const Ctor = getRecognitionCtor()
    if (!Ctor || !wantListen.current || sid !== sessionId.current) return

    hardStopStt()
    const rec = new Ctor()
    rec.continuous = true
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.lang = langsRef.current[langIdx.current] ?? langsRef.current[0]

    rec.onstart = () => {
      if (sid !== sessionId.current || !wantListen.current) return
      setSttAlive(true)
    }

    rec.onresult = (event) => {
      if (sid !== sessionId.current || !wantListen.current) return
      let finalChunk = ''
      let interimChunk = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0]?.transcript ?? ''
        if (event.results[i].isFinal) finalChunk += piece
        else interimChunk += piece
      }
      if (finalChunk) {
        setTranscript((prev) => `${prev}${prev ? ' ' : ''}${finalChunk}`.trim())
      }
      setInterim(interimChunk.trim())
    }

    rec.onerror = (event) => {
      if (sid !== sessionId.current) return
      const code = event.error
      if (code === 'aborted') return
      if (
        wantListen.current &&
        (code === 'language-not-supported' || code === 'network') &&
        langIdx.current < langsRef.current.length - 1
      ) {
        langIdx.current += 1
        return
      }
      const msg = errorMessage(code)
      // Soft: never kill the mic session for STT errors
      if (msg) setError(msg)
      setSttAlive(false)
    }

    rec.onend = () => {
      if (sid !== sessionId.current) return
      setSttAlive(false)
      if (!wantListen.current) return
      // Soft restart STT while mic session still open
      if (sttRestartTimer.current) window.clearTimeout(sttRestartTimer.current)
      sttRestartTimer.current = window.setTimeout(() => {
        if (sid !== sessionId.current || !wantListen.current) return
        startStt(sid)
      }, 400)
    }

    recRef.current = rec
    try {
      rec.start()
    } catch {
      setSttAlive(false)
      // Retry once shortly
      sttRestartTimer.current = window.setTimeout(() => {
        if (sid !== sessionId.current || !wantListen.current) return
        startStt(sid)
      }, 500)
    }
  }, [])

  const start = useCallback(
    async (lang: ListenLang = 'zh-HK') => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError('呢部電話唔支援麥克風。請爸爸媽媽聽完撳 ★。')
        return
      }

      // End any previous session cleanly
      sessionId.current += 1
      const sid = sessionId.current
      hardStopSession()
      wantListen.current = true

      setError(null)
      setInterim('')
      setTranscript('')
      setElapsedSec(0)
      setSttAlive(false)
      langsRef.current = langFallbacks(lang)
      langIdx.current = 0
      startedAt.current = Date.now()

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
          video: false,
        })
      } catch {
        wantListen.current = false
        setError(errorMessage('not-allowed'))
        setListening(false)
        return
      }

      if (sid !== sessionId.current || !wantListen.current) {
        stopTracks(stream)
        return
      }

      streamRef.current = stream
      setListening(true)

      // Keep mic owned by MediaRecorder so the session doesn't "flash" when STT dies
      try {
        const mime = pickRecorderMime()
        const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
        recorderRef.current = recorder
        // We discard audio blobs — recorder exists to hold the mic session open
        recorder.ondataavailable = () => {}
        recorder.start(1000)
      } catch {
        // Even without MediaRecorder, keeping the stream open holds the mic
        recorderRef.current = null
      }

      tickTimer.current = window.setInterval(() => {
        if (sid !== sessionId.current || !wantListen.current) return
        const sec = Math.floor((Date.now() - startedAt.current) / 1000)
        setElapsedSec(sec)
        // Auto-stop after 45s so mic doesn't hang forever
        if (sec >= 45) {
          sessionId.current += 1
          hardStopSession()
        }
      }, 250)

      // Best-effort STT (may fail/flash on some phones — session still stays open)
      window.setTimeout(() => {
        if (sid !== sessionId.current || !wantListen.current) return
        startStt(sid)
      }, 200)
    },
    [hardStopSession, startStt],
  )

  return {
    supported,
    listening,
    transcript,
    interim,
    error,
    elapsedSec,
    sttAlive,
    start,
    stop,
    reset,
  }
}
