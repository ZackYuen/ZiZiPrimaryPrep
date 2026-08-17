import { useCallback, useEffect, useRef, useState } from 'react'
import { duckBgm } from '../lib/bgm'

export type SpeakLang = 'zh-HK' | 'en-US'

export type VoiceStatus = {
  /** Best matching voice name, if any */
  name: string | null
  /** True when voice lang/name looks like Hong Kong Cantonese */
  isCantonese: boolean
  /** Short tip for parents when Cantonese voice is missing */
  tip: string | null
}

function isAppleWebKit(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  if (/Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|CriOS|FxiOS/i.test(ua)) return true
  return typeof navigator.vendor === 'string' && navigator.vendor.includes('Apple')
}

function voiceBlob(v: SpeechSynthesisVoice): string {
  const uri = typeof v.voiceURI === 'string' ? v.voiceURI : ''
  return `${v.lang} ${v.name} ${uri}`.toLowerCase()
}

function isEnglishVoice(v: SpeechSynthesisVoice): boolean {
  return /^(en\b)|english|samantha|karen|daniel|moira|rishi|veena|fred|nicky|gordon/i.test(
    voiceBlob(v),
  )
}

function isChineseVoice(v: SpeechSynthesisVoice): boolean {
  return /zh|yue|cantonese|chinese|中文|粵|普通話|普通话/.test(voiceBlob(v))
}

/** Apple HK Cantonese is Sin-Ji / 善怡. Mei-Jia / 美嘉 is Taiwan Mandarin — do not treat as Yue. */
function isHkCantoneseVoice(v: SpeechSynthesisVoice): boolean {
  const b = voiceBlob(v)
  if (/eloquence/.test(b)) return false
  if (
    /zh([-_]?cn)|zh([-_]?tw)|putonghua|mandarin|ting-?ting|mei-?jia|meijia|美嘉|婷婷|普通话|普通話/.test(b) &&
    !/hk|yue|cantonese|sin[-.\s]?ji|善怡|香港/.test(b)
  ) {
    return false
  }
  return (
    /yue([-_]|$)/.test(b) ||
    /zh([-_]?hk)/.test(b) ||
    /sin[-.\s]?ji|善怡/.test(b) ||
    b.includes('cantonese') ||
    b.includes('粵語') ||
    b.includes('广东话') ||
    b.includes('廣東話') ||
    b.includes('hong kong') ||
    b.includes('hongkong') ||
    (v.lang || '').toLowerCase() === 'zh-hk' ||
    (v.name || '').toLowerCase() === 'zh-hk'
  )
}

function scoreCantoneseVoice(v: SpeechSynthesisVoice): number {
  const b = voiceBlob(v)
  let score = 0
  if (!isHkCantoneseVoice(v)) {
    if (/zh([-_]?cn)|zh([-_]?tw)|putonghua|mandarin|普通话|普通話|汉语|漢語|ting-?ting|mei-?jia/.test(b)) {
      return -100
    }
    return 0
  }
  if (/yue([-_]|$)/.test(b) || b.includes('cantonese') || b.includes('粵語') || b.includes('广东话') || b.includes('廣東話')) {
    score += 100
  }
  if (/zh([-_]?hk)/.test(b) || b.includes('hong kong') || b.includes('hongkong') || b.includes('香港')) {
    score += 90
  }
  if (/sin[-.\s]?ji|善怡/.test(b)) score += 50
  if (/premium|優質/.test(b)) score += 40
  if (/enhanced|增強/.test(b)) score += 28
  if (/\bsiri\b/.test(b) && !/compact|精簡/.test(b)) score += 16
  if (v.default) score += 8
  if (v.localService) score += 5
  if (/compact|精簡/.test(b)) score -= 35
  if (/eloquence/.test(b)) score -= 80
  return score
}

function bestYueVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const ranked = voices
    .map((v) => ({ v, score: scoreCantoneseVoice(v) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  return ranked[0]?.v
}

function bestEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const ranked = voices
    .filter(isEnglishVoice)
    .map((v) => {
      const b = voiceBlob(v)
      let s = 0
      if (/en([-_]?us)/.test(b)) s += 50
      if (/en([-_]?gb)/.test(b)) s += 40
      if (/en([-_]?hk)/.test(b)) s += 35
      if (v.localService) s += 10
      if (/eloquence/.test(b)) s -= 40
      return { v, s }
    })
    .sort((a, b) => b.s - a.s)
  return ranked[0]?.v
}

/**
 * Always attach a real zh-HK / Sin-Ji voice on iPhone. Leaving voice unset
 * makes Safari use the device-language default (English / 普通話 / Eloquence),
 * which is the "old" voice — not iPhone 廣東話.
 */
function pickVoice(lang: SpeakLang): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return undefined
  if (lang === 'en-US') return bestEnglishVoice(voices)
  return bestYueVoice(voices)
}

function buildVoiceStatus(): VoiceStatus {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { name: null, isCantonese: false, tip: '呢部瀏覽器未支援朗讀。' }
  }
  window.speechSynthesis.getVoices()
  const voice = pickVoice('zh-HK')
  if (!voice) {
    return {
      name: null,
      isCantonese: false,
      tip: isAppleWebKit()
        ? '未找到 iPhone 廣東話（Sin-Ji／善怡）。設定 → 輔助使用 → 朗讀內容 → 聲音 → 中文（香港）→ 下載優質／增強。'
        : '未找到粵語聲線。請加入「中文（香港）」語音，或用 iPhone Safari。',
    }
  }
  const b = voiceBlob(voice)
  const premium = /premium|enhanced|優質|增強/.test(b)
  const compact = /compact|精簡/.test(b)
  return {
    name: voice.name,
    isCantonese: true,
    tip: premium
      ? null
      : compact
        ? `而家用緊「${voice.name}」（精簡）。下載優質／增強會更自然：設定 → 輔助使用 → 朗讀內容 → 聲音 → 中文（香港）。`
        : null,
  }
}

export function looksEnglish(text: string): boolean {
  if (/[\u4e00-\u9fff]/.test(text)) return false
  return /[A-Za-z]/.test(text)
}

function looksLikeEnglishSentence(s: string): boolean {
  const t = s.trim()
  if (!/^[A-Za-z]/.test(t)) return false
  return /[A-Za-z][A-Za-z'’.-]*\s+[A-Za-z]/.test(t) || /^[A-Z][A-Za-z'’.,!? ]{8,}$/.test(t)
}

type Chunk = { text: string; lang: SpeakLang }

/**
 * iOS Premium 中文（香港）handles 口語 particles and 中英夾雜 in one utterance.
 * Only split when a Chinese cue is followed by a full English sentence
 * (e.g. 「跟住講英文：My name is Seth.」).
 */
export function chunksForSpeech(text: string, fallback: SpeakLang): Chunk[] {
  const raw = text.trim()
  if (!raw) return []
  const hasLatin = /[A-Za-z]/.test(raw)
  const hasCjk = /[\u4e00-\u9fff]/.test(raw)
  if (fallback === 'en-US' && !hasCjk) return [{ text: raw, lang: 'en-US' }]
  if (hasLatin && !hasCjk) return [{ text: raw, lang: 'en-US' }]
  if (!hasLatin) return [{ text: raw, lang: 'zh-HK' }]

  const colon = raw.search(/[：:]/)
  if (colon >= 0) {
    const after = raw.slice(colon + 1)
    if (looksLikeEnglishSentence(after)) {
      const before = raw.slice(0, colon + 1).trim()
      const chunks: Chunk[] = []
      if (before) chunks.push({ text: before, lang: 'zh-HK' })
      chunks.push({ text: after.trim(), lang: 'en-US' })
      return chunks
    }
  }

  const cue = raw.match(/^([\u4e00-\u9fff][^A-Za-z]{0,40})([A-Z][\s\S]+)$/)
  if (cue && looksLikeEnglishSentence(cue[2])) {
    return [
      { text: cue[1].trim(), lang: 'zh-HK' },
      { text: cue[2].trim(), lang: 'en-US' },
    ]
  }

  return [{ text: raw, lang: 'zh-HK' }]
}

export function useSpeech() {
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>({
    name: null,
    isCantonese: false,
    tip: null,
  })
  const queueRef = useRef<Chunk[]>([])
  const playingQueue = useRef(false)

  const refreshVoices = useCallback(() => {
    setVoiceStatus(buildVoiceStatus())
  }, [])

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    const synth = window.speechSynthesis as SpeechSynthesis & {
      onvoiceschanged: (() => void) | null
    }
    synth.getVoices()
    refreshVoices()
    const poll = window.setInterval(() => {
      if (synth.getVoices().length) {
        refreshVoices()
        window.clearInterval(poll)
      }
    }, 200)
    const stopPoll = window.setTimeout(() => window.clearInterval(poll), 4000)
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', refreshVoices)
      return () => {
        synth.removeEventListener('voiceschanged', refreshVoices)
        window.clearInterval(poll)
        window.clearTimeout(stopPoll)
      }
    }
    synth.onvoiceschanged = refreshVoices
    return () => {
      synth.onvoiceschanged = null
      window.clearInterval(poll)
      window.clearTimeout(stopPoll)
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
    const apple = isAppleWebKit()
    const synth = window.speechSynthesis
    synth.getVoices()

    const start = () => {
      const u = new SpeechSynthesisUtterance(text.trim())
      const voice = pickVoice(lang)
      u.rate = apple ? 1 : lang === 'zh-HK' ? 0.92 : 0.95
      u.pitch = 1
      if (voice) {
        const skip =
          (lang === 'en-US' && isChineseVoice(voice)) ||
          (lang === 'zh-HK' && isEnglishVoice(voice) && !isHkCantoneseVoice(voice))
        if (!skip) {
          u.voice = voice
          u.lang = voice.lang || (lang === 'en-US' ? 'en-US' : 'zh-HK')
        } else {
          u.lang = lang === 'en-US' ? 'en-US' : 'zh-HK'
        }
      } else {
        u.lang = lang === 'en-US' ? 'en-US' : 'zh-HK'
      }
      u.onend = () => onEnd?.()
      u.onerror = () => onEnd?.()
      synth.speak(u)
    }

    if (apple && synth.getVoices().length === 0) {
      let done = false
      const run = () => {
        if (done) return
        done = true
        if (typeof synth.removeEventListener === 'function') {
          synth.removeEventListener('voiceschanged', run)
        }
        start()
      }
      if (typeof synth.addEventListener === 'function') {
        synth.addEventListener('voiceschanged', run)
      }
      window.setTimeout(run, 280)
      return
    }
    start()
  }, [])

  const speakChunks = useCallback(
    (chunks: Chunk[]) => {
      const cleaned = chunks.filter((c) => c.text.trim())
      if (!cleaned.length) return
      const apple = isAppleWebKit()
      const synth = 'speechSynthesis' in window ? window.speechSynthesis : null
      synth?.getVoices()
      const needGap = Boolean(apple && synth && (synth.speaking || synth.pending))
      stop()
      setVoiceStatus(buildVoiceStatus())
      duckBgm(Math.min(16000, 1800 + cleaned.reduce((n, c) => n + c.text.length, 0) * 80))
      queueRef.current = cleaned.slice(1)
      playingQueue.current = true
      const next = () => {
        if (!playingQueue.current) return
        const piece = queueRef.current.shift()
        if (!piece) {
          playingQueue.current = false
          return
        }
        speakOne(piece.text, piece.lang, next)
      }
      const go = () => speakOne(cleaned[0].text, cleaned[0].lang, next)
      if (needGap) window.setTimeout(go, 80)
      else go()
    },
    [speakOne, stop],
  )

  const speak = useCallback(
    (text: string, lang: SpeakLang = 'zh-HK') => {
      speakChunks(chunksForSpeech(text, lang))
    },
    [speakChunks],
  )

  const speakQueue = useCallback(
    (parts: string[], lang: SpeakLang = 'zh-HK') => {
      const chunks = parts.flatMap((p) => chunksForSpeech(p, lang))
      speakChunks(chunks)
    },
    [speakChunks],
  )

  return { speak, speakQueue, stop, voiceStatus }
}
