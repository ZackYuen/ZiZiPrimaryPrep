import { prepareSpokenText, toPlainSpoken, toSsml, type SpeakLang as TtsLang } from './speakText'
import { getVoiceSettings } from './voiceSettings'

export type { TtsLang }

export function hasGoogleTtsKey(): boolean {
  const key = import.meta.env.VITE_GOOGLE_SPEECH_API_KEY as string | undefined
  return Boolean(key && key.trim())
}

export function isGoogleTtsConfigured(): boolean {
  return getVoiceSettings().provider === 'google' && hasGoogleTtsKey()
}

const YUE_VOICES = ['yue-HK-Chirp3-HD-Kore', 'yue-HK-Standard-A']
const EN_VOICES = ['en-US-Chirp3-HD-Kore', 'en-US-Neural2-C', 'en-US-Standard-C']

const cache = new Map<string, Uint8Array>()
const CACHE_MAX = 40

function cacheKey(text: string, lang: TtsLang, voiceName: string, rate: number): string {
  return `${lang}:${voiceName}:${rate}:${text}`
}

function remember(key: string, bytes: Uint8Array) {
  cache.set(key, bytes)
  if (cache.size > CACHE_MAX) {
    const first = cache.keys().next().value
    if (first) cache.delete(first)
  }
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function synthesizeOnce(opts: {
  text?: string
  ssml?: string
  languageCode: string
  voiceName: string
  speakingRate: number
  apiKey: string
  signal?: AbortSignal
}): Promise<Uint8Array> {
  const input = opts.ssml ? { ssml: opts.ssml } : { text: opts.text }
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${opts.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input,
      voice: { languageCode: opts.languageCode, name: opts.voiceName },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: opts.speakingRate,
      },
    }),
    signal: opts.signal,
  })
  const data = (await res.json().catch(() => ({}))) as {
    audioContent?: string
    error?: { message?: string; status?: string }
  }
  if (!res.ok || !data.audioContent) {
    throw new Error(data.error?.message || `Google TTS 失敗（${res.status}）`)
  }
  return b64ToBytes(data.audioContent)
}

/** High-quality Cantonese (Chirp 3 HD). Safari cannot use iPhone Siri Voice 2. */
export async function synthesizeGoogleTts(
  text: string,
  lang: TtsLang,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const prepared = prepareSpokenText(text, lang)
  if (!prepared) throw new Error('無字')
  const key = (import.meta.env.VITE_GOOGLE_SPEECH_API_KEY as string | undefined)?.trim()
  if (!key) throw new Error('未設定 Google TTS')

  const settings = getVoiceSettings()
  const selectedVoice = lang === 'en-US' ? settings.enVoice : settings.yueVoice
  const speakingRate = settings.rate
  const ck = cacheKey(prepared, lang, selectedVoice, speakingRate)
  const hit = cache.get(ck)
  if (hit) return hit

  const languageCode = lang === 'en-US' ? 'en-US' : 'yue-HK'
  const fallbackVoices = lang === 'en-US' ? EN_VOICES : YUE_VOICES
  const voices = [selectedVoice, ...fallbackVoices.filter((voice) => voice !== selectedVoice)]
  const ssml = toSsml(prepared)
  const plain = toPlainSpoken(prepared, lang).slice(0, 4000)
  const inputs: Array<{ ssml?: string; text?: string }> = []
  if (ssml) inputs.push({ ssml })
  inputs.push({ text: plain })
  let lastErr = 'Google TTS 失敗'
  for (const voiceName of voices) {
    for (const input of inputs) {
      try {
        const bytes = await synthesizeOnce({
          ...input,
          languageCode,
          voiceName,
          speakingRate,
          apiKey: key,
          signal,
        })
        remember(ck, bytes)
        return bytes
      } catch (err) {
        lastErr = err instanceof Error ? err.message : lastErr
      }
    }
  }
  throw new Error(lastErr)
}
