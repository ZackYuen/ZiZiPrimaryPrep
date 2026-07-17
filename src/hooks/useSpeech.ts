import { useCallback, useEffect, useRef, useState } from 'react'

export type SpeakLang = 'zh-HK' | 'en-US'

export type VoiceStatus = {
  /** Best matching voice name, if any */
  name: string | null
  /** True when voice lang/name looks like Hong Kong Cantonese */
  isCantonese: boolean
  /** Short tip for parents when Cantonese voice is missing */
  tip: string | null
}

/**
 * Cantonese TTS sourcing (best → OK for this static GitHub Pages app):
 *
 * 1. **Best quality (needs API key / backend):** Google Cloud Text-to-Speech
 *    voices under language code `yue-HK` (Chinese Hong Kong / Cantonese),
 *    e.g. `yue-HK-Standard-A` / Chirp3-HD. See:
 *    https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types
 *    Specialized: https://docs.cantonese.ai/text-to-speech
 *
 * 2. **Best free in-browser (what we use now):** Web Speech API
 *    `speechSynthesis` with explicit Cantonese voice pick:
 *    prefer `yue*` / name contains Cantonese / `zh-HK`.
 *    Chrome/Edge on desktop often ships Google 粵語香港; iPhone Safari often
 *    has「美嘉 / Sinji」etc. after adding 中文（香港）in system settings.
 *
 * 3. **Avoid:** falling back to `zh-CN` / Putonghua for HK interview prep —
 *    kids hear the wrong readings. We only fall back if no HK/yue voice exists.
 */

function voiceBlob(v: SpeechSynthesisVoice): string {
  return `${v.lang} ${v.name}`.toLowerCase()
}

function scoreCantoneseVoice(v: SpeechSynthesisVoice): number {
  const b = voiceBlob(v)
  let score = 0
  if (/yue([-_]|$)/.test(b) || b.includes('cantonese') || b.includes('粵語') || b.includes('广东话') || b.includes('廣東話')) {
    score += 100
  }
  if (/zh([-_]?hk)/.test(b) || b.includes('hong kong') || b.includes('hongkong') || b.includes('香港')) {
    score += 80
  }
  // Known device voice names that speak Cantonese
  if (/\b(sinji|meijia|美嘉|善怡|迦娜)\b/i.test(v.name)) score += 40
  // Prefer local offline voices when available
  if (v.localService) score += 5
  // Penalize clear Mandarin-only voices
  if (/zh([-_]?cn)|putonghua|mandarin|普通话|普通話|汉语|漢語/.test(b) && !/hk|yue|cantonese|香港/.test(b)) {
    score -= 50
  }
  return score
}

function pickVoice(lang: SpeakLang): SpeechSynthesisVoice | undefined {
  if (!('speechSynthesis' in window)) return undefined
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return undefined

  if (lang === 'en-US') {
    const enScore = (v: SpeechSynthesisVoice) => {
      const b = voiceBlob(v)
      let s = 0
      if (/en([-_]?hk)/.test(b)) s += 50
      if (/en([-_]?gb)/.test(b)) s += 40
      if (/en([-_]?us)/.test(b)) s += 35
      if (b.startsWith('en')) s += 20
      if (v.localService) s += 5
      return s
    }
    return [...voices].sort((a, b) => enScore(b) - enScore(a))[0]
  }

  const ranked = [...voices]
    .map((v) => ({ v, score: scoreCantoneseVoice(v) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  if (ranked[0]) return ranked[0].v

  // Last resort: any Chinese voice (may be Mandarin — UI will tip parents)
  return voices.find((v) => /zh|chinese|中文/.test(voiceBlob(v)))
}

function buildVoiceStatus(lang: SpeakLang): VoiceStatus {
  if (!('speechSynthesis' in window)) {
    return { name: null, isCantonese: false, tip: '呢部瀏覽器未支援朗讀。' }
  }
  const voice = pickVoice(lang)
  if (lang !== 'zh-HK') {
    return { name: voice?.name ?? null, isCantonese: false, tip: null }
  }
  if (!voice) {
    return {
      name: null,
      isCantonese: false,
      tip: '未找到粵語聲線。請喺手機／電腦加入「中文（香港）」語音，或用 Chrome。',
    }
  }
  const isCantonese = scoreCantoneseVoice(voice) >= 80
  return {
    name: voice.name,
    isCantonese,
    tip: isCantonese
      ? null
      : `而家用緊「${voice.name}」，可能係普通話。建議安裝／選用香港粵語聲線（系統語言加入中文香港；Chrome 通常較好）。`,
  }
}

export function looksEnglish(text: string): boolean {
  const letters = (text.match(/[a-zA-Z]/g) ?? []).length
  const cjk = (text.match(/[\u4e00-\u9fff]/g) ?? []).length
  return letters > 0 && letters >= cjk
}

export function useSpeech() {
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>({
    name: null,
    isCantonese: false,
    tip: null,
  })
  const queueRef = useRef<string[]>([])
  const queueLangRef = useRef<SpeakLang>('zh-HK')
  const playingQueue = useRef(false)

  const refreshVoices = useCallback(() => {
    setVoiceStatus(buildVoiceStatus('zh-HK'))
  }, [])

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    refreshVoices()
    const synth = window.speechSynthesis as SpeechSynthesis & {
      onvoiceschanged: (() => void) | null
    }
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', refreshVoices)
      return () => synth.removeEventListener('voiceschanged', refreshVoices)
    }
    // iOS 10: property handler instead of EventTarget
    synth.onvoiceschanged = refreshVoices
    return () => {
      synth.onvoiceschanged = null
    }
  }, [refreshVoices])

  const stop = useCallback(() => {
    queueRef.current = []
    playingQueue.current = false
    if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  }, [])

  const speakOne = useCallback((text: string, lang: SpeakLang, onEnd?: () => void) => {
    if (!('speechSynthesis' in window) || !text.trim()) {
      onEnd?.()
      return
    }
    const u = new SpeechSynthesisUtterance(text.trim())
    u.lang = lang === 'zh-HK' ? 'zh-HK' : 'en-US'
    // Slightly slower helps a 5-year-old catch choice words
    u.rate = lang === 'zh-HK' ? 0.88 : 0.92
    u.pitch = 1.05
    const voice = pickVoice(lang)
    if (voice) {
      u.voice = voice
      // Some engines honor voice.lang over utterance.lang
      if (voice.lang) u.lang = voice.lang
    }
    u.onend = () => onEnd?.()
    u.onerror = () => onEnd?.()
    window.speechSynthesis.speak(u)
  }, [])

  const speak = useCallback(
    (text: string, lang: SpeakLang = 'zh-HK') => {
      stop()
      if (lang === 'zh-HK') setVoiceStatus(buildVoiceStatus('zh-HK'))
      speakOne(text, lang)
    },
    [speakOne, stop],
  )

  /** Read several lines in order (e.g. all MC options). */
  const speakQueue = useCallback(
    (parts: string[], lang: SpeakLang = 'zh-HK') => {
      stop()
      const cleaned = parts.map((p) => p.trim()).filter(Boolean)
      if (!cleaned.length) return
      if (lang === 'zh-HK') setVoiceStatus(buildVoiceStatus('zh-HK'))
      queueRef.current = cleaned
      queueLangRef.current = lang
      playingQueue.current = true

      const next = () => {
        if (!playingQueue.current) return
        const piece = queueRef.current.shift()
        if (!piece) {
          playingQueue.current = false
          return
        }
        speakOne(piece, queueLangRef.current, next)
      }
      next()
    },
    [speakOne, stop],
  )

  return { speak, speakQueue, stop, voiceStatus }
}
