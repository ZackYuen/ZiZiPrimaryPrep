import { useCallback, useEffect, useRef, useState } from 'react'
import { transcribeWithWhisper } from '../lib/whisperTranscribe'

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
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      [index: number]: { transcript: string }
    }
  }
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

function isAppleWebKit(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  if (/Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|CriOS|FxiOS/i.test(ua)) return true
  return typeof navigator.vendor === 'string' && navigator.vendor.includes('Apple')
}

function isMobileUa(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

function canUseMic(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

function langFallbacks(lang: ListenLang): string[] {
  if (lang === 'en-US') return ['en-US', 'en-GB', 'en-HK', 'en']
  return ['zh-HK', 'zh-TW', 'zh-CN', 'zh-Hans', 'yue-HK']
}

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const candidates = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm']
  return candidates.find((t) => MediaRecorder.isTypeSupported(t))
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

/**
 * Chrome: live Web Speech.
 * Safari: record with MediaRecorder, then Whisper (on-device) on ■ so words appear
 * without Web Speech restart loops that crash iOS tabs.
 */
export function useSpeechRecognition() {
  const apple = typeof navigator !== 'undefined' && isAppleWebKit()

  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [sttAlive, setSttAlive] = useState(false)
  const [heardSpeech, setHeardSpeech] = useState(false)
  const [activeLang, setActiveLang] = useState('zh-HK')
  const [statusHint, setStatusHint] = useState('')
  const [engine, setEngine] = useState<'safari' | 'chrome' | 'none'>('none')
  const [busy, setBusy] = useState(false)

  const sessionId = useRef(0)
  const recRef = useRef<BrowserSpeechRecognition | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const wantListen = useRef(false)
  const runningRef = useRef(false)
  const langIdx = useRef(0)
  const langsRef = useRef<string[]>(['zh-HK'])
  const listenLangRef = useRef<ListenLang>('zh-HK')
  const tickTimer = useRef<number | null>(null)
  const restartTimer = useRef<number | null>(null)
  const restartCount = useRef(0)
  const startedAt = useRef(0)
  const interimRef = useRef('')
  const appleRef = useRef(apple)
  const transcriptRef = useRef('')

  appleRef.current = apple

  const clearTimers = () => {
    if (tickTimer.current) {
      window.clearInterval(tickTimer.current)
      tickTimer.current = null
    }
    if (restartTimer.current) {
      window.clearTimeout(restartTimer.current)
      restartTimer.current = null
    }
  }

  const flushInterim = useCallback(() => {
    const chunk = interimRef.current.trim()
    interimRef.current = ''
    setInterim('')
    if (!chunk) return
    setTranscript((prev) => {
      const next = `${prev}${chunk}`.trim()
      transcriptRef.current = next
      return next
    })
  }, [])

  const stopRecorder = () => {
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.ondataavailable = null
        recorderRef.current.onerror = null
        recorderRef.current.onstop = null
        recorderRef.current.stop()
      }
    } catch {
      /* ignore */
    }
    recorderRef.current = null
    stopTracks(streamRef.current)
    streamRef.current = null
  }

  const stopRecognition = useCallback(() => {
    const rec = recRef.current
    if (!rec) return
    rec.onstart = null
    rec.onresult = null
    rec.onerror = null
    rec.onend = null
    try {
      rec.abort()
    } catch {
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
    }
    recRef.current = null
    runningRef.current = false
  }, [])

  const hardStopSession = useCallback(() => {
    wantListen.current = false
    clearTimers()
    flushInterim()
    stopRecognition()
    stopRecorder()
    setListening(false)
    setSttAlive(false)
    setElapsedSec(0)
    setHeardSpeech(false)
    setStatusHint('')
    setBusy(false)
  }, [flushInterim, stopRecognition])

  useEffect(() => {
    const appleNow = isAppleWebKit()
    // Safari: mic is enough (Whisper path). Chrome: prefer Web Speech.
    setSupported(appleNow ? canUseMic() : !!getRecognitionCtor() || canUseMic())
    setEngine(appleNow ? 'safari' : getRecognitionCtor() ? 'chrome' : canUseMic() ? 'chrome' : 'none')
    return () => {
      sessionId.current += 1
      wantListen.current = false
      clearTimers()
      stopRecognition()
      stopRecorder()
    }
  }, [stopRecognition])

  const reset = useCallback(() => {
    setTranscript('')
    transcriptRef.current = ''
    interimRef.current = ''
    setInterim('')
    setError(null)
    setElapsedSec(0)
    setHeardSpeech(false)
    setStatusHint('')
    chunksRef.current = []
  }, [])

  const finishSafariSessionRef = useRef<(sid: number) => Promise<void>>(async () => {})

  const finishSafariSession = useCallback(async (sid: number) => {
    wantListen.current = false
    clearTimers()
    setListening(false)
    setSttAlive(false)

    const recorder = recorderRef.current
    const stream = streamRef.current

    const blob: Blob | null = await new Promise((resolve) => {
      if (!recorder || recorder.state === 'inactive') {
        stopTracks(stream)
        streamRef.current = null
        recorderRef.current = null
        resolve(chunksRef.current.length ? new Blob(chunksRef.current, { type: 'audio/mp4' }) : null)
        return
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/mp4'
        const b = new Blob(chunksRef.current, { type })
        stopTracks(stream)
        streamRef.current = null
        recorderRef.current = null
        resolve(b)
      }
      try {
        recorder.stop()
      } catch {
        stopTracks(stream)
        streamRef.current = null
        recorderRef.current = null
        resolve(chunksRef.current.length ? new Blob(chunksRef.current, { type: 'audio/mp4' }) : null)
      }
    })

    // stop()/auto-stop bumps sessionId to sid+1; abort if user started a newer session
    if (sessionId.current !== sid && sessionId.current !== sid + 1) {
      setBusy(false)
      return
    }

    if (transcriptRef.current.trim()) {
      setStatusHint('')
      setBusy(false)
      setElapsedSec(0)
      return
    }

    if (!blob || blob.size < 800) {
      setStatusHint('未錄到聲——再撳 ● 試一次，或爸爸媽媽撳 ★')
      setBusy(false)
      setElapsedSec(0)
      return
    }

      setBusy(true)
      setStatusHint(
        listenLangRef.current === 'en-US'
          ? '轉文字中…'
          : '轉文字中（電話用輕量模式，避免當機）…',
      )
    try {
      const text = await transcribeWithWhisper(
        blob,
        listenLangRef.current === 'en-US' ? 'en' : 'zh',
        (msg) => setStatusHint(msg),
      )
      if (text) {
        transcriptRef.current = text
        setTranscript(text)
        setHeardSpeech(true)
        setStatusHint('轉字完成 ✓（唔準可以再講，或以 ★ 為準）')
        setError(null)
      } else {
        setStatusHint('聽唔到清楚嘅字——再講一次，或爸爸媽媽撳 ★')
      }
    } catch {
      setStatusHint('轉字逾時或失敗——請再試短句，或爸爸媽媽聽完撳 ★')
    } finally {
      setBusy(false)
      setElapsedSec(0)
      chunksRef.current = []
    }
  }, [])

  finishSafariSessionRef.current = finishSafariSession
  const startSafariRecord = useCallback(
    async (sid: number, lang: ListenLang) => {
      if (!canUseMic()) {
        setError('呢部 Safari 開唔到麥克風。請爸爸媽媽聽完撳 ★。')
        setListening(false)
        wantListen.current = false
        return
      }

      listenLangRef.current = lang
      chunksRef.current = []
      transcriptRef.current = ''
      setTranscript('')
      setInterim('')
      setStatusHint('請允許麥克風…')

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      } catch {
        if (sid !== sessionId.current) return
        wantListen.current = false
        setListening(false)
        setStatusHint('')
        setError('麥克風未允許。撳網址列「aA」→ 網站設定 → 麥克風 → 允許，再撳 ●。')
        return
      }

      if (sid !== sessionId.current || !wantListen.current) {
        stopTracks(stream)
        return
      }

      streamRef.current = stream
      const mime = pickRecorderMime()
      try {
        const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
        recorder.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data)
        }
        recorder.onerror = () => {
          setStatusHint('錄音出錯——再撳 ●，或用 ★')
        }
        // Request data periodically so we always have audio even if stop is flaky
        recorder.start(1000)
        recorderRef.current = recorder
      } catch {
        recorderRef.current = null
        setError('呢部 Safari 唔支援錄音轉字。請爸爸媽媽聽完撳 ★。')
        stopTracks(stream)
        streamRef.current = null
        wantListen.current = false
        setListening(false)
        return
      }

      setHeardSpeech(true)
      setSttAlive(true)
      setError(null)
      setStatusHint('錄音中——請大聲講（約 10 秒內），講完撳 ■ 就會出字')
      startedAt.current = Date.now()
      if (tickTimer.current) window.clearInterval(tickTimer.current)
      tickTimer.current = window.setInterval(() => {
        if (sid !== sessionId.current || !wantListen.current) return
        const sec = Math.floor((Date.now() - startedAt.current) / 1000)
        setElapsedSec(sec)
        if (sec >= 12) {
          sessionId.current += 1
          void finishSafariSessionRef.current(sid)
        }
      }, 250)
    },
    [],
  )

  const startChromeStt = useCallback(
    (lang: ListenLang, sid: number) => {
      const Ctor = getRecognitionCtor()
      if (!Ctor) {
        wantListen.current = false
        setListening(false)
        setError('呢部瀏覽器暫唔支援語音轉文字。請爸爸媽媽聽完撳 ★。')
        return
      }

      stopRecognition()
      const rec = new Ctor()
      recRef.current = rec
      langsRef.current = langFallbacks(lang)
      langIdx.current = 0
      restartCount.current = 0
      setActiveLang(langsRef.current[0])
      setStatusHint('啟動轉文字…')

      rec.continuous = !isMobileUa()
      rec.interimResults = true
      rec.maxAlternatives = 1
      rec.lang = langsRef.current[0]

      rec.onstart = () => {
        if (sid !== sessionId.current || !wantListen.current) return
        runningRef.current = true
        setSttAlive(true)
        setStatusHint('請大聲講…')
        setError(null)
      }

      rec.onresult = (event) => {
        if (sid !== sessionId.current || !wantListen.current) return
        let finalChunk = ''
        let interimChunk = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i]?.[0]?.transcript?.trim() ?? ''
          if (!piece) continue
          if (event.results[i].isFinal) finalChunk += piece
          else interimChunk += piece
        }
        if (finalChunk) {
          setTranscript((prev) => {
            const next = `${prev}${finalChunk}`.trim()
            transcriptRef.current = next
            return next
          })
          interimRef.current = ''
          setInterim('')
        } else {
          interimRef.current = interimChunk
          setInterim(interimChunk)
        }
        if (finalChunk || interimChunk) {
          setHeardSpeech(true)
          setStatusHint('')
          setError(null)
        }
        setSttAlive(true)
      }

      rec.onerror = (event) => {
        if (sid !== sessionId.current) return
        runningRef.current = false
        setSttAlive(false)
        const code = event.error
        if (code === 'aborted') return
        if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') {
          wantListen.current = false
          clearTimers()
          setListening(false)
          setError('需要開咪高峰。去瀏覽器設定允許麥克風，再撳 ●。')
          return
        }
        if (
          wantListen.current &&
          (code === 'language-not-supported' || code === 'network') &&
          langIdx.current < langsRef.current.length - 1
        ) {
          langIdx.current += 1
          setActiveLang(langsRef.current[langIdx.current])
          rec.lang = langsRef.current[langIdx.current]
          setStatusHint(`改用 ${rec.lang}…`)
          return
        }
        if (code === 'no-speech') setStatusHint('聽唔到聲——請靠近咪高峰大聲講。')
        else if (code === 'network') setError('轉文字要網絡。可繼續講，最後撳 ★。')
      }

      rec.onend = () => {
        if (sid !== sessionId.current) return
        runningRef.current = false
        setSttAlive(false)
        flushInterim()
        if (!wantListen.current) return
        if (restartCount.current >= 30) {
          setStatusHint('轉文字已停——可再撳 ●，或用 ★')
          return
        }
        restartCount.current += 1
        if (restartTimer.current) window.clearTimeout(restartTimer.current)
        restartTimer.current = window.setTimeout(() => {
          if (sid !== sessionId.current || !wantListen.current || !recRef.current) return
          try {
            recRef.current.start()
          } catch {
            /* ignore */
          }
        }, 400)
      }

      startedAt.current = Date.now()
      if (tickTimer.current) window.clearInterval(tickTimer.current)
      tickTimer.current = window.setInterval(() => {
        if (sid !== sessionId.current || !wantListen.current) return
        const sec = Math.floor((Date.now() - startedAt.current) / 1000)
        setElapsedSec(sec)
        if (sec >= 45) {
          sessionId.current += 1
          hardStopSession()
        }
      }, 250)

      try {
        rec.start()
      } catch {
        wantListen.current = false
        setListening(false)
        setError('開唔到語音辨識。請再用 Chrome，或撳 ★。')
      }
    },
    [flushInterim, hardStopSession, stopRecognition],
  )

  const stop = useCallback(() => {
    const sid = sessionId.current
    if (appleRef.current) {
      sessionId.current += 1
      void finishSafariSessionRef.current(sid)
      return
    }
    sessionId.current += 1
    hardStopSession()
  }, [hardStopSession])

  const start = useCallback(
    (lang: ListenLang = 'zh-HK') => {
      sessionId.current += 1
      const sid = sessionId.current
      hardStopSession()

      wantListen.current = true
      setError(null)
      setTranscript('')
      transcriptRef.current = ''
      interimRef.current = ''
      setInterim('')
      setElapsedSec(0)
      setSttAlive(false)
      setHeardSpeech(false)
      setListening(true)
      setBusy(false)
      setActiveLang(langFallbacks(lang)[0])
      listenLangRef.current = lang

      if (appleRef.current) {
        void startSafariRecord(sid, lang)
        return
      }
      startChromeStt(lang, sid)
    },
    [hardStopSession, startChromeStt, startSafariRecord],
  )

  return {
    supported,
    listening,
    transcript,
    interim,
    error,
    elapsedSec,
    sttAlive,
    heardSpeech,
    activeLang,
    statusHint,
    engine,
    busy,
    start,
    stop,
    reset,
  }
}
