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
  if (apple) return ['zh-HK', 'yue-HK', 'zh-TW']
  return ['zh-HK', 'zh-TW', 'zh-Hans', 'zh-CN', 'yue-HK']
}

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  return ['audio/mp4', 'audio/aac', 'audio/webm;codecs=opus', 'audio/webm'].find((t) =>
    MediaRecorder.isTypeSupported(t),
  )
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
 * Chrome: live Web Speech with mobile restart.
 * Safari: MediaRecorder owns the ●/■ session (stops “flash”), while Apple
 * SpeechRecognition runs best-effort for Cantonese words with SLOW capped
 * restarts (fast restart loops crashed iOS before).
 *
 * Note: 鍵盤「粵」≠ 聽寫「廣東話」. Keyboard dictation in Notes can work
 * while webpage Web Speech still needs Dictation + language pack.
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
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const wantListen = useRef(false)
  const runningRef = useRef(false)
  const sttEnabled = useRef(true)
  const langIdx = useRef(0)
  const langsRef = useRef<string[]>(['zh-HK'])
  const tickTimer = useRef<number | null>(null)
  const restartTimer = useRef<number | null>(null)
  const restartCount = useRef(0)
  const startedAt = useRef(0)
  const interimRef = useRef('')
  const transcriptRef = useRef('')
  const appleRef = useRef(apple)
  const handlersBound = useRef(false)
  const modeRef = useRef<'none' | 'stt' | 'recorder'>('none')

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
        recorderRef.current.stop()
      }
    } catch {
      /* ignore */
    }
    recorderRef.current = null
    stopTracks(streamRef.current)
    streamRef.current = null
  }

  const detachRec = (rec: BrowserSpeechRecognition | null) => {
    if (!rec) return
    rec.onstart = null
    rec.onresult = null
    rec.onerror = null
    rec.onend = null
  }

  const stopRecognition = useCallback((finalStop = false) => {
    const rec = recRef.current
    if (!rec) return
    if (finalStop) {
      detachRec(rec)
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
      recRef.current = null
      handlersBound.current = false
    } else {
      // Soft pause between restarts — do not abort (abort storms crashed Safari)
      try {
        rec.stop()
      } catch {
        /* ignore */
      }
    }
    runningRef.current = false
  }, [])

  const hardStopSession = useCallback(() => {
    wantListen.current = false
    sttEnabled.current = false
    modeRef.current = 'none'
    clearTimers()
    flushInterim()
    stopRecognition(true)
    stopRecorder()
    setListening(false)
    setSttAlive(false)
    setElapsedSec(0)
    setHeardSpeech(false)
    setStatusHint('')
  }, [flushInterim, stopRecognition])

  const startTick = useCallback(
    (sid: number, maxSec: number) => {
      startedAt.current = Date.now()
      if (tickTimer.current) window.clearInterval(tickTimer.current)
      tickTimer.current = window.setInterval(() => {
        if (sid !== sessionId.current || !wantListen.current) return
        const sec = Math.floor((Date.now() - startedAt.current) / 1000)
        setElapsedSec(sec)
        if (sec >= maxSec) {
          sessionId.current += 1
          hardStopSession()
        }
      }, 250)
    },
    [hardStopSession],
  )

  const startRecorderHold = useCallback(
    async (sid: number) => {
      if (!canUseMic()) return
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        if (sid !== sessionId.current || !wantListen.current) {
          stopTracks(stream)
          return
        }
        // If STT already owns mic and is alive, skip recorder
        if (runningRef.current && modeRef.current === 'stt') {
          stopTracks(stream)
          return
        }
        stopTracks(streamRef.current)
        streamRef.current = stream
        modeRef.current = 'recorder'
        const mime = pickRecorderMime()
        try {
          const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
          recorder.start()
          recorderRef.current = recorder
        } catch {
          recorderRef.current = null
        }
        setHeardSpeech(true)
        if (!transcriptRef.current && !interimRef.current) {
          setStatusHint('錄音練習中——網頁聽寫唔穩時，請爸爸媽媽聽完撳 ★')
        }
      } catch {
        /* mic already denied elsewhere */
      }
    },
    [],
  )

  const bindHandlers = useCallback(
    (rec: BrowserSpeechRecognition, sid: number) => {
      if (handlersBound.current) return
      handlersBound.current = true

      rec.onstart = () => {
        if (sid !== sessionId.current || !wantListen.current) return
        runningRef.current = true
        modeRef.current = 'stt'
        setSttAlive(true)
        setError(null)
        setStatusHint(appleRef.current ? '廣東話聽寫中…請大聲講' : '請大聲講…')
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
        // Safari sometimes never marks final — still show interim as text
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
          // STT got words — release recorder hold if any (mic for STT)
          if (recorderRef.current || streamRef.current) {
            stopRecorder()
            modeRef.current = 'stt'
          }
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

        if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'audio-capture') {
          // Keep practice session if we can hold mic another way
          sttEnabled.current = false
          setError(
            appleRef.current
              ? '網頁未獲麥克風／聽寫權限。撳「aA」→ 網站設定 → 麥克風 → 允許。聽寫：設定→一般→鍵盤→聽寫→下載「廣東話」（唔係淨係鍵盤粵）。'
              : '需要開咪高峰。去瀏覽器設定允許麥克風，再撳 ●。',
          )
          void startRecorderHold(sid)
          return
        }

        if (code === 'no-speech') {
          setStatusHint('聽唔到聲——請繼續講…')
          return
        }

        if (code === 'language-not-supported' || code === 'network') {
          if (langIdx.current < langsRef.current.length - 1) {
            langIdx.current += 1
            rec.lang = langsRef.current[langIdx.current]
            setActiveLang(rec.lang)
            setStatusHint(`改用 ${rec.lang}…`)
            return
          }
          setStatusHint(
            appleRef.current
              ? '聽寫語言未就緒。設定→一般→鍵盤→聽寫→下載「廣東話」。鍵盤有「粵」都唔夠。'
              : '轉文字唔穩——可試 EN，或用 ★。',
          )
        }
      }

      rec.onend = () => {
        if (sid !== sessionId.current) return
        runningRef.current = false
        setSttAlive(false)
        flushInterim()
        if (!wantListen.current || !sttEnabled.current) return

        // Safari + Chrome mobile: restart slowly (cap) so ● session does not “flash” empty
        const maxRestart = appleRef.current ? 18 : 30
        const delay = appleRef.current ? 900 : 400
        if (restartCount.current >= maxRestart) {
          setStatusHint('聽寫暫停——可再撳 ●，或爸爸媽媽撳 ★')
          void startRecorderHold(sid)
          return
        }
        restartCount.current += 1
        if (restartTimer.current) window.clearTimeout(restartTimer.current)
        restartTimer.current = window.setTimeout(() => {
          if (sid !== sessionId.current || !wantListen.current || !sttEnabled.current) return
          if (!recRef.current) return
          // Free mic from recorder hold before restarting Apple STT
          stopRecorder()
          modeRef.current = 'stt'
          try {
            recRef.current.start()
          } catch {
            void startRecorderHold(sid)
          }
        }, delay)
      }
    },
    [flushInterim, startRecorderHold],
  )

  const ensureRec = useCallback(
    (sid: number) => {
      const Ctor = getRecognitionCtor()
      if (!Ctor) return null
      if (recRef.current) {
        bindHandlers(recRef.current, sid)
        return recRef.current
      }
      const rec = new Ctor()
      recRef.current = rec
      handlersBound.current = false
      bindHandlers(rec, sid)
      return rec
    },
    [bindHandlers],
  )

  useEffect(() => {
    const hasStt = !!getRecognitionCtor()
    const hasMic = canUseMic()
    setSupported(hasStt || hasMic)
    setEngine(isAppleWebKit() ? 'safari' : hasStt ? 'chrome' : hasMic ? 'chrome' : 'none')
    return () => {
      sessionId.current += 1
      wantListen.current = false
      clearTimers()
      stopRecognition(true)
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
  }, [])

  const stop = useCallback(() => {
    sessionId.current += 1
    const hadText = !!(transcriptRef.current.trim() || interimRef.current.trim())
    hardStopSession()
    if (appleRef.current && !hadText) {
      setStatusHint(
        '未出字。請確認：設定→一般→鍵盤→聽寫→已下載「廣東話」（鍵盤有「粵」唔等於聽寫）。或以 ★ 為準。',
      )
    }
  }, [hardStopSession])

  const start = useCallback(
    (lang: ListenLang = 'zh-HK') => {
      sessionId.current += 1
      const sid = sessionId.current
      hardStopSession()

      wantListen.current = true
      sttEnabled.current = true
      modeRef.current = 'none'
      restartCount.current = 0
      setError(null)
      setTranscript('')
      transcriptRef.current = ''
      interimRef.current = ''
      setInterim('')
      setElapsedSec(0)
      setSttAlive(false)
      setHeardSpeech(false)
      // Critical: listening stays true until ■ — STT end must not flash UI back to ●
      setListening(true)
      langsRef.current = langFallbacks(lang, appleRef.current)
      langIdx.current = 0
      setActiveLang(langsRef.current[0])
      startTick(sid, appleRef.current ? 45 : 45)

      const rec = ensureRec(sid)
      if (!rec) {
        setStatusHint('呢部瀏覽器未支援網頁聽寫——改錄音練習，爸爸媽媽撳 ★')
        void startRecorderHold(sid)
        return
      }

      // iOS: continuous false + slow restart is more stable than continuous true “flash”
      rec.continuous = appleRef.current ? false : !isMobileUa()
      rec.interimResults = true
      rec.maxAlternatives = 1
      rec.lang = langsRef.current[0]

      setStatusHint(
        appleRef.current
          ? lang === 'en-US'
            ? '啟動英文聽寫…'
            : '啟動廣東話聽寫…（要「聽寫→廣東話」，唔係淨係鍵盤粵）'
          : '啟動轉文字…',
      )

      // Safari: warm mic permission then STT (async OK on WebKit)
      const begin = () => {
        if (sid !== sessionId.current || !wantListen.current) return
        try {
          rec.start()
        } catch {
          window.setTimeout(() => {
            if (sid !== sessionId.current || !wantListen.current) return
            try {
              rec.start()
            } catch {
              sttEnabled.current = false
              setStatusHint('聽寫開唔到——改用錄音練習，爸爸媽媽撳 ★')
              void startRecorderHold(sid)
            }
          }, 400)
        }
        // If STT never becomes alive, hold session with recorder so UI does not flash off
        window.setTimeout(() => {
          if (sid !== sessionId.current || !wantListen.current) return
          if (!runningRef.current && !transcriptRef.current) {
            void startRecorderHold(sid)
          }
        }, 1600)
      }

      if (appleRef.current && canUseMic()) {
        void navigator.mediaDevices
          .getUserMedia({ audio: true, video: false })
          .then((stream) => {
            stream.getTracks().forEach((t) => t.stop())
            begin()
          })
          .catch(() => {
            wantListen.current = false
            setListening(false)
            setError('麥克風未允許。撳網址列「aA」→ 網站設定 → 麥克風 → 允許。')
          })
        return
      }

      begin()
    },
    [ensureRec, hardStopSession, startRecorderHold, startTick],
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
