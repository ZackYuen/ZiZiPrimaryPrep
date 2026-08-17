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
  return `${v.lang} ${v.name}`.toLowerCase()
}

function isEnglishVoice(v: SpeechSynthesisVoice): boolean {
  return /^(en\b)|english|samantha|karen|daniel|moira|rishi|veena|fred|nicky|gordon/i.test(
    voiceBlob(v),
  )
}

function isChineseVoice(v: SpeechSynthesisVoice): boolean {
  return /zh|yue|cantonese|chinese|中文|粵|普通話|普通话/.test(voiceBlob(v))
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
  if (/\b(sinji|meijia|美嘉|善怡|迦娜)\b/i.test(v.name)) score += 40
  if (v.localService) score += 5
  if (/zh([-_]?cn)|putonghua|mandarin|普通话|普通話|汉语|漢語/.test(b) && !/hk|yue|cantonese|香港/.test(b)) {
    score -= 50
  }
  return score
}

/**
 * iPhone: return undefined so Safari uses the **system default** voice for
 * utterance.lang (中文香港 / English). Forcing a voice + custom rate/pitch
 * is what made Cantonese sound harsh.
 *
 * Desktop: still pick a matching voice, but English must never be a Chinese voice.
 */
function pickVoice(lang: SpeakLang): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined
  if (isAppleWebKit()) return undefined

  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return undefined

  if (lang === 'en-US') {
    const ranked = voices
      .filter(isEnglishVoice)
      .map((v) => {
        const b = voiceBlob(v)
        let s = 0
        if (/en([-_]?us)/.test(b)) s += 50
        if (/en([-_]?gb)/.test(b)) s += 40
        if (/en([-_]?hk)/.test(b)) s += 35
        if (v.localService) s += 10
        return { v, s }
      })
      .sort((a, b) => b.s - a.s)
    return ranked[0]?.v
  }

  const ranked = voices
    .map((v) => ({ v, score: scoreCantoneseVoice(v) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  return ranked[0]?.v
}

function buildVoiceStatus(): VoiceStatus {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return { name: null, isCantonese: false, tip: '呢部瀏覽器未支援朗讀。' }
  }
  if (isAppleWebKit()) {
    return {
      name: 'iPhone 系統粵語',
      isCantonese: true,
      tip: '用緊 iPhone 預設中文（香港）。若唔似粵語，去「設定 → 輔助使用 → 朗讀內容 → 聲音」加入中文香港。',
    }
  }
  const voice = pickVoice('zh-HK')
  if (!voice) {
    return {
      name: null,
      isCantonese: false,
      tip: '未找到粵語聲線。請加入「中文（香港）」語音，或用 iPhone Safari。',
    }
  }
  const isCantonese = scoreCantoneseVoice(voice) >= 80
  return {
    name: voice.name,
    isCantonese,
    tip: isCantonese
      ? null
      : `而家用緊「${voice.name}」，可能係普通話。建議用 iPhone 系統粵語，或 Chrome 香港聲線。`,
  }
}

export function looksEnglish(text: string): boolean {
  const letters = (text.match(/[a-zA-Z]/g) ?? []).length
  const cjk = (text.match(/[\u4e00-\u9fff]/g) ?? []).length
  return letters > 0 && letters >= cjk
}

type Chunk = { text: string; lang: SpeakLang }

/** Never send English through a Cantonese voice — split mixed lines. */
export function chunksForSpeech(text: string, fallback: SpeakLang): Chunk[] {
  const raw = text.trim()
  if (!raw) return []
  const hasLatin = /[A-Za-z]/.test(raw)
  const hasCjk = /[\u4e00-\u9fff]/.test(raw)
  if (hasLatin && !hasCjk) return [{ text: raw, lang: 'en-US' }]
  if (hasCjk && !hasLatin) return [{ text: raw, lang: fallback === 'en-US' ? 'en-US' : 'zh-HK' }]
  if (!hasLatin) return [{ text: raw, lang: fallback }]

  const parts = raw.match(/[\u4e00-\u9fff][\u4e00-\u9fff0-9\s，。、！？：；「」『』（）—…·]{0,}|[A-Za-z][A-Za-z0-9'’.,!?;:"\-()\s]*/g)
  if (!parts || parts.length < 2) {
    return [{ text: raw, lang: looksEnglish(raw) ? 'en-US' : fallback }]
  }
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => ({
      text: p,
      lang: /[A-Za-z]/.test(p) && !/[\u4e00-\u9fff]/.test(p) ? 'en-US' : 'zh-HK',
    }))
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
    refreshVoices()
    const synth = window.speechSynthesis as SpeechSynthesis & {
      onvoiceschanged: (() => void) | null
    }
    if (typeof synth.addEventListener === 'function') {
      synth.addEventListener('voiceschanged', refreshVoices)
      return () => synth.removeEventListener('voiceschanged', refreshVoices)
    }
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
    const apple = isAppleWebKit()
    const u = new SpeechSynthesisUtterance(text.trim())
    u.lang = lang === 'en-US' ? 'en-US' : 'zh-HK'
    // iPhone default voices sound worse when rate/pitch are tweaked.
    u.rate = apple ? 1 : lang === 'zh-HK' ? 0.92 : 0.95
    u.pitch = 1
    const voice = pickVoice(lang)
    if (voice) {
      if (lang === 'en-US' && isChineseVoice(voice)) {
        // Never attach a Cantonese/Mandarin voice to English.
      } else if (lang === 'zh-HK' && isEnglishVoice(voice) && !isChineseVoice(voice)) {
        // Skip English-only voice for Cantonese.
      } else {
        u.voice = voice
      }
    }
    u.onend = () => onEnd?.()
    u.onerror = () => onEnd?.()
    const kick = () => window.speechSynthesis.speak(u)
    // iOS often drops the first speak() if it follows cancel() immediately.
    if (apple) window.setTimeout(kick, 50)
    else kick()
  }, [])

  const speakChunks = useCallback(
    (chunks: Chunk[]) => {
      stop()
      const cleaned = chunks.filter((c) => c.text.trim())
      if (!cleaned.length) return
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
      speakOne(cleaned[0].text, cleaned[0].lang, next)
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
