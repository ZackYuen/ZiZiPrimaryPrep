import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { checkClock, days, type Activity } from '../data/content.ts'
import { parseMathModel, resolveTeachHint } from './teachHint.ts'
import {
  clockFaceFor,
  clockPlaceholder,
  looksLikeClockPrompt,
  padKind,
  sessionKind,
} from './activityKind.ts'

function byId(id: string): Activity {
  for (const day of days) {
    const found = day.activities.find((a) => a.id === id)
    if (found) return found
  }
  throw new Error(`missing ${id}`)
}

describe('clock vs math item kinds', () => {
  it('treats time-after-hours / 幾時 / 24小時制 as clock prompts', () => {
    assert.equal(
      looksLikeClockPrompt('而家係 10 時，3 小時之後係幾時？（用 24 小時制數字，例如 13）'),
      true,
    )
    assert.equal(looksLikeClockPrompt('而家係 3 時，2 小時之後係幾點？'), true)
    assert.equal(looksLikeClockPrompt('而家係 11 時，3 小時之後係幾點？（24 小時制數字）'), true)
    assert.equal(looksLikeClockPrompt('而家係 2:30，30 分鐘之後係幾點幾分？打時間，例如 3:00。'), true)
    assert.equal(looksLikeClockPrompt('睇吓鐘面，而家係幾點幾分？用數字打，例如 7:30。'), true)
  })

  it('does not treat count math, money, calendar, or speak 幾時 as clock', () => {
    assert.equal(looksLikeClockPrompt('20 以內加法：8 + 5 = ?'), false)
    assert.equal(looksLikeClockPrompt('小明有 8 粒糖，媽媽再俾佢 5 粒，佢而家有幾多粒？'), false)
    assert.equal(looksLikeClockPrompt('一班 14 人，二班 9 人，一班多幾多人？'), false)
    assert.equal(looksLikeClockPrompt('買 4.6 元麵包 + 2.5 元牛奶，一共幾多元？（小數）'), false)
    assert.equal(looksLikeClockPrompt('今日係 6 月 8 日，3 日之後係幾月幾日？打「月/日」。'), false)
    assert.equal(looksLikeClockPrompt('故仔發生喺幾時？'), false)
    assert.equal(looksLikeClockPrompt('講一次出去玩嘅事。跟提示講：幾時、邊個、邊度、做咩、點解、心情。'), false)
  })

  it('Day 6 閱讀複習 time item uses clock pad, analog 10:00, and accepts 13', () => {
    const item = byId('d6-r1')
    assert.equal(item.kind, 'clock')
    assert.equal(padKind(item), 'clock')
    assert.equal(sessionKind(item), 'clock')
    assert.deepEqual(clockFaceFor(item), { hour: 10, minute: 0 })
    assert.equal(clockPlaceholder(item), '?')
    assert.equal(parseMathModel(item.promptZh), undefined)
    assert.equal(resolveTeachHint(item).visual, 'clock')
    assert.equal(resolveTeachHint(item).math, undefined)
    assert.equal(checkClock(item, '13'), true)
    assert.equal(checkClock(item, '13:00'), true)
    assert.equal(checkClock(item, '1300'), true)
    assert.equal(checkClock(item, '1'), false)
    assert.equal(checkClock(item, '10'), false)
  })

  it('Day 4 hour-after items are clock, not 數一數 math', () => {
    const t1 = byId('d4-t1')
    const t1b = byId('d4-t1b')
    assert.equal(padKind(t1), 'clock')
    assert.equal(padKind(t1b), 'clock')
    assert.deepEqual(clockFaceFor(t1), { hour: 3, minute: 0 })
    assert.deepEqual(clockFaceFor(t1b), { hour: 11, minute: 0 })
    assert.equal(checkClock(t1, '5'), true)
    assert.equal(checkClock(t1, '5:00'), true)
    assert.equal(checkClock(t1b, '14'), true)
    assert.equal(checkClock(t1b, '14:00'), true)
    assert.equal(parseMathModel(t1.promptZh), undefined)
    assert.equal(parseMathModel(t1b.promptZh), undefined)
  })

  it('minute-after clock items keep HH:MM keypad placeholder', () => {
    const item = byId('d4-t2')
    assert.equal(padKind(item), 'clock')
    assert.equal(clockPlaceholder(item), '__:__')
    assert.deepEqual(clockFaceFor(item), { hour: 2, minute: 30 })
    assert.equal(checkClock(item, '3:00'), true)
  })

  it('pure count math still uses the numeric keypad', () => {
    const add = byId('d1-m1')
    const sweets = byId('d2-m1')
    const moreKids = byId('d6-r3b')
    assert.equal(padKind(add), 'math')
    assert.equal(padKind(sweets), 'math')
    assert.equal(padKind(moreKids), 'math')
    assert.equal(sessionKind(add), 'math')
    assert.equal(clockFaceFor(add), undefined)
  })

  it('infers clock UI even if a time item is still tagged math', () => {
    const stray: Activity = {
      id: 'stray-time',
      kind: 'math',
      level: 1,
      cue: '複習',
      promptZh: '而家係 9 時，2 小時之後係幾時？（用 24 小時制數字，例如 13）',
      answer: '11',
    }
    assert.equal(padKind(stray), 'clock')
    assert.deepEqual(clockFaceFor(stray), { hour: 9, minute: 0 })
    assert.equal(parseMathModel(stray.promptZh), undefined)
    assert.equal(resolveTeachHint(stray).visual, 'clock')
  })
})
