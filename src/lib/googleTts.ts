export type TtsLang = 'zh-HK' | 'en-US'

export function isGoogleTtsConfigured(): boolean {
  const key = import.meta.env.VITE_GOOGLE_SPEECH_API_KEY as string | undefined
  return Boolean(key && key.trim())
}

const YUE_VOICES = ['yue-HK-Chirp3-HD-Kore', 'yue-HK-Standard-A']
const EN_VOICES = ['en-US-Chirp3-HD-Kore', 'en-US-Neural2-C', 'en-US-Standard-C']

const cache = new Map<string, Uint8Array>()
const CACHE_MAX = 40

function cacheKey(text: string, lang: TtsLang): string {
  return `${lang}:${text}`
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
  text: string
  languageCode: string
  voiceName: string
  apiKey: string
  signal?: AbortSignal
}): Promise<Uint8Array> {
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${opts.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text: opts.text },
      voice: { languageCode: opts.languageCode, name: opts.voiceName },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: opts.languageCode.startsWith('yue') ? 0.95 : 0.96,
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
  const trimmed = text.trim()
  if (!trimmed) throw new Error('無字')
  const key = (import.meta.env.VITE_GOOGLE_SPEECH_API_KEY as string | undefined)?.trim()
  if (!key) throw new Error('未設定 Google TTS')

  const ck = cacheKey(trimmed, lang)
  const hit = cache.get(ck)
  if (hit) return hit

  const languageCode = lang === 'en-US' ? 'en-US' : 'yue-HK'
  const voices = lang === 'en-US' ? EN_VOICES : YUE_VOICES
  let lastErr = 'Google TTS 失敗'
  for (const voiceName of voices) {
    try {
      const bytes = await synthesizeOnce({
        text: trimmed.slice(0, 4000),
        languageCode,
        voiceName,
        apiKey: key,
        signal,
      })
      remember(ck, bytes)
      return bytes
    } catch (err) {
      lastErr = err instanceof Error ? err.message : lastErr
    }
  }
  throw new Error(lastErr)
}
