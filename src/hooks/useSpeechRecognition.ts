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
    length: number
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

/** Prefer real Cantonese / HK, then close Chinese variants. */
function langFallbacks(lang: ListenLang): string[] {
  if (lang === 'en-US') return ['en-US', 'en-GB', 'en-HK', 'en']
  return ['zh-HK', 'yue-HK', 'yue-Hant-HK', 'zh-TW', 'zh-CN']
}

function errorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return '需要開咪高峰。去瀏覽器設定允許麥克風，再撳 ●。'
    case 'audio-capture':
      return '搵唔到麥克風。請檢查電話咪高峰。'
    case 'network':
      return '語音服務連線失敗。請用 Chrome／Safari、開網絡，或改由爸爸媽媽聽 ★。'
    case 'language-not-supported':
      return '呢部電話唔支援呢個語言辨識。可試 EN，或改由爸爸媽媽聽 ★。'
    case 'no-speech':
      return '未聽到聲音——再靠近咪、大聲少少。'
    case 'aborted':
      return ''
    default:
      return '聽唔清楚——唔緊要，請爸爸媽媽聽你講，撳 ★。'
  }
}

async function warmMic(): Promise<MediaStream | null> {
  if (!navigator.mediaDevices?.getUserMedia) return null
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
      video: false,
    })
    return stream
  } catch {
    return null
  }
}

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop())
}

export function useSpeechRecognition() {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recRef = useRef<BrowserSpeechRecognition | null>(null)
  const wantListen = useRef(false)
  const langIdx = useRef(0)
  const langsRef = useRef<string[]>(['zh-HK'])
  const micStream = useRef<MediaStream | null>(null)
  const restartTimer = useRef<number | null>(null)

  useEffect(() => {
    setSupported(!!getRecognitionCtor())
    return () => {
      wantListen.current = false
      if (restartTimer.current) window.clearTimeout(restartTimer.current)
      try {
        recRef.current?.abort()
      } catch {
        /* ignore */
      }
      recRef.current = null
      stopTracks(micStream.current)
      micStream.current = null
    }
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setInterim('')
    setError(null)
  }, [])

  const clearRestart = () => {
    if (restartTimer.current) {
      window.clearTimeout(restartTimer.current)
      restartTimer.current = null
    }
  }

  const stop = useCallback(() => {
    wantListen.current = false
    clearRestart()
    setListening(false)
    setInterim('')
    try {
      recRef.current?.stop()
    } catch {
      try {
        recRef.current?.abort()
      } catch {
        /* ignore */
      }
    }
    // Keep mic warm briefly is fine; release to free indicator
    stopTracks(micStream.current)
    micStream.current = null
  }, [])

  const attachHandlers = useCallback((rec: BrowserSpeechRecognition) => {
    rec.onstart = () => {
      if (wantListen.current) {
        setListening(true)
        setError(null)
      }
    }

    rec.onresult = (event) => {
      let finalChunk = ''
      let interimChunk = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i][0]?.transcript ?? ''
        if (event.results[i].isFinal) finalChunk += piece
        else interimChunk += piece
      }
      if (finalChunk) {
        setTranscript((prev) => `${prev}${prev ? ' ' : ''}${finalChunk}`.trim())
      }
      setInterim(interimChunk.trim())
    }

    rec.onerror = (event) => {
      const code = event.error
      // Try next language in the fallback list
      if (
        wantListen.current &&
        (code === 'language-not-supported' || code === 'network') &&
        langIdx.current < langsRef.current.length - 1
      ) {
        langIdx.current += 1
        // Keep wantListen; onend / manual restart will pick new lang
        return
      }
      const msg = errorMessage(code)
      if (msg) setError(msg)
      if (code === 'aborted') return
      if (code === 'no-speech') {
        // Stay in listening mode; onend restart will continue
        return
      }
      wantListen.current = false
      setListening(false)
    }

    rec.onend = () => {
      setInterim('')
      if (!wantListen.current) {
        setListening(false)
        return
      }
      // Mobile: continuous:false ends often — restart while user still wants mic
      clearRestart()
      restartTimer.current = window.setTimeout(() => {
        if (!wantListen.current || !recRef.current) return
        try {
          recRef.current.lang = langsRef.current[langIdx.current] ?? langsRef.current[0]
          recRef.current.start()
          setListening(true)
        } catch {
          // InvalidStateError if already started — ignore
        }
      }, 280)
    }
  }, [])

  const start = useCallback(
    async (lang: ListenLang = 'zh-HK') => {
      const Ctor = getRecognitionCtor()
      if (!Ctor) {
        setError('呢部電話／瀏覽器暫唔支援語音辨識。請爸爸媽媽聽完撳 ★。')
        return
      }

      clearRestart()
      wantListen.current = false
      try {
        recRef.current?.abort()
      } catch {
        /* ignore */
      }

      setError(null)
      setInterim('')
      setTranscript('')
      langsRef.current = langFallbacks(lang)
      langIdx.current = 0

      // Warm mic first (permission + first-tap reliability), then release tracks
      // so SpeechRecognition can own the mic (avoids some Android conflicts).
      stopTracks(micStream.current)
      const stream = await warmMic()
      if (!stream) {
        setError(errorMessage('not-allowed'))
        setListening(false)
        return
      }
      stopTracks(stream)
      micStream.current = null

      const rec = new Ctor()
      // continuous:true is flaky on mobile Chrome/iOS — use false + restart loop
      rec.continuous = !isMobileUa()
      rec.interimResults = true
      rec.maxAlternatives = 1
      rec.lang = langsRef.current[0]
      attachHandlers(rec)
      recRef.current = rec

      wantListen.current = true
      setListening(true)

      // Small delay after abort/getUserMedia so engine is ready
      await new Promise((r) => setTimeout(r, 120))
      if (!wantListen.current || recRef.current !== rec) return

      try {
        rec.start()
      } catch {
        setError('開咪失敗——請再撳 ●，或改由爸爸媽媽聽 ★。')
        wantListen.current = false
        setListening(false)
      }
    },
    [attachHandlers],
  )

  return {
    supported,
    listening,
    transcript,
    interim,
    error,
    start,
    stop,
    reset,
  }
}
