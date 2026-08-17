export type SpeakLang = 'zh-HK' | 'en-US'

/** Kid-friendly spoken form: skip blanks, don't read UI symbols or punctuation names. */
export function prepareSpokenText(raw: string, lang: SpeakLang): string {
  let s = raw.replace(/\u00a0/g, ' ').trim()
  if (!s) return ''

  // Fill-in blanks (____ / ＿＿ / □) → a short pause, never “underscore”.
  s = s.replace(/[＿_]{2,}/g, '…')
  s = s.replace(/□+/g, '…')
  s = s.replace(/\.{3,}/g, '…')
  s = s.replace(/…+/g, '…')

  // UI / button symbols
  s = s.replace(/[▶►●■★☆✓✔✕×⌫$]/g, ' ')

  // Arrows: “then”, not “right arrow”
  s = s.replace(/\s*[→←➔➡︎⇒⇐]+\s*/g, '，')

  // Slash between options: pause, not “slash”
  s = s.replace(/／/g, '，')

  // Math: only ascii + / = next to digits
  if (lang === 'zh-HK') {
    s = s.replace(/(\d)\s*\+\s*(\d)/g, '$1 加 $2')
    s = s.replace(/\s*=\s*\?/g, ' 等於幾多')
    s = s.replace(/(\d)\s*=\s*(\d)/g, '$1 等於 $2')
  } else {
    s = s.replace(/(\d)\s*\+\s*(\d)/g, '$1 plus $2')
    s = s.replace(/\s*=\s*\?/g, ' equals what')
    s = s.replace(/(\d)\s*=\s*(\d)/g, '$1 equals $2')
  }
  // “Raise your hand = 舉手” → pause, not “equals”
  s = s.replace(/\s*=\s*/g, '，')

  // Quotes used as emphasis — keep the words, drop the marks
  s = s.replace(/[「」『』“”]/g, '')

  // Fullwidth plus/minus used as bucket labels, not math
  s = s.replace(/＋/g, ' ')
  s = s.replace(/－/g, ' ')

  s = s.replace(/\s+/g, ' ').replace(/\s+([，。！？、,.!?…])/g, '$1').trim()
  s = s.replace(/…([^\s，。！？,.!?])/g, '… $1')
  return s
}
