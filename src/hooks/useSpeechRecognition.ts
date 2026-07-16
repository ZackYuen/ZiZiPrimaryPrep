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

function langFallbacks(lang: ListenLang, apple: boolean): string[] {
  if (lang === 'en-US') return ['en-US', 'en-GB', 'en-HK', 'en']
  // Apple 聽寫: zh-HK is the Cantonese / Hong Kong path when 廣東話 is installed
  if (apple) return ['zh-HK', 'yue-HK', 'zh-TW', 'zh-CN']
  return ['zh-HK', 'zh-TW', 'zh-Hans', 'zh-CN', 'yue-HK']
}

/**
 * Chrome: Google Web Speech (live words).
 * Safari/iPhone: Apple 聽寫 only — real Cantonese when「廣東話」is downloaded.
 *   - ONE recognition session, NO restart loops (those crashed Safari)
 *   - No on-device Whisper on iPhone (Mandarin-biased tiny / OOM heavy Yue model)
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
  const [busy] = useState(false)

  const sessionId = useRef(0)
  const recRef = useRef<BrowserSpeechRecognition | null>(null)
  const wantListen = useRef(false)
  const runningRef = useRef(false)
  const langIdx = useRef(0)
  const langsRef = useRef<string[]>(['zh-HK'])
  const tickTimer = useRef<number | null>(null)
  const restartTimer = useRef<number | null>(null)
  const restartCount = useRef(0)
  const startedAt = useRef(0)
  const interimRef = useRef('')
  const transcriptRef = useRef('')
  const appleRef = useRef(apple)
  const gotResultRef = useRef(false)

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

  const stopRecognition = useCallback(() => {
    const rec = recRef.current
    if (!rec) return
    rec.onstart = null
    rec.onresult = null
    rec.onerror = null
    rec.onend = null
    try {
      // Safari: start-then-stop once so the orange mic actually ends
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
    recRef.current = null
    runningRef.current = false
  }, [])

  const hardStopSession = useCallback(() => {
    wantListen.current = false
    clearTimers()
    flushInterim()
    stopRecognition()
    setListening(false)
    setSttAlive(false)
    setElapsedSec(0)
    setHeardSpeech(false)
    setStatusHint('')
  }, [flushInterim, stopRecognition])

  useEffect(() => {
    const hasStt = !!getRecognitionCtor()
    setSupported(hasStt)
    setEngine(isAppleWebKit() ? 'safari' : hasStt ? 'chrome' : 'none')
    return () => {
      sessionId.current += 1
      wantListen.current = false
      clearTimers()
      stopRecognition()
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
    gotResultRef.current = false
  }, [])

  const stop = useCallback(() => {
    sessionId.current += 1
    const hadText = !!(transcriptRef.current.trim() || interimRef.current.trim())
    hardStopSession()
    if (appleRef.current && !hadText) {
      setStatusHint(
        '未轉到字。請去 設定 → 一般 → 鍵盤 → 聽寫 → 打開，並下載「廣東話」，再撳 ●。或以 ★ 為準。',
      )
    }
  }, [hardStopSession])

  const startTick = (sid: number, maxSec: number) => {
    startedAt.current = Date.now()
    if (tickTimer.current) window.clearInterval(tickTimer.current)
    tickTimer.current = window.setInterval(() => {
      if (sid !== sessionId.current || !wantListen.current) return
      const sec = Math.floor((Date.now() - startedAt.current) / 1000)
      setElapsedSec(sec)
      if (sec >= maxSec) {
        sessionId.current += 1
        const hadText = !!(transcriptRef.current.trim() || interimRef.current.trim())
        hardStopSession()
        if (appleRef.current && !hadText) {
          setStatusHint(
            '未轉到字。請去 設定 → 一般 → 鍵盤 → 聽寫 → 下載「廣東話」，再試。或以 ★ 為準。',
          )
        }
      }
    }, 250)
  }

  const start = useCallback(
    (lang: ListenLang = 'zh-HK') => {
      const Ctor = getRecognitionCtor()
      if (!Ctor) {
        setError(
          appleRef.current
            ? '呢部 Safari 未支援網頁聽寫。請更新 iOS，或去設定打開「聽寫」。仍可用 ★。'
            : '呢部瀏覽器暫唔支援語音轉文字。請爸爸媽媽聽完撳 ★。',
        )
        return
      }

      sessionId.current += 1
      const sid = sessionId.current
      hardStopSession()

      wantListen.current = true
      gotResultRef.current = false
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
      restartCount.current = 0
      setActiveLang(langsRef.current[0])

      if (appleRef.current) {
        setStatusHint(
          lang === 'en-US'
            ? 'Safari 聽寫中…請講英文'
            : 'Safari 廣東話聽寫中…（要已下載「廣東話」聽寫）',
        )
      } else {
        setStatusHint('啟動轉文字…')
      }

      const rec = new Ctor()
      recRef.current = rec
      // Safari: keep one continuous session until ■ — do NOT auto-restart on end
      rec.continuous = appleRef.current ? true : !isMobileUa()
      rec.interimResults = true
      rec.maxAlternatives = 1
      rec.lang = langsRef.current[0]

      rec.onstart = () => {
        if (sid !== sessionId.current || !wantListen.current) return
        runningRef.current = true
        setSttAlive(true)
        setError(null)
        setStatusHint(appleRef.current ? '聽到你講會出字…請大聲講' : '請大聲講…')
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
        if (finalChunk || interimChunk) {
          gotResultRef.current = true
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
          // Keep showing latest interim after finals on Safari
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

        if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') {
          wantListen.current = false
          clearTimers()
          setListening(false)
          setError(
            appleRef.current
              ? '麥克風或聽寫未允許。撳網址列「aA」→ 網站設定 → 麥克風 → 允許。並打開：設定 → 一般 → 鍵盤 → 聽寫（下載廣東話）。'
              : '需要開咪高峰。去瀏覽器設定允許麥克風，再撳 ●。',
          )
          return
        }

        if (
          !appleRef.current &&
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

        if (code === 'language-not-supported' || code === 'network') {
          setStatusHint(
            appleRef.current
              ? '聽寫語言未就緒——設定 → 鍵盤 → 聽寫 → 下載「廣東話」，或改撳 EN 試。'
              : '轉文字連線唔穩——可試 EN，或用 ★。',
          )
          return
        }

        if (code === 'no-speech') {
          setStatusHint('聽唔到聲——請靠近咪高峰大聲講。')
        }
      }

      rec.onend = () => {
        if (sid !== sessionId.current) return
        runningRef.current = false
        setSttAlive(false)
        flushInterim()

        // Apple: NEVER auto-restart (crash loops). Chrome mobile: limited restart.
        if (!wantListen.current || appleRef.current) return
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

      startTick(sid, appleRef.current ? 40 : 45)

      try {
        rec.start()
      } catch {
        wantListen.current = false
        setListening(false)
        setError(
          appleRef.current
            ? '開唔到聽寫。請允許麥克風，並下載「廣東話」聽寫後再試。'
            : '開唔到語音辨識。請再用 Chrome，或撳 ★。',
        )
      }
    },
    [flushInterim, hardStopSession],
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
