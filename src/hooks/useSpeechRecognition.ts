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
  // iOS Chrome/Firefox use WebKit but are not Safari — still need Apple STT path
  const isIOS = /iPhone|iPad|iPod/i.test(ua)
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)
  const isAppleVendor = typeof navigator.vendor === 'string' && navigator.vendor.includes('Apple')
  return isIOS || isSafari || isAppleVendor
}

function isMobileUa(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

function langFallbacks(lang: ListenLang, apple: boolean): string[] {
  if (lang === 'en-US') return ['en-US', 'en-GB', 'en-HK', 'en']
  // Safari/Apple on-device: fewer exotic tags; zh-CN / zh-TW often installed via 聽寫
  if (apple) return ['zh-HK', 'zh-TW', 'zh-CN', 'yue-HK', 'en-HK', 'en-US']
  return ['zh-HK', 'yue-Hant-HK', 'zh-TW', 'zh-Hant', 'zh-Hans', 'cmn-Hans-CN', 'zh-CN']
}

function errorMessage(code: string, apple: boolean): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return '需要開咪高峰。去設定允許麥克風，再撳 ●。'
    case 'audio-capture':
      return '搵唔到麥克風。請檢查電話咪高峰。'
    case 'network':
      return apple
        ? '聽寫未就緒。去 設定 → 一般 → 鍵盤 → 聽寫，打開並下載中文／廣東話。'
        : '轉文字要連網（建議 Chrome）。可試 EN，或最後撳 ★。'
    case 'language-not-supported':
      return apple
        ? '呢個語言未下載。去 設定 → 鍵盤 → 聽寫 下載「廣東話」或「中文」，或撳 EN。'
        : '呢個語言轉文字唔支援——可試 EN，或最後撳 ★。'
    case 'no-speech':
      return '聽唔到聲——請靠近咪高峰大聲講。'
    default:
      return code ? `轉文字問題：${code}` : ''
  }
}

function readPiece(result: SpeechRecognitionEventLike['results'][number]): string {
  return (result[0]?.transcript ?? '').trim()
}

/**
 * Safari/iOS: reuse ONE SpeechRecognition instance (no abort storms).
 * Chrome: can recreate; must start inside user-gesture stack.
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
  const wantListen = useRef(false)
  const runningRef = useRef(false)
  const langIdx = useRef(0)
  const langsRef = useRef<string[]>(['zh-HK'])
  const tickTimer = useRef<number | null>(null)
  const restartTimer = useRef<number | null>(null)
  const langRotateTimer = useRef<number | null>(null)
  const startedAt = useRef(0)
  const interimRef = useRef('')
  const gotResultRef = useRef(false)
  const handlersBound = useRef(false)
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

  /** Safari: start()+stop() so the orange mic actually ends. */
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
        if (!wantListen.current) return
        runningRef.current = true
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
        if (!wantListen.current) return
        let finalChunk = ''
        let interimChunk = ''

        // Prefer resultIndex… but Safari sometimes only fills earlier slots
        for (let i = 0; i < event.results.length; i++) {
          const piece = readPiece(event.results[i])
          if (!piece) continue
          if (event.results[i].isFinal) finalChunk += piece
          else interimChunk += piece
        }

        // Safari/Apple often never marks isFinal for some langs — treat latest interim as live text
        if (!finalChunk && !interimChunk && event.results.length > 0) {
          const last = event.results[event.results.length - 1]
          const piece = readPiece(last)
          if (piece) {
            if (last.isFinal) finalChunk = piece
            else interimChunk = piece
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
            if (!wantListen.current) return
            try {
              rec.start()
            } catch {
              /* ignore */
            }
          }, 350)
          return
        }

        const msg = errorMessage(code, appleRef.current)
        if (code === 'no-speech') setStatusHint(msg)
        else if (msg) setError(msg)

        // Soft retry for no-speech while parent still wants listen
        if (wantListen.current && code === 'no-speech') {
          if (restartTimer.current) window.clearTimeout(restartTimer.current)
          restartTimer.current = window.setTimeout(() => {
            if (!wantListen.current) return
            try {
              rec.start()
            } catch {
              /* ignore */
            }
          }, 400)
        }
      }

      rec.onend = () => {
        runningRef.current = false
        setSttAlive(false)
        flushInterim()
        if (!wantListen.current) return

        // Reuse SAME instance — critical for Safari (no beep storm / no lost results)
        if (restartTimer.current) window.clearTimeout(restartTimer.current)
        restartTimer.current = window.setTimeout(() => {
          if (!wantListen.current || !recRef.current || runningRef.current) return
          try {
            recRef.current.start()
          } catch {
            restartTimer.current = window.setTimeout(() => {
              if (!wantListen.current || !recRef.current || runningRef.current) return
              try {
                recRef.current.start()
              } catch {
                setStatusHint('請再撳 ● 試一次')
              }
            }, 500)
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
    clearTimers()
    flushInterim()
    stopRecSafely(recRef.current)
    runningRef.current = false
    setListening(false)
    setSttAlive(false)
    setElapsedSec(0)
    setHeardSpeech(false)
    setStatusHint('')
  }, [flushInterim, stopRecSafely])

  useEffect(() => {
    const ctor = getRecognitionCtor()
    setSupported(!!ctor)
    setEngine(ctor ? (isAppleSafari() ? 'safari' : 'chrome') : 'none')
    return () => {
      sessionId.current += 1
      wantListen.current = false
      clearTimers()
      const rec = recRef.current
      if (rec) {
        rec.onstart = null
        rec.onresult = null
        rec.onerror = null
        rec.onend = null
        rec.onspeechstart = null
        rec.onspeechend = null
        try {
          rec.abort()
        } catch {
          /* ignore */
        }
      }
      recRef.current = null
      handlersBound.current = false
    }
  }, [])

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

  /** Must be called synchronously from a click/touch handler. */
  const start = useCallback(
    (lang: ListenLang = 'zh-HK') => {
      const rec = ensureRec()
      if (!rec) {
        setError(
          appleRef.current
            ? '呢部 Safari 暫唔支援網頁聽寫。請更新 iOS，或去設定打開「聽寫」。仍可用 ★。'
            : '呢部瀏覽器暫唔支援語音轉文字。請爸爸媽媽聽完撳 ★。',
        )
        return
      }

      sessionId.current += 1
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
      langsRef.current = langFallbacks(lang, appleRef.current)
      langIdx.current = 0
      setActiveLang(langsRef.current[0])
      startedAt.current = Date.now()
      setListening(true)
      setStatusHint(appleRef.current ? '啟動 Safari 聽寫…' : '啟動轉文字…')

      rec.continuous = appleRef.current ? true : !isMobileUa()
      rec.interimResults = true
      rec.maxAlternatives = 1
      rec.lang = langsRef.current[0]

      tickTimer.current = window.setInterval(() => {
        if (!wantListen.current) return
        const sec = Math.floor((Date.now() - startedAt.current) / 1000)
        setElapsedSec(sec)
        if (sec >= 45) {
          sessionId.current += 1
          hardStopSession()
        }
      }, 250)

      // If silent too long on non-Apple, try next lang (Apple: avoid abort; only hint)
      if (langRotateTimer.current) window.clearTimeout(langRotateTimer.current)
      langRotateTimer.current = window.setTimeout(() => {
        if (!wantListen.current || gotResultRef.current) return
        if (appleRef.current) {
          setStatusHint('未出字？去 設定→鍵盤→聽寫 下載廣東話／中文，或試 EN')
          return
        }
        if (langIdx.current >= langsRef.current.length - 1) {
          setStatusHint('未聽到字——可試 EN，或用 ★')
          return
        }
        langIdx.current += 1
        const next = langsRef.current[langIdx.current]
        setActiveLang(next)
        setStatusHint(`改用 ${next}…`)
        if (recRef.current) recRef.current.lang = next
        stopRecSafely(recRef.current)
        // onend will restart with new lang
      }, appleRef.current ? 8000 : 4500)

      try {
        rec.start()
      } catch {
        // InvalidStateError: already started — stop then start
        try {
          stopRecSafely(rec)
        } catch {
          /* ignore */
        }
        window.setTimeout(() => {
          if (!wantListen.current || !recRef.current) return
          try {
            recRef.current.start()
          } catch {
            setError('開唔到聽寫。請再撳 ●，或用 ★。')
          }
        }, 300)
      }
    },
    [ensureRec, hardStopSession, stopRecSafely],
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
