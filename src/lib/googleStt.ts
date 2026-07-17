import { pcmToBase64 } from './pcmCapture'

export type GoogleSttLang = 'yue-Hant-HK' | 'en-US'

export function isGoogleSttConfigured(): boolean {
  const url = import.meta.env.VITE_GOOGLE_STT_URL as string | undefined
  const key = import.meta.env.VITE_GOOGLE_SPEECH_API_KEY as string | undefined
  return Boolean((url && url.trim()) || (key && key.trim()))
}

type RecognizeResult = {
  transcript: string
  languageCode?: string
}

/** Keep phrase hints short for Google speechContexts limits. */
export function buildSttPhrases(parts: Array<string | undefined | null>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const part of parts) {
    if (!part) continue
    const chunks = part
      .split(/[。！？!?\n；;，,、．.]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2 && s.length <= 100)
    for (const c of chunks) {
      if (seen.has(c)) continue
      seen.add(c)
      out.push(c)
      if (out.length >= 40) return out
    }
  }
  return out
}

function recognitionConfig(opts: {
  sampleRate: number
  languageCode: string
  model: string
  phrases: string[]
}) {
  const config: Record<string, unknown> = {
    encoding: 'LINEAR16',
    sampleRateHertz: opts.sampleRate,
    languageCode: opts.languageCode,
    // Single language only — alternativeLanguageCodes with zh-HK/zh-TW often
    // steers Google toward Mandarin and hurts Cantonese accuracy.
    enableAutomaticPunctuation: true,
    model: opts.model,
    audioChannelCount: 1,
    maxAlternatives: 1,
  }
  if (opts.phrases.length) {
    config.speechContexts = [
      {
        phrases: opts.phrases,
        boost: 15,
      },
    ]
  }
  return config
}

/**
 * Call Google Cloud Speech-to-Text.
 * Prefer VITE_GOOGLE_STT_URL (proxy) when available.
 * VITE_GOOGLE_SPEECH_API_KEY works without Cloudflare — restrict the key by
 * HTTP referrer to zackyuen.github.io/* before enabling on Pages.
 */
export async function recognizeWithGoogle(opts: {
  pcm: Int16Array
  sampleRate: number
  language: GoogleSttLang
  phrases?: string[]
  signal?: AbortSignal
}): Promise<RecognizeResult> {
  const proxyUrl = (import.meta.env.VITE_GOOGLE_STT_URL as string | undefined)?.trim()
  const apiKey = (import.meta.env.VITE_GOOGLE_SPEECH_API_KEY as string | undefined)?.trim()
  const content = pcmToBase64(opts.pcm)
  const languageCode = opts.language === 'en-US' ? 'en-US' : 'yue-Hant-HK'
  // Kid answers are short directed speech → latest_short; fall back to default.
  const models = opts.language === 'en-US' ? ['latest_short', 'default'] : ['latest_short', 'default']
  const phrases = (opts.phrases || []).filter(Boolean).slice(0, 40)

  if (proxyUrl) {
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        languageCode,
        sampleRateHertz: opts.sampleRate,
        content,
        model: models[0],
        phrases,
      }),
      signal: opts.signal,
    })
    const data = (await res.json().catch(() => ({}))) as {
      transcript?: string
      error?: string
      languageCode?: string
    }
    if (!res.ok) {
      throw new Error(data.error || `Google STT 失敗（${res.status}）`)
    }
    const transcript = (data.transcript || '').trim()
    if (!transcript) throw new Error('無字——再講大聲啲')
    return { transcript, languageCode: data.languageCode || languageCode }
  }

  if (!apiKey) {
    throw new Error('未設定 Google STT（VITE_GOOGLE_STT_URL 或 VITE_GOOGLE_SPEECH_API_KEY）。')
  }

  let lastErr = 'Google STT 失敗'
  for (const model of models) {
    const res = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: recognitionConfig({
            sampleRate: opts.sampleRate,
            languageCode,
            model,
            phrases,
          }),
          audio: { content },
        }),
        signal: opts.signal,
      },
    )
    const data = (await res.json().catch(() => ({}))) as {
      error?: { message?: string }
      results?: Array<{
        alternatives?: Array<{ transcript?: string }>
        languageCode?: string
      }>
    }
    if (!res.ok) {
      lastErr = data.error?.message || `Google STT 失敗（${res.status}）`
      // Retry next model if this one is unsupported for the language.
      if (/model|not support|INVALID_ARGUMENT/i.test(lastErr) && model !== models[models.length - 1]) {
        continue
      }
      throw new Error(lastErr)
    }
    const transcript = (data.results || [])
      .map((r) => r.alternatives?.[0]?.transcript || '')
      .join('')
      .trim()
    if (!transcript) throw new Error('無字——再講大聲啲')
    return {
      transcript,
      languageCode: data.results?.[0]?.languageCode || languageCode,
    }
  }

  throw new Error(lastErr)
}
