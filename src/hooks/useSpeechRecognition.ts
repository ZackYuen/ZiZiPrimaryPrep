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

function isMobileUa(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

function langFallbacks(lang: ListenLang): string[] {
  if (lang === 'en-US') return ['en-US', 'en-GB', 'en-HK', 'en']
  // zh-TW / zh-CN often work when zh-HK / yue fail on phones
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
      return '轉文字需要網絡（建議 Chrome）。可繼續講，最後撳 ★。'
    case 'language-not-supported':
      return '呢個語言轉文字唔支援——可試 EN，或最後撳 ★。'
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

/**
 * Keep the listen UI/timer in React state.
 * SpeechRecognition must own the mic alone — holding getUserMedia/MediaRecorder
 * in parallel blocks transcripts (timer runs, no words).
 */
export function useSpeechRecognition() {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [sttAlive, setSttAlive] = useState(false)
  const [activeLang, setActiveLang] = useState('zh-HK')

  const sessionId = useRef(0)
  const recRef = useRef<BrowserSpeechRecognition | null>(null)
  const wantListen = useRef(false)
  const langIdx = useRef(0)
  const langsRef = useRef<string[]>(['zh-HK'])
  const tickTimer = useRef<number | null>(null)
  const sttRestartTimer = useRef<number | null>(null)
  const startedAt = useRef(0)
  const startingStt = useRef(false)
  const interimRef = useRef('')
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
  }

  const flushInterim = useCallback(() => {
    const chunk = interimRef.current.trim()
    interimRef.current = ''
    setInterim('')
    if (!chunk) return
    setTranscript((prev) => `${prev}${chunk}`.trim())
  }, [])

  const hardStopStt = (preferStop = false) => {
    const rec = recRef.current
    detach(rec)
    try {
      if (preferStop) rec?.stop()
      else rec?.abort()
    } catch {
      try {
        rec?.abort()
      } catch {
        /* ignore */
      }
    }
    recRef.current = null
    startingStt.current = false
    setSttAlive(false)
  }

  const hardStopSession = useCallback(() => {
    wantListen.current = false
    clearTimers()
    flushInterim()
    hardStopStt(true)
    setListening(false)
    setElapsedSec(0)
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

  const startStt = useCallback(
    (sid: number) => {
      const Ctor = getRecognitionCtor()
      if (!Ctor || !wantListen.current || sid !== sessionId.current) return
      if (startingStt.current) return

      // Restart: keep transcript; fold any dangling interim into it
      flushInterim()
      hardStopStt(false)
      startingStt.current = true

      const lang = langsRef.current[langIdx.current] ?? langsRef.current[0]
      setActiveLang(lang)

      const rec = new Ctor()
      // Mobile Chrome often ignores continuous and ends after a pause — we restart.
      rec.continuous = !isMobileUa()
      rec.interimResults = true
      rec.maxAlternatives = 1
      rec.lang = lang

      rec.onstart = () => {
        if (sid !== sessionId.current || !wantListen.current) return
        startingStt.current = false
        setSttAlive(true)
      }

      rec.onresult = (event) => {
        if (sid !== sessionId.current || !wantListen.current) return
        let finalChunk = ''
        let interimChunk = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i]?.[0]?.transcript ?? ''
          if (event.results[i].isFinal) finalChunk += piece
          else interimChunk += piece
        }
        if (finalChunk.trim()) {
          setTranscript((prev) => `${prev}${finalChunk}`.trim())
        }
        interimRef.current = interimChunk.trim()
        setInterim(interimChunk.trim())
        setSttAlive(true)
        setError(null)
      }

      rec.onerror = (event) => {
        if (sid !== sessionId.current) return
        startingStt.current = false
        const code = event.error
        if (code === 'aborted') return

        if (
          wantListen.current &&
          (code === 'language-not-supported' || code === 'network') &&
          langIdx.current < langsRef.current.length - 1
        ) {
          langIdx.current += 1
          setSttAlive(false)
          scheduleSttRestart(sid, 350)
          return
        }

        const msg = errorMessage(code)
        if (msg) setError(msg)
        setSttAlive(false)
        if (wantListen.current && (code === 'no-speech' || code === 'network')) {
          scheduleSttRestart(sid, 450)
        }
      }

      rec.onend = () => {
        if (sid !== sessionId.current) return
        startingStt.current = false
        setSttAlive(false)
        // Phones often end without marking the last chunk final
        flushInterim()
        if (!wantListen.current) return
        scheduleSttRestart(sid, 280)
      }

      recRef.current = rec
      try {
        rec.start()
      } catch {
        startingStt.current = false
        setSttAlive(false)
        scheduleSttRestart(sid, 500)
      }
    },
    [flushInterim, scheduleSttRestart],
  )

  useEffect(() => {
    startSttRef.current = startStt
  }, [startStt])

  const start = useCallback(
    async (lang: ListenLang = 'zh-HK') => {
      const Ctor = getRecognitionCtor()
      if (!Ctor) {
        setError('呢部電話／瀏覽器暫唔支援語音轉文字。請爸爸媽媽聽完撳 ★。')
        return
      }

      sessionId.current += 1
      const sid = sessionId.current
      hardStopSession()
      wantListen.current = true

      setError(null)
      interimRef.current = ''
      setInterim('')
      setTranscript('')
      setElapsedSec(0)
      setSttAlive(false)
      langsRef.current = langFallbacks(lang)
      langIdx.current = 0
      setActiveLang(langsRef.current[0])
      startedAt.current = Date.now()
      setListening(true)

      // Warm permission, then RELEASE tracks so SpeechRecognition can open the mic alone
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          stream.getTracks().forEach((t) => t.stop())
        } catch {
          wantListen.current = false
          setListening(false)
          setError(errorMessage('not-allowed'))
          return
        }
      }

      if (sid !== sessionId.current || !wantListen.current) return

      tickTimer.current = window.setInterval(() => {
        if (sid !== sessionId.current || !wantListen.current) return
        const sec = Math.floor((Date.now() - startedAt.current) / 1000)
        setElapsedSec(sec)
        if (sec >= 45) {
          sessionId.current += 1
          hardStopSession()
        }
      }, 250)

      // Brief pause after releasing getUserMedia so the OS mic is free
      window.setTimeout(() => {
        if (sid !== sessionId.current || !wantListen.current) return
        startStt(sid)
      }, 450)
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
    activeLang,
    start,
    stop,
    reset,
  }
}
