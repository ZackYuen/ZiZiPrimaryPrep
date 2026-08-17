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
  if (/premium|優質/.test(b)) score += 30
  if (/enhanced|增強/.test(b)) score += 20
  if (v.localService) score += 5
  if (/compact|精簡/.test(b)) score -= 40
  if (/zh([-_]?cn)|putonghua|mandarin|普通话|普通話|汉语|漢語/.test(b) && !/hk|yue|cantonese|香港/.test(b)) {
    score -= 50
  }
  return score
}

function isCompactVoice(v: SpeechSynthesisVoice): boolean {
  return /compact|精簡/.test(voiceBlob(v))
}

/** Downloaded iOS 「優質／增強」中文（香港）— not the on-device Compact pack. */
function isPremiumYueVoice(v: SpeechSynthesisVoice): boolean {
  if (scoreCantoneseVoice(v) < 80) return false
  if (isCompactVoice(v)) return false
  return /premium|enhanced|優質|增強/.test(voiceBlob(v))
}

function bestPremiumYue(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  return voices
    .filter(isPremiumYueVoice)
    .sort((a, b) => scoreCantoneseVoice(b) - scoreCantoneseVoice(a))[0]
}

/**
 * iPhone: if 「優質／增強」中文（香港） is downloaded, use it. Otherwise leave
 * voice unset so Safari uses the system default (often Compact until the pack
 * is installed). Desktop still ranks Cantonese voices, never English-as-Yue.
 */
function pickVoice(lang: SpeakLang): SpeechSynthesisVoice | undefined {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return undefined
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return undefined

  if (lang === 'en-US') {
    if (isAppleWebKit()) return undefined
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

  if (isAppleWebKit()) {
    return bestPremiumYue(voices)
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
    const premium = bestPremiumYue(window.speechSynthesis.getVoices())
    if (premium) {
      return { name: premium.name, isCantonese: true, tip: null }
    }
    return {
      name: 'iPhone 系統粵語',
      isCantonese: true,
      tip: '請下載「中文（香港）優質／增強」：設定 → 輔助使用 → 朗讀內容 → 聲音。未下載會用精簡版，聽落會硬啲。',
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
