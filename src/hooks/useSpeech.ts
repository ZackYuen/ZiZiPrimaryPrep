import { useCallback, useEffect, useRef } from 'react'

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  const prefer =
    lang.startsWith('zh')
      ? voices.find((v) => /zh[-_]HK|yue|Cantonese/i.test(v.lang + v.name)) ||
        voices.find((v) => /zh[-_]TW|zh[-_]CN|Chinese/i.test(v.lang + v.name))
      : voices.find((v) => /en[-_]HK|en[-_]GB|en[-_]US/i.test(v.lang))
  return prefer ?? voices.find((v) => v.lang.toLowerCase().startsWith(lang.slice(0, 2)))
}

export function useSpeech() {
  const ready = useRef(false)

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const warm = () => {
      window.speechSynthesis.getVoices()
      ready.current = true
    }
    warm()
    window.speechSynthesis.addEventListener('voiceschanged', warm)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', warm)
  }, [])

  const stop = useCallback(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  const speak = useCallback(
    (text: string, lang: 'zh-HK' | 'en-US' = 'zh-HK') => {
      if (!('speechSynthesis' in window) || !text.trim()) return
      stop()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = lang
      u.rate = lang.startsWith('zh') ? 0.92 : 0.95
      u.pitch = 1.05
      const voice = pickVoice(lang)
      if (voice) u.voice = voice
      window.speechSynthesis.speak(u)
    },
    [stop],
  )

  return { speak, stop }
}
