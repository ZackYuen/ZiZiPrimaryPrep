import type { ActivityKind } from '../data/content'

/** Short full-screen cheer — then clear so the next question can proceed. */
export const CORRECT_CELEBRATION_MS = 1200

const SCORED_KINDS: ReadonlySet<ActivityKind> = new Set([
  'choice',
  'math',
  'clock',
  'money',
  'reorder',
  'sort',
  'tangram',
  'simon',
  'build',
  'memory',
  'place',
])

/**
 * Speak / 讀完啦 / parent checklist stay free of a covering overlay.
 * Last item uses the existing chapter finale instead.
 */
export function shouldCelebrateCorrect(kind: ActivityKind, isLast: boolean): boolean {
  return !isLast && SCORED_KINDS.has(kind)
}
