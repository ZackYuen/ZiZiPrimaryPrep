const EN_STOP = new Set([
  'the',
  'and',
  'because',
  'with',
  'you',
  'for',
  'are',
  'was',
  'have',
  'this',
  'that',
  'like',
  'want',
  'can',
  'my',
  'to',
  'a',
  'i',
  'it',
  'is',
  'in',
  'of',
  'be',
  'we',
  'me',
  'am',
  'do',
  'on',
  'at',
  'or',
  'an',
])

export type SoftSpeakFeedback = {
  matched: string[]
  missing: string[]
  message: string
}

function extractZhKeys(sample: string): string[] {
  const parts = sample
    .split(/[。．，,、！？!?\s；;：:]+/)
    .map((p) => p.trim())
    .filter((p) => p.length >= 2 && p.length <= 10 && /[\u4e00-\u9fff]/.test(p))

  // Also pull a few 2–3 char content words from longer chunks
  const extras: string[] = []
  for (const p of parts) {
    if (p.length >= 4) {
      for (let i = 0; i < p.length - 1 && extras.length < 4; i++) {
        const bi = p.slice(i, i + 2)
        if (/^[\u4e00-\u9fff]{2}$/.test(bi)) extras.push(bi)
      }
    }
  }

  const preferred = ['因為', '喜歡', '鍾意', '幼稚園', '開心', '多謝', '老師', '爸爸', '媽媽', '歲']
  const merged = [...preferred.filter((k) => sample.includes(k)), ...parts, ...extras]
  return [...new Set(merged)].slice(0, 8)
}

function extractEnKeys(sample: string): string[] {
  const words = (sample.toLowerCase().match(/[a-z']+/g) ?? []).filter(
    (w) => w.length >= 3 && !EN_STOP.has(w),
  )
  return [...new Set(words)].slice(0, 8)
}

/** Gentle keyword overlap — never used as a hard pass/fail gate. */
export function softSpeakFeedback(
  transcript: string,
  sample: string | undefined,
  lang: 'zh' | 'en',
): SoftSpeakFeedback | null {
  const heard = transcript.trim()
  if (!heard || !sample?.trim()) return null

  const keys = lang === 'en' ? extractEnKeys(sample) : extractZhKeys(sample)
  if (keys.length === 0) return null

  const normHeard = lang === 'en' ? heard.toLowerCase() : heard
  const matched = keys.filter((k) => normHeard.includes(lang === 'en' ? k.toLowerCase() : k))
  const missing = keys.filter((k) => !matched.includes(k)).slice(0, 3)

  if (matched.length === 0) {
    return {
      matched,
      missing,
      message: '電話未必聽得準童聲——唔緊要，請爸爸媽媽判斷。',
    }
  }

  if (missing.length === 0) {
    return {
      matched,
      missing,
      message: '聽到好多重點喇！差唔多啦～',
    }
  }

  return {
    matched,
    missing,
    message: `聽到：${matched.slice(0, 4).join('、')}。可以再試講：${missing.join('、')}`,
  }
}
