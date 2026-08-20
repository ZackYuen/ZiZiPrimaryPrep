export type SpeakLang = 'zh-HK' | 'en-US'

/** Internal pause; never shown on screen. Stripped before browser TTS. */
const PAUSE = '\u0001'

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Kid-friendly spoken form: skip blanks and don’t read punctuation names.
 * Underscores become a silent pause (not “underscore” / “ellipsis”).
 */
export function prepareSpokenText(raw: string, lang: SpeakLang): string {
  let s = raw.replace(/\u00a0/g, ' ').trim()
  if (!s) return ''

  // Fill-in blanks: ____ ＿＿ □ and similar underline runs
  s = s.replace(/[\s]*[＿_\uFF3F\u2017]{2,}[\s]*/g, PAUSE)
  s = s.replace(/□+/g, PAUSE)
  s = s.replace(/\.{3,}/g, PAUSE)
  s = s.replace(/…+/g, PAUSE)

  // UI / button symbols
  s = s.replace(/[▶►●■★☆✓✔✕×⌫$]/g, ' ')

  // Arrows / option slashes → pause, not “arrow” / “slash”
  s = s.replace(/\s*[→←➔➡︎⇒⇐]+\s*/g, PAUSE)
  s = s.replace(/／/g, PAUSE)

  if (lang === 'zh-HK') {
    s = s.replace(/(\d)\s*\+\s*(\d)/g, '$1 加 $2')
    s = s.replace(/\s*=\s*\?/g, ' 等於幾多')
    s = s.replace(/(\d)\s*=\s*(\d)/g, '$1 等於 $2')
  } else {
    s = s.replace(/(\d)\s*\+\s*(\d)/g, '$1 plus $2')
    s = s.replace(/\s*=\s*\?/g, ' equals what')
    s = s.replace(/(\d)\s*=\s*(\d)/g, '$1 equals $2')
  }
  s = s.replace(/\s*=\s*/g, PAUSE)

  s = s.replace(/[「」『』“”]/g, '')
  s = s.replace(/＋/g, ' ')
  s = s.replace(/－/g, ' ')

  s = s.replace(/\s+/g, ' ').trim()
  // Collapse extra pauses; keep trailing punctuation on the last word
  s = s.replace(new RegExp(`${PAUSE}+`, 'g'), PAUSE)
  s = s.replace(new RegExp(`${PAUSE}([.。!！?？,，])`, 'g'), '$1')
  return s
}

export function toPlainSpoken(prepared: string, lang: SpeakLang): string {
  const pause = lang === 'en-US' ? ', ' : '，'
  let s = prepared.split(PAUSE).join(pause)
  s = s.replace(/\s+/g, ' ')
  s = s.replace(/\s+([,，.。!！?？])/g, '$1')
  s = s.replace(/(?:,\s*){2,}/g, ', ')
  s = s.replace(/，+/g, '，')
  s = s.replace(/,\s*\./g, '.')
  s = s.replace(/，\s*。/g, '。')
  return s.trim()
}

/** Google TTS SSML with a short break at blanks. Empty if no blanks. */
export function toSsml(prepared: string): string {
  if (!prepared.includes(PAUSE)) return ''
  const body = prepared
    .split(PAUSE)
    .map((part) => escapeXml(part))
    .join('<break time="450ms"/>')
  return `<speak>${body}</speak>`
}
