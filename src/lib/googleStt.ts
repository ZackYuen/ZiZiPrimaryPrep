import { pcmToBase64, splitPcmByPauses } from './pcmCapture'

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

/** Map pause length → punctuation between utterances. */
export function punctuationForPause(pauseSec: number, language: GoogleSttLang): string {
  if (language === 'en-US') {
    if (pauseSec >= 0.9) return '. '
    if (pauseSec >= 0.35) return ', '
    return ' '
  }
  // Cantonese / Chinese
  if (pauseSec >= 0.9) return '。'
  if (pauseSec >= 0.35) return '，'
  return ''
}

function stripEdgePunct(text: string): string {
  return text.replace(/^[\s。．.，,、；;！!？?]+|[\s。．.，,、；;！!？?]+$/g, '').trim()
}

function ensureFinalStop(text: string, language: GoogleSttLang): string {
  const t = text.trim()
  if (!t) return t
  if (/[。．.！!？?]$/.test(t)) return t
  return language === 'en-US' ? `${t}.` : `${t}。`
}

function joinUtteranceTranscripts(
  parts: Array<{ text: string; pauseBeforeSec: number }>,
  language: GoogleSttLang,
): string {
  let out = ''
  for (const part of parts) {
    const piece = stripEdgePunct(part.text)
    if (!piece) continue
    if (!out) {
      out = piece
      continue
    }
    out += punctuationForPause(part.pauseBeforeSec, language) + piece
  }
  return ensureFinalStop(out, language)
}

async function recognizeOneBlob(opts: {
  pcm: Int16Array
  sampleRate: number
  languageCode: string
  models: string[]
  phrases: string[]
  apiKey: string
  signal?: AbortSignal
}): Promise<{ transcript: string; languageCode?: string }> {
  let lastErr = 'Google STT 失敗'
  const content = pcmToBase64(opts.pcm)
  for (const model of opts.models) {
    const res = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(opts.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: recognitionConfig({
            sampleRate: opts.sampleRate,
            languageCode: opts.languageCode,
            model,
            phrases: opts.phrases,
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
      if (/model|not support|INVALID_ARGUMENT/i.test(lastErr) && model !== opts.models[opts.models.length - 1]) {
        continue
      }
      throw new Error(lastErr)
    }
    const transcript = (data.results || [])
      .map((r) => r.alternatives?.[0]?.transcript || '')
      .join('')
      .trim()
    return {
      transcript,
      languageCode: data.results?.[0]?.languageCode || opts.languageCode,
    }
  }
  throw new Error(lastErr)
}

/**
 * Call Google Cloud Speech-to-Text.
 * Prefer VITE_GOOGLE_STT_URL (proxy) when available.
 * VITE_GOOGLE_SPEECH_API_KEY works without Cloudflare — restrict the key by
 * HTTP referrer to zackyuen.github.io/* before enabling on Pages.
 *
 * Splits on pauses and inserts ，/。 (or , / .) between utterances.
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
  const languageCode = opts.language === 'en-US' ? 'en-US' : 'yue-Hant-HK'
  const models = ['latest_short', 'default']
  const phrases = (opts.phrases || []).filter(Boolean).slice(0, 40)
  const utterances = splitPcmByPauses(opts.pcm, opts.sampleRate)

  if (proxyUrl) {
    // Proxy path: still split client-side, call once per utterance.
    const parts: Array<{ text: string; pauseBeforeSec: number }> = []
    let langOut = languageCode
    for (const u of utterances) {
      if (opts.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      const content = pcmToBase64(u.pcm)
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
      const text = (data.transcript || '').trim()
      if (text) {
        parts.push({ text, pauseBeforeSec: u.pauseBeforeSec })
        if (data.languageCode) langOut = data.languageCode
      }
    }
    const transcript = joinUtteranceTranscripts(parts, opts.language)
    if (!transcript) throw new Error('無字——再講大聲啲')
    return { transcript, languageCode: langOut }
  }

  if (!apiKey) {
    throw new Error('未設定 Google STT（VITE_GOOGLE_STT_URL 或 VITE_GOOGLE_SPEECH_API_KEY）。')
  }

  const parts: Array<{ text: string; pauseBeforeSec: number }> = []
  let langOut = languageCode
  for (const u of utterances) {
    if (opts.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const one = await recognizeOneBlob({
      pcm: u.pcm,
      sampleRate: opts.sampleRate,
      languageCode,
      models,
      phrases,
      apiKey,
      signal: opts.signal,
    })
    if (one.transcript.trim()) {
      parts.push({ text: one.transcript, pauseBeforeSec: u.pauseBeforeSec })
      if (one.languageCode) langOut = one.languageCode
    }
  }

  const transcript = joinUtteranceTranscripts(parts, opts.language)
  if (!transcript) throw new Error('無字——再講大聲啲')
  return { transcript, languageCode: langOut }
}
