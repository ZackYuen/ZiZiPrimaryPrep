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
  // All iOS browsers are WebKit; desktop Safari too. Web Speech restarts crash Safari tabs.
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  if (/Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR/i.test(ua)) return true
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
  return ['zh-HK', 'zh-TW', 'zh-Hans', 'zh-CN', 'yue-HK']
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
 * Safari/iOS: NEVER use SpeechRecognition (restart loops crash the tab).
 * Use a simple getUserMedia (+ MediaRecorder) practice session; parent confirms ★.
 * Chrome/Android: Web Speech for live words.
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

  const sessionId = useRef(0)
  const recRef = useRef<BrowserSpeechRecognition | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const wantListen = useRef(false)
  const runningRef = useRef(false)
  const langIdx = useRef(0)
  const langsRef = useRef<string[]>(['zh-HK'])
  const tickTimer = useRef<number | null>(null)
  const restartTimer = useRef<number | null>(null)
  const restartCount = useRef(0)
  const startedAt = useRef(0)
  const interimRef = useRef('')
  const appleRef = useRef(apple)

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
    setTranscript((prev) => `${prev}${chunk}`.trim())
  }, [])

  const stopRecorder = () => {
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.ondataavailable = null
        recorderRef.current.onerror = null
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
  }, [flushInterim, stopRecognition])

  useEffect(() => {
    const appleNow = isAppleWebKit()
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
    interimRef.current = ''
    setInterim('')
    setError(null)
    setElapsedSec(0)
    setHeardSpeech(false)
    setStatusHint('')
  }, [])

  const stop = useCallback(() => {
    sessionId.current += 1
    hardStopSession()
  }, [hardStopSession])

  const startTick = useCallback(
    (sid: number) => {
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
    },
    [hardStopSession],
  )

  /** Safari-safe: mic hold only. No SpeechRecognition (prevents tab crash loops). */
  const startSafariRecord = useCallback(
    async (sid: number) => {
      if (!canUseMic()) {
        setError('呢部 Safari 開唔到麥克風。請爸爸媽媽聽完撳 ★。')
        setListening(false)
        wantListen.current = false
        return
      }

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
        // No timeslice callback storm — just keep the session alive
        recorder.start()
        recorderRef.current = recorder
      } catch {
        // Holding getUserMedia tracks is enough for practice + orange mic
        recorderRef.current = null
      }

      setHeardSpeech(true)
      setSttAlive(false)
      setError(null)
      setStatusHint('錄音中——請大聲講。Safari 唔轉字，爸爸媽媽聽完撳 ★')
      startTick(sid)
    },
    [startTick],
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
          setTranscript((prev) => `${prev}${finalChunk}`.trim())
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

        if (code === 'no-speech') {
          setStatusHint('聽唔到聲——請靠近咪高峰大聲講。')
        } else if (code === 'network') {
          setError('轉文字要網絡。可繼續講，最後撳 ★。')
        }
      }

      rec.onend = () => {
        if (sid !== sessionId.current) return
        runningRef.current = false
        setSttAlive(false)
        flushInterim()
        if (!wantListen.current) return
        // Cap restarts — prevents crash loops on flaky mobile Chrome
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

      startTick(sid)
      try {
        rec.start()
      } catch {
        wantListen.current = false
        setListening(false)
        setError('開唔到語音辨識。請再用 Chrome，或撳 ★。')
      }
    },
    [flushInterim, startTick, stopRecognition],
  )

  const start = useCallback(
    (lang: ListenLang = 'zh-HK') => {
      sessionId.current += 1
      const sid = sessionId.current
      hardStopSession()

      wantListen.current = true
      setError(null)
      setTranscript('')
      interimRef.current = ''
      setInterim('')
      setElapsedSec(0)
      setSttAlive(false)
      setHeardSpeech(false)
      setListening(true)
      setActiveLang(langFallbacks(lang)[0])

      if (appleRef.current) {
        void startSafariRecord(sid)
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
    start,
    stop,
    reset,
  }
}
