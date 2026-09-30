import type { Activity } from '../data/content'

function acceptedText(item: Activity) {
  return [item.answer, ...(item.answers ?? [])].filter(Boolean).join(' ')
}

/** Digit keys only — extras like `.` `/` appear when the accepted answer needs them. */
export function mathDigitKeys(item: Activity): string[] {
  const accepted = acceptedText(item)
  const needDot = accepted.includes('.')
  const needSlash = accepted.includes('/')
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
  if (needDot) keys.push('.')
  keys.push('0')
  if (needSlash) keys.push('/')
  return keys
}

export const CLOCK_DIGIT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ':', '0', '00'] as const
