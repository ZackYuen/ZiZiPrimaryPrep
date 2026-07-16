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

export function useSpeechRecognition() {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<BrowserSpeechRecognition | null>(null)
  const intentionalStop = useRef(false)

  useEffect(() => {
    setSupported(!!getRecognitionCtor())
    return () => {
      intentionalStop.current = true
      try {
        recRef.current?.abort()
      } catch {
        /* ignore */
      }
      recRef.current = null
    }
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setInterim('')
    setError(null)
  }, [])

  const stop = useCallback(() => {
    intentionalStop.current = true
    setListening(false)
    setInterim('')
    try {
      recRef.current?.stop()
    } catch {
      /* ignore */
    }
  }, [])

  const start = useCallback(
    (lang: ListenLang = 'zh-HK') => {
      const Ctor = getRecognitionCtor()
      if (!Ctor) {
        setError('呢部電話暫唔支援語音辨識。請爸爸媽媽聽完按「我講完啦」。')
        return
      }

      try {
        recRef.current?.abort()
      } catch {
        /* ignore */
      }

      intentionalStop.current = false
      setError(null)
      setInterim('')
      // Keep previous final transcript unless starting fresh — clear for new take
      setTranscript('')

      const rec = new Ctor()
      rec.lang = lang === 'zh-HK' ? 'zh-HK' : 'en-US'
      rec.continuous = true
      rec.interimResults = true
      rec.maxAlternatives = 1

      rec.onresult = (event) => {
        let finalChunk = ''
        let interimChunk = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const piece = event.results[i][0]?.transcript ?? ''
          if (event.results[i].isFinal) finalChunk += piece
          else interimChunk += piece
        }
        if (finalChunk) {
          setTranscript((prev) => `${prev}${finalChunk}`.trim())
        }
        setInterim(interimChunk.trim())
      }

      rec.onerror = (event) => {
        const code = event.error
        if (code === 'aborted' || code === 'no-speech') {
          // soft: no scary error for silence
          if (code === 'no-speech') {
            setError('未聽到聲音——再大聲少少試下？')
          }
          setListening(false)
          return
        }
        if (code === 'not-allowed') {
          setError('需要咪高峰權限。可去設定開咗，或者改由爸爸媽媽聽。')
        } else {
          setError('聽唔清楚——唔緊要，請爸爸媽媽聽你講就得。')
        }
        setListening(false)
      }

      rec.onend = () => {
        setListening(false)
        setInterim('')
        // Some browsers end early; only auto-restart if still intentional listening
        if (!intentionalStop.current && recRef.current === rec) {
          // leave stopped — kid/parent taps again if needed
        }
      }

      recRef.current = rec
      try {
        rec.start()
        setListening(true)
      } catch {
        setError('開咪失敗——請爸爸媽媽聽你講，再按「我講完啦」。')
        setListening(false)
      }
    },
    [],
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
