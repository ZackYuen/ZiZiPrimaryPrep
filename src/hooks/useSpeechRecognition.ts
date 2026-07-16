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

function isMobileUa(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

/**
 * Prefer tags Chromium's network recognizer actually accepts.
 * Note: zh-CN alone can silently return nothing on some Chrome builds (use zh-Hans).
 */
function langFallbacks(lang: ListenLang): string[] {
  if (lang === 'en-US') return ['en-US', 'en-GB', 'en-HK', 'en']
  return ['zh-HK', 'yue-Hant-HK', 'zh-TW', 'zh-Hant', 'zh-Hans', 'cmn-Hans-CN', 'zh-CN']
}

function errorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return '需要開咪高峰。去瀏覽器設定允許麥克風，再撳 ●。'
    case 'audio-capture':
      return '搵唔到麥克風。請檢查電話咪高峰。'
    case 'network':
      return '轉文字要連網（建議用 Chrome）。可試 EN，或最後撳 ★。'
    case 'language-not-supported':
      return '呢個語言轉文字唔支援——可試 EN，或最後撳 ★。'
    case 'no-speech':
      return '聽唔到聲——請靠近咪高峰大聲講。'
    default:
      return code ? `轉文字問題：${code}` : ''
  }
}

function detach(rec: BrowserSpeechRecognition | null) {
  if (!rec) return
  rec.onstart = null
  rec.onresult = null
  rec.onerror = null
  rec.onend = null
  rec.onspeechstart = null
  rec.onspeechend = null
}

function readTranscript(result: SpeechRecognitionEventLike['results'][number]): string {
  const alt = result[0] ?? (result.length > 0 ? result[0] : null)
  return (alt?.transcript ?? '').trim()
}

/**
 * SpeechRecognition must be started inside the user-gesture call stack.
 * Do not await getUserMedia / setTimeout before rec.start() — that often yields
 * a "listening" UI with zero transcripts on mobile Chrome.
 */
export function useSpeechRecognition() {
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

  const sessionId = useRef(0)
  const recRef = useRef<BrowserSpeechRecognition | null>(null)
  const wantListen = useRef(false)
  const runningRef = useRef(false)
  const langIdx = useRef(0)
  const langsRef = useRef<string[]>(['zh-HK'])
  const tickTimer = useRef<number | null>(null)
  const sttRestartTimer = useRef<number | null>(null)
  const langRotateTimer = useRef<number | null>(null)
  const startedAt = useRef(0)
  const startingStt = useRef(false)
  const interimRef = useRef('')
  const gotResultRef = useRef(false)
  const startSttRef = useRef<(sid: number) => void>(() => {})

  const clearTimers = () => {
    if (tickTimer.current) {
      window.clearInterval(tickTimer.current)
      tickTimer.current = null
    }
    if (sttRestartTimer.current) {
      window.clearTimeout(sttRestartTimer.current)
      sttRestartTimer.current = null
    }
    if (langRotateTimer.current) {
      window.clearTimeout(langRotateTimer.current)
      langRotateTimer.current = null
    }
  }

  const flushInterim = useCallback(() => {
    const chunk = interimRef.current.trim()
    interimRef.current = ''
    setInterim('')
    if (!chunk) return
    setTranscript((prev) => `${prev}${chunk}`.trim())
  }, [])

  const clearRec = (mode: 'abort' | 'stop' | 'drop') => {
    const rec = recRef.current
    detach(rec)
    if (rec && runningRef.current && mode !== 'drop') {
      try {
        if (mode === 'stop') rec.stop()
        else rec.abort()
      } catch {
        try {
          rec.abort()
        } catch {
          /* ignore */
        }
      }
    }
    recRef.current = null
    runningRef.current = false
    startingStt.current = false
    setSttAlive(false)
  }

  const hardStopSession = useCallback(() => {
    wantListen.current = false
    clearTimers()
    flushInterim()
    clearRec('stop')
    setListening(false)
    setElapsedSec(0)
    setHeardSpeech(false)
    setStatusHint('')
  }, [flushInterim])

  useEffect(() => {
    setSupported(!!getRecognitionCtor())
    return () => {
      sessionId.current += 1
      hardStopSession()
    }
  }, [hardStopSession])

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

  const scheduleSttRestart = useCallback((sid: number, delayMs: number) => {
    if (sttRestartTimer.current) window.clearTimeout(sttRestartTimer.current)
    sttRestartTimer.current = window.setTimeout(() => {
      if (sid !== sessionId.current || !wantListen.current) return
      startSttRef.current(sid)
    }, delayMs)
  }, [])

  const scheduleLangRotateIfSilent = useCallback(
    (sid: number) => {
      if (langRotateTimer.current) window.clearTimeout(langRotateTimer.current)
      langRotateTimer.current = window.setTimeout(() => {
        if (sid !== sessionId.current || !wantListen.current) return
        if (gotResultRef.current) return
        if (langIdx.current >= langsRef.current.length - 1) {
          setStatusHint('未聽到字——可試 EN，或用 ★')
          return
        }
        langIdx.current += 1
        setStatusHint(`改用 ${langsRef.current[langIdx.current]} 再試…`)
        setSttAlive(false)
        clearRec('abort')
        scheduleSttRestart(sid, 200)
      }, 4500)
    },
    [scheduleSttRestart],
  )

  const startStt = useCallback(
    (sid: number) => {
      const Ctor = getRecognitionCtor()
      if (!Ctor || !wantListen.current || sid !== sessionId.current) return
      if (startingStt.current || runningRef.current) return

      flushInterim()
      // Previous instance already ended — drop without abort storm
      clearRec('drop')
      startingStt.current = true

      const lang = langsRef.current[langIdx.current] ?? langsRef.current[0]
      setActiveLang(lang)
      setStatusHint(`連線中（${lang}）…`)

      const rec = new Ctor()
      rec.continuous = !isMobileUa()
      rec.interimResults = true
      rec.maxAlternatives = 1
      rec.lang = lang

      rec.onstart = () => {
        if (sid !== sessionId.current || !wantListen.current) return
        startingStt.current = false
        runningRef.current = true
        setSttAlive(true)
        setStatusHint('請大聲講…')
        setError(null)
        scheduleLangRotateIfSilent(sid)
      }

      rec.onspeechstart = () => {
        if (sid !== sessionId.current || !wantListen.current) return
        setHeardSpeech(true)
        setStatusHint('聽到聲，轉文字中…')
      }

      rec.onspeechend = () => {
        if (sid !== sessionId.current || !wantListen.current) return
        if (!gotResultRef.current) setStatusHint('處理緊…')
      }

      rec.onresult = (event) => {
        if (sid !== sessionId.current || !wantListen.current) return
        let finalChunk = ''
        let interimChunk = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = readTranscript(event.results[i])
          if (!piece) continue
          if (event.results[i].isFinal) finalChunk += piece
          else interimChunk += piece
        }
        // Android sometimes marks poorly — also accept any non-empty piece
        if (!finalChunk && !interimChunk) {
          for (let i = 0; i < event.results.length; i++) {
            const piece = readTranscript(event.results[i])
            if (!piece) continue
            if (event.results[i].isFinal) finalChunk += piece
            else interimChunk += piece
          }
        }
        if (finalChunk || interimChunk) {
          gotResultRef.current = true
          setHeardSpeech(true)
          setStatusHint('')
          setError(null)
          if (langRotateTimer.current) {
            window.clearTimeout(langRotateTimer.current)
            langRotateTimer.current = null
          }
        }
        if (finalChunk) {
          setTranscript((prev) => `${prev}${finalChunk}`.trim())
        }
        interimRef.current = interimChunk
        setInterim(interimChunk)
        setSttAlive(true)
      }

      rec.onerror = (event) => {
        if (sid !== sessionId.current) return
        startingStt.current = false
        runningRef.current = false
        const code = event.error
        if (code === 'aborted') return

        if (
          wantListen.current &&
          (code === 'language-not-supported' || code === 'network') &&
          langIdx.current < langsRef.current.length - 1
        ) {
          langIdx.current += 1
          setStatusHint(`改用 ${langsRef.current[langIdx.current]}…`)
          setSttAlive(false)
          scheduleSttRestart(sid, 300)
          return
        }

        const msg = errorMessage(code)
        if (msg) {
          // Soft: no-speech keeps listening via restart; show brief hint
          if (code === 'no-speech') setStatusHint(msg)
          else setError(msg)
        }
        setSttAlive(false)
        if (wantListen.current && (code === 'no-speech' || code === 'network')) {
          scheduleSttRestart(sid, 400)
        }
      }

      rec.onend = () => {
        if (sid !== sessionId.current) return
        startingStt.current = false
        runningRef.current = false
        setSttAlive(false)
        flushInterim()
        if (!wantListen.current) return
        scheduleSttRestart(sid, 250)
      }

      recRef.current = rec
      try {
        // Must stay inside user-gesture stack on first start
        rec.start()
      } catch (err) {
        startingStt.current = false
        runningRef.current = false
        setSttAlive(false)
        const name = err instanceof DOMException ? err.name : ''
        if (name === 'InvalidStateError') {
          scheduleSttRestart(sid, 400)
          return
        }
        setError('開唔到語音辨識。請用 Chrome，或最後撳 ★。')
        scheduleSttRestart(sid, 600)
      }

      // If onstart never fires, unstick and retry
      window.setTimeout(() => {
        if (sid !== sessionId.current || !wantListen.current) return
        if (startingStt.current) {
          startingStt.current = false
          setStatusHint('重試轉文字…')
          clearRec('abort')
          scheduleSttRestart(sid, 200)
        }
      }, 2500)
    },
    [flushInterim, scheduleLangRotateIfSilent, scheduleSttRestart],
  )

  useEffect(() => {
    startSttRef.current = startStt
  }, [startStt])

  /** Synchronous — call directly from click handlers. */
  const start = useCallback(
    (lang: ListenLang = 'zh-HK') => {
      const Ctor = getRecognitionCtor()
      if (!Ctor) {
        setError('呢部電話／瀏覽器暫唔支援語音轉文字。請爸爸媽媽聽完撳 ★。')
        return
      }

      sessionId.current += 1
      const sid = sessionId.current
      hardStopSession()
      wantListen.current = true
      gotResultRef.current = false

      setError(null)
      interimRef.current = ''
      setInterim('')
      setTranscript('')
      setElapsedSec(0)
      setSttAlive(false)
      setHeardSpeech(false)
      langsRef.current = langFallbacks(lang)
      langIdx.current = 0
      setActiveLang(langsRef.current[0])
      startedAt.current = Date.now()
      setListening(true)
      setStatusHint('啟動轉文字…')

      tickTimer.current = window.setInterval(() => {
        if (sid !== sessionId.current || !wantListen.current) return
        const sec = Math.floor((Date.now() - startedAt.current) / 1000)
        setElapsedSec(sec)
        if (sec >= 45) {
          sessionId.current += 1
          hardStopSession()
        }
      }, 250)

      // Immediate start — preserve user activation for mic + speech service
      startStt(sid)
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
    heardSpeech,
    activeLang,
    statusHint,
    start,
    stop,
    reset,
  }
}
