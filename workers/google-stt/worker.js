/**
 * Cloudflare Worker proxy for Google Cloud Speech-to-Text.
 *
 * Deploy:
 *   cd workers/google-stt
 *   npx wrangler secret put GOOGLE_SPEECH_API_KEY
 *   npx wrangler deploy
 *
 * Then set in the app build:
 *   VITE_GOOGLE_STT_URL=https://<your-worker>.workers.dev
 *
 * Enables CORS for the GitHub Pages origin only.
 */

const ALLOWED_ORIGINS = [
  'https://zackyuen.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const headers = corsHeaders(origin)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers })
    }

    if (request.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405, headers })
    }

    if (!env.GOOGLE_SPEECH_API_KEY) {
      return Response.json({ error: 'Server missing GOOGLE_SPEECH_API_KEY' }, { status: 500, headers })
    }

    let payload
    try {
      payload = await request.json()
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400, headers })
    }

    const content = payload?.content
    const sampleRateHertz = Number(payload?.sampleRateHertz) || 16000
    const languageCode = payload?.languageCode || 'yue-Hant-HK'
    const model = payload?.model || 'latest_short'
    const phrases = Array.isArray(payload?.phrases)
      ? payload.phrases.filter((p) => typeof p === 'string' && p.length >= 2).slice(0, 40)
      : []

    if (!content || typeof content !== 'string') {
      return Response.json({ error: 'Missing audio content' }, { status: 400, headers })
    }

    // Keep payloads reasonable for kids' short answers (~60s @ 16kHz mono 16-bit ≈ 1.9MB base64).
    if (content.length > 3_500_000) {
      return Response.json({ error: 'Audio too long' }, { status: 413, headers })
    }

    const config = {
      encoding: 'LINEAR16',
      sampleRateHertz,
      languageCode,
      // Do not set alternativeLanguageCodes — zh-* alternatives hurt Cantonese.
      enableAutomaticPunctuation: true,
      model,
      audioChannelCount: 1,
      maxAlternatives: 1,
    }
    if (phrases.length) {
      config.speechContexts = [{ phrases, boost: 15 }]
    }

    const googleRes = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${encodeURIComponent(env.GOOGLE_SPEECH_API_KEY)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config,
          audio: { content },
        }),
      },
    )

    const data = await googleRes.json().catch(() => ({}))
    if (!googleRes.ok) {
      return Response.json(
        { error: data?.error?.message || `Google API ${googleRes.status}` },
        { status: googleRes.status, headers },
      )
    }

    const transcript = (data.results || [])
      .map((r) => (r.alternatives && r.alternatives[0] && r.alternatives[0].transcript) || '')
      .join('')
      .trim()

    return Response.json(
      {
        transcript,
        languageCode: (data.results && data.results[0] && data.results[0].languageCode) || languageCode,
      },
      { headers },
    )
  },
}
