import type { Activity, ActivityKind, PlaceCell } from '../data/content.ts'
import { getSchool } from '../data/schoolWeek.ts'

/** Skill shapes a K3 non-reader can finish from voice + pictures. */
export const DBS_KID_KINDS: readonly ActivityKind[] = ['choice', 'sort', 'place', 'speak']

/**
 * Commercial parent-group notes leaked school facts / parent Q&A.
 * Child-facing copy must stay original and must not teach those facts.
 */
export const DBS_FORBIDDEN_CHILD_COPY =
  /學費|IBDP|\bIB\b|\bDSE\b|亞皆老|62767174|Dominus|Bonitas|Sapientia|一條龍|直資|點解揀呢間|為什麼選|家長面談|QR|掃碼|學而思/i

export function dbsPlan() {
  const plan = getSchool('dbs')
  if (!plan) throw new Error('missing dbs school plan')
  return plan
}

export function childFacingText(item: Activity): string {
  const choiceText = (item.choices ?? []).map((c) => c.text).join(' ')
  const sortText = (item.sortItems ?? []).map((s) => `${s.text} ${s.bucket}`).join(' ')
  return [
    item.promptZh,
    item.promptEn,
    item.sampleZh,
    item.sampleEn,
    item.tip,
    item.cue,
    choiceText,
    sortText,
    item.lookThen?.promptZh,
  ]
    .filter(Boolean)
    .join('\n')
}

export const PLACE_CELLS: readonly PlaceCell[] = ['tl', 'tr', 'bl', 'br']

export function isPlaceCell(value: string): value is PlaceCell {
  return (PLACE_CELLS as readonly string[]).includes(value)
}

export function kidCanAnswerWithoutReading(item: Activity): boolean {
  if (item.kind === 'place') return !!item.place && isPlaceCell(item.place.target)
  if (item.kind === 'sort') {
    return !!item.instantSort && !!item.sortItems?.every((s) => s.kidPic) && !!item.bucketLooks
  }
  if (item.kind === 'choice') {
    const pics = item.pictureStrip ?? []
    const choices = item.choices ?? []
    return (
      pics.length === choices.length &&
      pics.length >= 2 &&
      pics.length <= 4 &&
      pics.every((p) => !!p.kidPic) &&
      !!item.hideChoiceWords &&
      !!item.autoSpeak
    )
  }
  if (item.kind === 'speak') {
    return !!item.autoSpeak && !!item.hintKidPic && !item.readAloud
  }
  return false
}
