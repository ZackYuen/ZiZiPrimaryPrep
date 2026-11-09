import type { Activity, ActivityKind } from '../data/content.ts'
import { getSchool, type SchoolId } from '../data/schoolWeek.ts'
import { childFacingText, kidCanAnswerWithoutReading } from './dbsPractice.ts'

export const ROUND2_KID_KINDS: readonly ActivityKind[] = ['choice', 'prompt']

export const WKF2_FORBIDDEN_CHILD_COPY =
  /QR|掃碼|安睦|石門|301|271-3932|家長面談|辦學理念|面試班|樂器|投訴|直資|一條龍|學費|16:00|申請編號|下午 4/i

export const JANDO2_FORBIDDEN_CHILD_COPY =
  /D006|嶺光|將軍澳|十一年|2-5-4|一條龍|家長面談|面試班|辦學|委身|家校|8 時|禮堂/i

export function round2Plan(id: Extract<SchoolId, 'wkf2' | 'jando2'>) {
  const plan = getSchool(id)
  if (!plan) throw new Error(`missing ${id} school plan`)
  return plan
}

export function round2ChildText(item: Activity): string {
  return childFacingText(item)
}

export function round2KidCanAnswerWithoutReading(item: Activity): boolean {
  if (item.kind === 'prompt') {
    return !!item.parentCheck && !!item.autoSpeak && !!item.hintKidPic && !item.readAloud
  }
  return kidCanAnswerWithoutReading(item)
}

export { childFacingText }
