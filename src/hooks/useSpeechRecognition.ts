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

function langFallbacks(lang: ListenLang, apple: boolean): string[] {
  if (lang === 'en-US') return ['en-US', 'en-GB', 'en-HK', 'en']
  if (apple) return ['yue-Hant-HK', 'yue-HK', 'zh-Hant-HK', 'zh-HK', 'zh-TW']
  return ['zh-HK', 'zh-TW', 'zh-Hans', 'zh-CN', 'yue-HK']
}

/**
 * Safari: STT-only. Do NOT fall back to MediaRecorder — that steals the mic and
 * leaves users stuck on「錄音中」with no words even when mic permission is Allow.
 * Keep listening=true until ■ so the UI does not flash. Restart STT slowly.
 *
 * Mic Allow ≠ webpage 聽寫 working. Keyboard「粵」≠ 聽寫「廣東話」.
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
  const [requestedLang, setRequestedLang] = useState('zh-HK')
  const [langConfirmed, setLangConfirmed] = useState(false)
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null)
  const [statusHint, setStatusHint] = useState('')
  const [engine, setEngine] = useState<'safari' | 'chrome' | 'none'>('none')
  const [busy] = useState(false)

  const sessionId = useRef(0)
  const recRef = useRef<BrowserSpeechRecognition | null>(null)
  const wantListen = useRef(false)
  const runningRef = useRef(false)
  const sttEnabled = useRef(true)
  const micOkRef = useRef(false)
  const langIdx = useRef(0)
  const langsRef = useRef<string[]>(['zh-HK'])
  const tickTimer = useRef<number | null>(null)
  const restartTimer = useRef<number | null>(null)
  const restartCount = useRef(0)
  const startedAt = useRef(0)
  const interimRef = useRef('')
  const transcriptRef = useRef('')
  const appleRef = useRef(apple)
  const sidRef = useRef(0)
  const requestedLangRef = useRef('zh-HK')

  appleRef.current = apple
  requestedLangRef.current = requestedLang

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

  const hardStopStt = useCallback((finalStop: boolean) => {
    const rec = recRef.current
    if (!rec) return
    rec.onstart = null
    rec.onresult = null
    rec.onerror = null
    rec.onend = null
    try {
      if (finalStop && appleRef.current) {
        try {
          rec.start()
        } catch {
          /* already started */
        }
      }
      if (finalStop) rec.stop()
      else rec.stop()
    } catch {
      try {
        rec.abort()
      } catch {
        /* ignore */
      }
    }
    if (finalStop) recRef.current = null
    runningRef.current = false
  }, [])

  const hardStopSession = useCallback(() => {
    wantListen.current = false
    sttEnabled.current = false
    clearTimers()
    flushInterim()
    hardStopStt(true)
    setListening(false)
    setSttAlive(false)
    setElapsedSec(0)
    setHeardSpeech(false)
    setStatusHint('')
  }, [flushInterim, hardStopStt])

  const scheduleRestart = useCallback((sid: number) => {
    if (!wantListen.current || !sttEnabled.current) return
    const maxRestart = appleRef.current ? 25 : 30
    const delay = appleRef.current ? 700 : 400
    if (restartCount.current >= maxRestart) {
      setStatusHint('聽寫多次斷線——再撳 ●，或撳綠色「★ 聽完就得」')
      return
    }
    restartCount.current += 1
    setStatusHint(appleRef.current ? `重連廣東話聽寫…（${restartCount.current}）` : '重連轉文字…')
    if (restartTimer.current) window.clearTimeout(restartTimer.current)
    restartTimer.current = window.setTimeout(() => {
      if (sid !== sessionId.current || !wantListen.current || !sttEnabled.current) return
      const rec = recRef.current
      if (!rec) return
      try {
        rec.start()
      } catch {
        // InvalidState — try once more shortly
        window.setTimeout(() => {
          if (sid !== sessionId.current || !wantListen.current || !recRef.current) return
          try {
            recRef.current.start()
          } catch {
            setStatusHint('聽寫重開失敗——再撳 ●，或撳綠色「★ 聽完就得」')
          }
        }, 500)
      }
    }, delay)
  }, [])

  const attachHandlers = useCallback(
    (rec: BrowserSpeechRecognition, sid: number) => {
      rec.onstart = () => {
        if (sid !== sessionId.current || !wantListen.current) return
        runningRef.current = true
        setSttAlive(true)
        setLangConfirmed(true)
        // Read back whatever the engine accepted (may differ from request on Safari)
        const aliveLang = rec.lang || langsRef.current[langIdx.current]
        setActiveLang(aliveLang)
        setError(null)
        setLastErrorCode(null)
        setStatusHint(
          appleRef.current
            ? `聽寫已啟動（引擎語言 ${aliveLang}）…請大聲講`
            : `聽寫已啟動（${aliveLang}）…請大聲講`,
        )
      }

      rec.onresult = (event) => {
        if (sid !== sessionId.current || !wantListen.current) return
        let finalChunk = ''
        let interimChunk = ''
        for (let i = 0; i < event.results.length; i++) {
          const piece = event.results[i]?.[0]?.transcript?.trim() ?? ''
          if (!piece) continue
          if (event.results[i].isFinal) finalChunk += piece
          else interimChunk += piece
        }
        if (!finalChunk && !interimChunk && event.results.length > 0) {
          const last = event.results[event.results.length - 1]
          const piece = last?.[0]?.transcript?.trim() ?? ''
          if (piece) {
            if (last.isFinal) finalChunk = piece
            else interimChunk = piece
          }
        }
        if (finalChunk || interimChunk) {
          setHeardSpeech(true)
          setStatusHint('')
          setError(null)
        }
        if (finalChunk) {
          setTranscript((prev) => {
            const next = `${prev}${finalChunk}`.trim()
            transcriptRef.current = next
            return next
          })
          interimRef.current = interimChunk
          setInterim(interimChunk)
        } else {
          interimRef.current = interimChunk
          setInterim(interimChunk)
        }
        setSttAlive(true)
      }

      rec.onerror = (event) => {
        if (sid !== sessionId.current) return
        runningRef.current = false
        setSttAlive(false)
        const code = event.error
        if (code === 'aborted') return
        setLastErrorCode(code)

        if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') {
          // Mic can be Allow while webpage Speech Recognition still fails
          if (micOkRef.current && appleRef.current) {
            setError(null)
            setStatusHint(
              `麥克風已開，但網頁聽寫未接通（${code}）。要求語言 ${requestedLangRef.current} 未確認啟動。Safari 私密瀏覽常會封鎖網頁聽寫；可改用普通分頁，或撳綠色「★ 聽完就得」。`,
            )
            if (restartCount.current < 6) {
              scheduleRestart(sid)
            } else {
              sttEnabled.current = false
              setLangConfirmed(false)
              setStatusHint(
                `網頁聽寫未能啟動（${code}）——「${requestedLangRef.current}」只係要求語言，引擎未真正開。Safari 私密瀏覽下常見，請改普通分頁，或撳綠色「★ 聽完就得」。`,
              )
            }
            return
          }
          sttEnabled.current = false
          wantListen.current = false
          clearTimers()
          setListening(false)
          setError('麥克風未允許。撳網址列「aA」→ 網站設定 → 麥克風 → 允許。')
          return
        }

        if (code === 'no-speech') {
          setStatusHint('聽唔到聲——請繼續講…')
          scheduleRestart(sid)
          return
        }

        if (code === 'language-not-supported' || code === 'network') {
          if (langIdx.current < langsRef.current.length - 1) {
            langIdx.current += 1
            rec.lang = langsRef.current[langIdx.current]
            setRequestedLang(rec.lang)
            setActiveLang(rec.lang)
            setLangConfirmed(false)
            setStatusHint(`上一語言唔得（${code}），改要求 ${rec.lang}…`)
            scheduleRestart(sid)
            return
          }
          setStatusHint(
            appleRef.current
              ? `聽寫語言未就緒（${code}）。設定→一般→鍵盤→聽寫→下載「廣東話」。或撳綠色「★ 聽完就得」。`
              : `轉文字唔穩（${code}）——可試 EN，或撳綠色「★ 聽完就得」。`,
          )
          scheduleRestart(sid)
        }
      }

      rec.onend = () => {
        if (sid !== sessionId.current) return
        runningRef.current = false
        setSttAlive(false)
        flushInterim()
        if (!wantListen.current || !sttEnabled.current) return
        scheduleRestart(sid)
      }
    },
    [flushInterim, scheduleRestart],
  )

  useEffect(() => {
    setSupported(!!getRecognitionCtor() || canUseMic())
    setEngine(isAppleWebKit() ? 'safari' : getRecognitionCtor() ? 'chrome' : 'none')
    return () => {
      sessionId.current += 1
      wantListen.current = false
      clearTimers()
      hardStopStt(true)
    }
  }, [hardStopStt])

  const reset = useCallback(() => {
    setTranscript('')
    transcriptRef.current = ''
    interimRef.current = ''
    setInterim('')
    setError(null)
    setElapsedSec(0)
    setHeardSpeech(false)
    setStatusHint('')
    setLangConfirmed(false)
    setLastErrorCode(null)
  }, [])

  const stop = useCallback(() => {
    sessionId.current += 1
    const hadText = !!(transcriptRef.current.trim() || interimRef.current.trim())
    hardStopSession()
    if (appleRef.current && !hadText) {
      setStatusHint(
        micOkRef.current
          ? '未出字。麥克風已允許——請檢查 設定→一般→鍵盤→聽寫→「廣東話」。或撳綠色「★ 聽完就得」。'
          : '未出字。請允許麥克風，並下載聽寫「廣東話」。或撳綠色「★ 聽完就得」。',
      )
    }
  }, [hardStopSession])

  const start = useCallback(
    (lang: ListenLang = 'zh-HK') => {
      const Ctor = getRecognitionCtor()
      if (!Ctor) {
        setError('呢部瀏覽器未支援網頁聽寫。請爸爸媽媽聽完，撳綠色「★ 聽完就得」。')
        return
      }

      sessionId.current += 1
      const sid = sessionId.current
      sidRef.current = sid
      hardStopSession()

      wantListen.current = true
      sttEnabled.current = true
      micOkRef.current = false
      restartCount.current = 0
      setError(null)
      setTranscript('')
      transcriptRef.current = ''
      interimRef.current = ''
      setInterim('')
      setElapsedSec(0)
      setSttAlive(false)
      setHeardSpeech(false)
      setListening(true)
      langsRef.current = langFallbacks(lang, appleRef.current)
      langIdx.current = 0
      const firstLang = langsRef.current[0]
      requestedLangRef.current = firstLang
      setRequestedLang(firstLang)
      setActiveLang(firstLang)
      setLangConfirmed(false)
      setLastErrorCode(null)

      startedAt.current = Date.now()
      if (tickTimer.current) window.clearInterval(tickTimer.current)
      tickTimer.current = window.setInterval(() => {
        if (sid !== sessionId.current || !wantListen.current) return
        setElapsedSec(Math.floor((Date.now() - startedAt.current) / 1000))
        if (Math.floor((Date.now() - startedAt.current) / 1000) >= 45) {
          sessionId.current += 1
          hardStopSession()
        }
      }, 250)

      const rec = new Ctor()
      recRef.current = rec
      rec.continuous = appleRef.current ? false : !isMobileUa()
      rec.interimResults = true
      rec.maxAlternatives = 1
      rec.lang = langsRef.current[0]
      attachHandlers(rec, sid)

      setStatusHint(
        appleRef.current
          ? lang === 'en-US'
            ? '啟動英文聽寫…'
            : '啟動廣東話聽寫…'
          : '啟動轉文字…',
      )

      const beginStt = () => {
        if (sid !== sessionId.current || !wantListen.current) return
        try {
          rec.start()
        } catch {
          scheduleRestart(sid)
        }
      }

      if (appleRef.current && canUseMic()) {
        setStatusHint('確認麥克風…')
        void navigator.mediaDevices
          .getUserMedia({ audio: true, video: false })
          .then((stream) => {
            stream.getTracks().forEach((t) => t.stop())
            micOkRef.current = true
            setError(null)
            setStatusHint('啟動廣東話聽寫…')
            beginStt()
          })
          .catch(() => {
            micOkRef.current = false
            wantListen.current = false
            setListening(false)
            setError('麥克風未允許。你張相已顯示網站可設為允許——請再撳 ●。')
          })
        return
      }

      beginStt()
    },
    [attachHandlers, hardStopSession, scheduleRestart],
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
    requestedLang,
    langConfirmed,
    lastErrorCode,
    statusHint,
    engine,
    busy,
    start,
    stop,
    reset,
  }
}
