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
  onspeechstart: (() => void) | null
  onspeechend: (() => void) | null
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: {
    length: number
    [index: number]: {
      isFinal: boolean
      length: number
      [index: number]: { transcript: string; confidence: number }
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

function isAppleSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)
  const isAppleVendor = typeof navigator.vendor === 'string' && navigator.vendor.includes('Apple')
  return isIOS || isSafari || isAppleVendor
}

function isMobileUa(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

function canUseMic(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

function langFallbacks(lang: ListenLang, apple: boolean): string[] {
  if (lang === 'en-US') return ['en-US', 'en-GB', 'en-HK', 'en']
  if (apple) return ['zh-HK', 'zh-TW', 'zh-CN', 'yue-HK', 'en-HK', 'en-US']
  return ['zh-HK', 'yue-Hant-HK', 'zh-TW', 'zh-Hant', 'zh-Hans', 'cmn-Hans-CN', 'zh-CN']
}

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const candidates = ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm', 'audio/ogg']
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

function readPiece(result: SpeechRecognitionEventLike['results'][number]): string {
  return (result[0]?.transcript ?? '').trim()
}

/**
 * Safari often grants mic (orange dot) but SpeechRecognition returns not-allowed.
 * Strategy: try STT first for words; on failure fall back to MediaRecorder so ●
 * still starts a real listen session (parent uses ★). Never show false "mic denied"
 * when getUserMedia works.
 */
export function useSpeechRecognition() {
  const apple = typeof navigator !== 'undefined' && isAppleSafari()

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
  const sttEnabled = useRef(true)
  const langIdx = useRef(0)
  const langsRef = useRef<string[]>(['zh-HK'])
  const tickTimer = useRef<number | null>(null)
  const restartTimer = useRef<number | null>(null)
  const startedAt = useRef(0)
  const interimRef = useRef('')
  const gotResultRef = useRef(false)
  const handlersBound = useRef(false)
  const appleRef = useRef(apple)
  /** recorder = MediaRecorder owns session; stt = SpeechRecognition owns session */
  const modeRef = useRef<'none' | 'stt' | 'recorder'>('none')
  const langRef = useRef<ListenLang>('zh-HK')
  const fallbackToRecorderRef = useRef<(sid: number) => void>(() => {})

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
        recorderRef.current.stop()
      }
    } catch {
      /* ignore */
    }
    recorderRef.current = null
    stopTracks(streamRef.current)
    streamRef.current = null
  }

  const stopRecSafely = useCallback((rec: BrowserSpeechRecognition | null) => {
    if (!rec) return
    try {
      if (appleRef.current) {
        try {
          rec.start()
        } catch {
          /* already started */
        }
      }
      rec.stop()
    } catch {
      try {
        rec.abort()
      } catch {
        /* ignore */
      }
    }
  }, [])

  const bindHandlers = useCallback(
    (rec: BrowserSpeechRecognition) => {
      if (handlersBound.current) return
      handlersBound.current = true

      rec.onstart = () => {
        if (!wantListen.current || !sttEnabled.current) return
        runningRef.current = true
        modeRef.current = 'stt'
        setSttAlive(true)
        setStatusHint(appleRef.current ? 'Safari 聽寫中…請大聲講' : '請大聲講…')
        setError(null)
      }

      rec.onspeechstart = () => {
        if (!wantListen.current) return
        setHeardSpeech(true)
        setStatusHint('聽到聲，轉文字中…')
      }

      rec.onspeechend = () => {
        if (!wantListen.current) return
        if (!gotResultRef.current) setStatusHint('處理緊…')
      }

      rec.onresult = (event) => {
        if (!wantListen.current || !sttEnabled.current) return
        let finalChunk = ''
        let interimChunk = ''
        for (let i = 0; i < event.results.length; i++) {
          const piece = readPiece(event.results[i])
          if (!piece) continue
          if (event.results[i].isFinal) finalChunk += piece
          else interimChunk += piece
        }
        if (finalChunk || interimChunk) {
          gotResultRef.current = true
          setHeardSpeech(true)
          setStatusHint('')
          setError(null)
        }
        if (finalChunk) {
          setTranscript((prev) => `${prev}${finalChunk}`.trim())
          interimRef.current = ''
          setInterim('')
        } else {
          interimRef.current = interimChunk
          setInterim(interimChunk)
        }
        setSttAlive(true)
      }

      rec.onerror = (event) => {
        const code = event.error
        if (code === 'aborted') return
        runningRef.current = false
        setSttAlive(false)

        // Already in recorder fallback — ignore STT errors
        if (modeRef.current === 'recorder') return

        // Safari STT often says not-allowed even when mic works → fall back to recorder
        if (
          appleRef.current &&
          wantListen.current &&
          (code === 'not-allowed' || code === 'service-not-allowed' || code === 'network' || code === 'language-not-supported')
        ) {
          sttEnabled.current = false
          setError(null)
          setStatusHint('改用錄音模式…')
          fallbackToRecorderRef.current(sessionId.current)
          return
        }

        if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') {
          wantListen.current = false
          modeRef.current = 'none'
          clearTimers()
          setListening(false)
          setElapsedSec(0)
          setStatusHint('')
          setError('需要開咪高峰。去瀏覽器設定允許麥克風，再撳 ●。')
          return
        }

        if (
          wantListen.current &&
          (code === 'language-not-supported' || code === 'network') &&
          langIdx.current < langsRef.current.length - 1
        ) {
          langIdx.current += 1
          const next = langsRef.current[langIdx.current]
          setActiveLang(next)
          setStatusHint(`改用 ${next}…`)
          rec.lang = next
          if (restartTimer.current) window.clearTimeout(restartTimer.current)
          restartTimer.current = window.setTimeout(() => {
            if (!wantListen.current || !sttEnabled.current) return
            try {
              rec.start()
            } catch {
              /* ignore */
            }
          }, 350)
          return
        }

        if (code === 'no-speech') {
          setStatusHint('聽唔到聲——請靠近咪高峰大聲講。')
          if (wantListen.current && modeRef.current === 'stt') {
            if (restartTimer.current) window.clearTimeout(restartTimer.current)
            restartTimer.current = window.setTimeout(() => {
              if (!wantListen.current || !sttEnabled.current || modeRef.current !== 'stt') return
              try {
                rec.start()
              } catch {
                /* ignore */
              }
            }, 400)
          }
        }
      }

      rec.onend = () => {
        runningRef.current = false
        setSttAlive(false)
        flushInterim()
        if (!wantListen.current || !sttEnabled.current || modeRef.current !== 'stt') return
        if (restartTimer.current) window.clearTimeout(restartTimer.current)
        restartTimer.current = window.setTimeout(() => {
          if (!wantListen.current || !sttEnabled.current || modeRef.current !== 'stt' || !recRef.current || runningRef.current)
            return
          try {
            recRef.current.start()
          } catch {
            /* ignore */
          }
        }, appleRef.current ? 180 : 280)
      }
    },
    [flushInterim],
  )

  const ensureRec = useCallback(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) return null
    if (recRef.current) {
      bindHandlers(recRef.current)
      return recRef.current
    }
    const rec = new Ctor()
    recRef.current = rec
    handlersBound.current = false
    bindHandlers(rec)
    return rec
  }, [bindHandlers])

  const hardStopSession = useCallback(() => {
    wantListen.current = false
    sttEnabled.current = false
    modeRef.current = 'none'
    clearTimers()
    flushInterim()
    stopRecSafely(recRef.current)
    stopRecorder()
    runningRef.current = false
    setListening(false)
    setSttAlive(false)
    setElapsedSec(0)
    setHeardSpeech(false)
    setStatusHint('')
  }, [flushInterim, stopRecSafely])

  useEffect(() => {
    const hasStt = !!getRecognitionCtor()
    const hasMic = canUseMic()
    setSupported(hasStt || hasMic)
    setEngine(isAppleSafari() ? 'safari' : hasStt ? 'chrome' : hasMic ? 'chrome' : 'none')
    return () => {
      sessionId.current += 1
      wantListen.current = false
      clearTimers()
      stopRecSafely(recRef.current)
      stopRecorder()
      const rec = recRef.current
      if (rec) {
        rec.onstart = null
        rec.onresult = null
        rec.onerror = null
        rec.onend = null
        rec.onspeechstart = null
        rec.onspeechend = null
      }
      recRef.current = null
      handlersBound.current = false
    }
  }, [stopRecSafely])

  const reset = useCallback(() => {
    setTranscript('')
    interimRef.current = ''
    setInterim('')
    setError(null)
    setElapsedSec(0)
    setHeardSpeech(false)
    setStatusHint('')
    gotResultRef.current = false
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

  const startRecorderFallback = useCallback(
    async (sid: number) => {
      if (sid !== sessionId.current || !wantListen.current) return
      if (!canUseMic()) {
        setListening(false)
        wantListen.current = false
        setError('開唔到麥克風。請爸爸媽媽聽完撳 ★。')
        return
      }

      // Fully stop STT before taking the mic
      sttEnabled.current = false
      stopRecSafely(recRef.current)
      runningRef.current = false
      setSttAlive(false)

      setStatusHint('開錄音…')
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      } catch {
        if (sid !== sessionId.current) return
        wantListen.current = false
        modeRef.current = 'none'
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
      modeRef.current = 'recorder'
      const mime = pickRecorderMime()
      try {
        const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
        recorderRef.current = recorder
        recorder.start(1000)
      } catch {
        recorderRef.current = null
      }

      setListening(true)
      setHeardSpeech(true)
      setError(null)
      setStatusHint('錄音中——請大聲講；轉字喺 Safari 唔穩，爸爸媽媽聽完撳 ★')
      if (!tickTimer.current) startTick(sid)
    },
    [startTick, stopRecSafely],
  )

  useEffect(() => {
    fallbackToRecorderRef.current = startRecorderFallback
  }, [startRecorderFallback])

  const start = useCallback(
    (lang: ListenLang = 'zh-HK') => {
      sessionId.current += 1
      const sid = sessionId.current
      hardStopSession()

      langRef.current = lang
      wantListen.current = true
      sttEnabled.current = true
      gotResultRef.current = false
      modeRef.current = 'none'
      setError(null)
      setTranscript('')
      interimRef.current = ''
      setInterim('')
      setElapsedSec(0)
      setSttAlive(false)
      setHeardSpeech(false)
      setListening(true)
      langsRef.current = langFallbacks(lang, appleRef.current)
      langIdx.current = 0
      setActiveLang(langsRef.current[0])
      startTick(sid)

      // Safari: try STT first (for words). If it fails → recorder fallback (session still works).
      if (appleRef.current) {
        const rec = ensureRec()
        if (rec) {
          setStatusHint('啟動 Safari 聽寫…')
          modeRef.current = 'stt'
          rec.continuous = true
          rec.interimResults = true
          rec.maxAlternatives = 1
          rec.lang = langsRef.current[0]
          try {
            rec.start()
          } catch {
            void startRecorderFallback(sid)
          }
          // If STT never starts, fall back quickly
          window.setTimeout(() => {
            if (sid !== sessionId.current || !wantListen.current) return
            if (modeRef.current === 'stt' && !runningRef.current && !gotResultRef.current) {
              void startRecorderFallback(sid)
            }
          }, 1200)
          return
        }
        void startRecorderFallback(sid)
        return
      }

      // Chrome path
      const rec = ensureRec()
      if (!rec) {
        wantListen.current = false
        setListening(false)
        setError('呢部瀏覽器暫唔支援語音轉文字。請爸爸媽媽聽完撳 ★。')
        return
      }
      setStatusHint('啟動轉文字…')
      modeRef.current = 'stt'
      rec.continuous = !isMobileUa()
      rec.interimResults = true
      rec.maxAlternatives = 1
      rec.lang = langsRef.current[0]
      try {
        rec.start()
      } catch {
        window.setTimeout(() => {
          if (sid !== sessionId.current || !wantListen.current) return
          try {
            rec.start()
          } catch {
            wantListen.current = false
            setListening(false)
            setError('開唔到語音辨識。請再用 Chrome，或撳 ★。')
          }
        }, 300)
      }
    },
    [ensureRec, hardStopSession, startRecorderFallback, startTick],
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
