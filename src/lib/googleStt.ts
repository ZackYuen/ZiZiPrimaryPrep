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

/**
 * Call Google Cloud Speech-to-Text.
 * Prefer VITE_GOOGLE_STT_URL (Cloudflare Worker / proxy) so the API key stays secret.
 * Optional VITE_GOOGLE_SPEECH_API_KEY is for local/dev only (referrer-restrict it).
 */
export async function recognizeWithGoogle(opts: {
  pcm: Int16Array
  sampleRate: number
  language: GoogleSttLang
  signal?: AbortSignal
}): Promise<RecognizeResult> {
  const proxyUrl = (import.meta.env.VITE_GOOGLE_STT_URL as string | undefined)?.trim()
  const apiKey = (import.meta.env.VITE_GOOGLE_SPEECH_API_KEY as string | undefined)?.trim()
  const content = pcmToBase64(opts.pcm)
  const languageCode = opts.language === 'en-US' ? 'en-US' : 'yue-Hant-HK'
  const alternativeLanguageCodes =
    opts.language === 'en-US' ? ['en-GB', 'en-HK'] : ['yue-HK', 'zh-HK', 'zh-TW']

  const body = {
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: opts.sampleRate,
      languageCode,
      alternativeLanguageCodes,
      enableAutomaticPunctuation: true,
      model: 'default',
      audioChannelCount: 1,
    },
    audio: { content },
  }

  if (proxyUrl) {
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        languageCode,
        alternativeLanguageCodes,
        sampleRateHertz: opts.sampleRate,
        content,
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
    if (!transcript) throw new Error('Google 聽寫無字——請再講大聲啲。')
    return { transcript, languageCode: data.languageCode || languageCode }
  }

  if (!apiKey) {
    throw new Error('未設定 Google STT（VITE_GOOGLE_STT_URL 或 VITE_GOOGLE_SPEECH_API_KEY）。')
  }

  const res = await fetch(
    `https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
    throw new Error(data.error?.message || `Google STT 失敗（${res.status}）`)
  }
  const transcript = (data.results || [])
    .map((r) => r.alternatives?.[0]?.transcript || '')
    .join('')
    .trim()
  if (!transcript) throw new Error('Google 聽寫無字——請再講大聲啲。')
  return {
    transcript,
    languageCode: data.results?.[0]?.languageCode || languageCode,
  }
}
