import { useCallback, useEffect, useRef, useState } from 'react'
import { isGoogleSttConfigured, recognizeWithGoogle } from '../lib/googleStt'
import { startPcmCapture, type PcmCaptureSession } from '../lib/pcmCapture'

export type ListenLang = 'yue-Hant-HK' | 'en-US'

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
type Engine = 'safari' | 'chrome' | 'google' | 'none'
type Mode = 'webspeech' | 'google'

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
  return ['yue-Hant-HK', 'yue-HK', 'zh-HK', 'zh-TW', 'zh-Hans', 'zh-CN']
}

/**
 * When Google STT is configured (VITE_GOOGLE_SPEECH_API_KEY / VITE_GOOGLE_STT_URL):
 * always use Google — ● records PCM, ■ sends to Google (yue-Hant-HK). Never fall
 * back to iPhone/Safari webkitSpeechRecognition.
 *
 * Otherwise → browser Web Speech (Safari/Chrome) started in the ● gesture.
 */
export function useSpeechRecognition() {
  const apple = typeof navigator !== 'undefined' && isAppleWebKit()
  const googleReady = isGoogleSttConfigured()

  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  const [sttAlive, setSttAlive] = useState(false)
  const [heardSpeech, setHeardSpeech] = useState(false)
  const [activeLang, setActiveLang] = useState('yue-Hant-HK')
  const [requestedLang, setRequestedLang] = useState('yue-Hant-HK')
  const [langConfirmed, setLangConfirmed] = useState(false)
  const [lastErrorCode, setLastErrorCode] = useState<string | null>(null)
  const [statusHint, setStatusHint] = useState('')
  const [engine, setEngine] = useState<Engine>('none')
  const [busy, setBusy] = useState(false)
  const [sttBlocked, setSttBlocked] = useState(false)

  const sessionId = useRef(0)
  const recRef = useRef<BrowserSpeechRecognition | null>(null)
  const wantListen = useRef(false)
  const runningRef = useRef(false)
  const sttEnabled = useRef(true)
  const micOkRef = useRef(false)
  const langIdx = useRef(0)
  const langsRef = useRef<string[]>(['yue-Hant-HK'])
  const tickTimer = useRef<number | null>(null)
  const restartTimer = useRef<number | null>(null)
  const restartCount = useRef(0)
  const startedAt = useRef(0)
  const interimRef = useRef('')
  const transcriptRef = useRef('')
  const appleRef = useRef(apple)
  const requestedLangRef = useRef('yue-Hant-HK')
  const modeRef = useRef<Mode>('webspeech')
  const listenLangRef = useRef<ListenLang>('yue-Hant-HK')
  const pcmSessionRef = useRef<PcmCaptureSession | null>(null)
  const abortRef = useRef<AbortController | null>(null)

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
      rec.stop()
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
    if (pcmSessionRef.current) {
      void pcmSessionRef.current.stop().catch(() => undefined)
      pcmSessionRef.current = null
    }
    abortRef.current?.abort()
    abortRef.current = null
    setListening(false)
    setSttAlive(false)
    setElapsedSec(0)
    setHeardSpeech(false)
    setBusy(false)
    setStatusHint('')
  }, [flushInterim, hardStopStt])

  const scheduleRestart = useCallback((sid: number) => {
    if (!wantListen.current || !sttEnabled.current) return
    const maxRestart = appleRef.current ? 25 : 30
    const delay = appleRef.current ? 700 : 400
    if (restartCount.current >= maxRestart) {
      setStatusHint('聽寫多次斷線——再撳 ●，或撳下面黃色 ★')
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
        window.setTimeout(() => {
          if (sid !== sessionId.current || !wantListen.current || !recRef.current) return
          try {
            recRef.current.start()
          } catch {
            setStatusHint('聽寫重開失敗——再撳 ●，或撳下面黃色 ★')
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
        const aliveLang = rec.lang || langsRef.current[langIdx.current]
        setActiveLang(aliveLang)
        setError(null)
        setLastErrorCode(null)
        setStatusHint(`聽寫已啟動（${aliveLang}）…請大聲講`)
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
          if (appleRef.current && (micOkRef.current || code === 'service-not-allowed')) {
            setError(null)
            if (restartCount.current < 4) {
              setStatusHint(`重試 iPhone 聽寫…（${restartCount.current + 1}）`)
              scheduleRestart(sid)
            } else {
              sttEnabled.current = false
              setLangConfirmed(false)
              setSttBlocked(true)
              setListening(false)
              wantListen.current = false
              clearTimers()
              setStatusHint(
                googleReady
                  ? 'Safari 網頁聽寫失敗。請設定 Google STT 後再試，或撳黃色 ★。'
                  : 'Safari 未能開網頁聽寫（私密瀏覽常見）。可改普通分頁，或設定 Google STT。',
              )
            }
            return
          }
          sttEnabled.current = false
          wantListen.current = false
          clearTimers()
          setListening(false)
          setSttBlocked(true)
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
          setStatusHint(`聽寫語言未就緒（${code}）。或撳下面黃色 ★。`)
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
    [flushInterim, googleReady, scheduleRestart],
  )

  useEffect(() => {
    // Google configured → always Google; skip iPhone built-in STT entirely.
    const preferGoogle = googleReady
    setSupported(preferGoogle || !!getRecognitionCtor() || canUseMic())
    if (preferGoogle) setEngine('google')
    else if (apple) setEngine('safari')
    else if (getRecognitionCtor()) setEngine('chrome')
    else setEngine('none')

    return () => {
      sessionId.current += 1
      wantListen.current = false
      clearTimers()
      hardStopStt(true)
      if (pcmSessionRef.current) {
        void pcmSessionRef.current.stop().catch(() => undefined)
        pcmSessionRef.current = null
      }
    }
  }, [apple, googleReady, hardStopStt])

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
    setSttBlocked(false)
    setBusy(false)
  }, [])

  const stop = useCallback(async () => {
    const sidAtStop = sessionId.current
    sessionId.current += 1

    if (modeRef.current === 'google') {
      wantListen.current = false
      clearTimers()
      setListening(false)
      setSttAlive(false)
      const session = pcmSessionRef.current
      pcmSessionRef.current = null
      if (!session) {
        setStatusHint('未錄到聲——請再撳 ●。')
        return
      }

      setBusy(true)
      setStatusHint('Google 轉文字中（廣東話）…')
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac

      try {
        const { pcm, sampleRate } = await session.stop()
        if (pcm.length < sampleRate * 0.25) {
          setBusy(false)
          setStatusHint('錄音太短——請再撳 ● 講長啲。')
          return
        }
        const result = await recognizeWithGoogle({
          pcm,
          sampleRate,
          language: listenLangRef.current,
          signal: ac.signal,
        })
        if (sidAtStop !== sessionId.current - 1 && sidAtStop !== sessionId.current) {
          // A newer session may have started; still accept if no newer listen.
        }
        setTranscript(result.transcript)
        transcriptRef.current = result.transcript
        setHeardSpeech(true)
        setLangConfirmed(true)
        setActiveLang(result.languageCode || (listenLangRef.current === 'en-US' ? 'en-US' : 'yue-Hant-HK'))
        setStatusHint('')
        setError(null)
        setSttBlocked(false)
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
        const msg = err instanceof Error ? err.message : 'Google 聽寫失敗'
        setError(msg)
        setStatusHint(`${msg} · 可再撳 ●，或用黃色 ★`)
        setSttBlocked(true)
      } finally {
        setBusy(false)
      }
      return
    }

    const hadText = !!(transcriptRef.current.trim() || interimRef.current.trim())
    hardStopSession()
    if (appleRef.current && !hadText && !sttBlocked) {
      setStatusHint('未出字。請再撳 ●；私密瀏覽請改普通分頁。或以黃色 ★ 為準。')
    }
  }, [hardStopSession, sttBlocked])

  const start = useCallback(
    (lang: ListenLang = 'yue-Hant-HK') => {
      listenLangRef.current = lang
      // Always Google when configured — never iPhone/Safari built-in STT.
      const preferGoogle = googleReady

      sessionId.current += 1
      const sid = sessionId.current
      hardStopSession()

      wantListen.current = true
      sttEnabled.current = true
      micOkRef.current = false
      restartCount.current = 0
      setError(null)
      setSttBlocked(false)
      setBusy(false)
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
      const firstLang = preferGoogle
        ? lang === 'en-US'
          ? 'en-US'
          : 'yue-Hant-HK'
        : langsRef.current[0]
      requestedLangRef.current = firstLang
      setRequestedLang(firstLang)
      setActiveLang(firstLang)
      setLangConfirmed(preferGoogle)
      setLastErrorCode(null)

      startedAt.current = Date.now()
      if (tickTimer.current) window.clearInterval(tickTimer.current)
      tickTimer.current = window.setInterval(() => {
        if (sid !== sessionId.current || !wantListen.current) return
        setElapsedSec(Math.floor((Date.now() - startedAt.current) / 1000))
        if (Math.floor((Date.now() - startedAt.current) / 1000) >= 45) {
          void stop()
        }
      }, 250)

      if (preferGoogle) {
        modeRef.current = 'google'
        setEngine('google')
        setStatusHint(
          lang === 'en-US' ? 'Google 英文錄音中…撳 ■ 轉文字' : 'Google 廣東話錄音中…撳 ■ 轉文字',
        )
        // Keep gesture chain: first await should be getUserMedia.
        void startPcmCapture()
          .then((session) => {
            if (sid !== sessionId.current || !wantListen.current) {
              void session.stop().catch(() => undefined)
              return
            }
            pcmSessionRef.current = session
            micOkRef.current = true
            setSttAlive(true)
            setLangConfirmed(true)
            setStatusHint(
              lang === 'en-US' ? 'Google 英文錄音中…請講，完咗撳 ■' : 'Google 廣東話錄音中…請講，完咗撳 ■',
            )
          })
          .catch((err) => {
            if (sid !== sessionId.current) return
            wantListen.current = false
            setListening(false)
            setSttAlive(false)
            setSttBlocked(true)
            setError(err instanceof Error ? err.message : '無法開麥克風')
            setStatusHint('無法開麥克風。撳網址列「aA」→ 網站設定 → 麥克風 → 允許。')
          })
        return true
      }

      modeRef.current = 'webspeech'
      const Ctor = getRecognitionCtor()
      if (!Ctor) {
        setSttBlocked(true)
        setListening(false)
        setError('呢部瀏覽器未支援網頁聽寫。請設定 Google STT（見 README），或撳黃色 ★。')
        return false
      }

      setEngine(appleRef.current ? 'safari' : 'chrome')
      const rec = new Ctor()
      recRef.current = rec
      rec.continuous = appleRef.current ? false : !isMobileUa()
      rec.interimResults = true
      rec.maxAlternatives = 1
      rec.lang = langsRef.current[0]
      attachHandlers(rec, sid)
      setStatusHint(appleRef.current ? '啟動瀏覽器聽寫…' : '啟動轉文字…')

      try {
        rec.start()
      } catch {
        try {
          rec.abort()
        } catch {
          /* ignore */
        }
        try {
          rec.start()
        } catch {
          scheduleRestart(sid)
        }
      }

      if (canUseMic()) {
        void navigator.mediaDevices
          .getUserMedia({ audio: true, video: false })
          .then((stream) => {
            stream.getTracks().forEach((t) => t.stop())
            if (sid !== sessionId.current) return
            micOkRef.current = true
          })
          .catch(() => {
            if (sid !== sessionId.current) return
            micOkRef.current = false
          })
      }

      return true
    },
    [attachHandlers, googleReady, hardStopSession, scheduleRestart, stop],
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
    sttBlocked,
    googleConfigured: googleReady,
    start,
    stop,
    reset,
  }
}
