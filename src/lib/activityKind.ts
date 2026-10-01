import type { Activity, ActivityKind } from '../data/content'

/** Clock / elapsed-time wording — not count-math and not speak “幾時／邊個”. */
export function looksLikeClockPrompt(prompt: string): boolean {
  const p = prompt
  if (/鐘面|幾點幾分|小時之後|小時後|分鐘之後|分鐘後/.test(p)) return true
  if (/24\s*小時制/.test(p)) return true
  if (/而家係/.test(p) && /幾時|幾點/.test(p)) return true
  return false
}

export function looksLikeClockItem(item: Activity): boolean {
  if (item.kind === 'clock' || item.clock) return true
  if (item.kind === 'math' && looksLikeClockPrompt(item.promptZh)) return true
  return false
}

/**
 * How the kid answers: explicit kind, else infer clock from the prompt so
 * time-after-N-hours items are not treated as 數一數 count math.
 */
export function padKind(item: Activity): 'math' | 'clock' | 'money' | null {
  if (item.kind === 'money' || item.coins) return 'money'
  if (looksLikeClockItem(item)) return 'clock'
  if (item.kind === 'math') return 'math'
  return null
}

export function sessionKind(item: Activity): ActivityKind {
  return padKind(item) ?? item.kind
}

/** Analog face for “而家係 10 時 / 2:30”, or the tagged `clock` field. */
export function clockFaceFor(item: Activity): { hour: number; minute: number } | undefined {
  if (item.clock) return item.clock
  const m = /而家係\s*(\d{1,2})(?::(\d{2})|\s*[時点點])/.exec(item.promptZh)
  if (!m) return undefined
  const hour = Number(m[1])
  const minute = m[2] != null ? Number(m[2]) : 0
  if (!Number.isFinite(hour) || hour < 0 || hour > 23) return undefined
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return undefined
  return { hour, minute }
}

export function clockPlaceholder(item: Activity): string {
  const ans = item.answer ?? ''
  if (/^\d{1,2}:\d{1,2}$/.test(ans)) return '__:__'
  return '?'
}
