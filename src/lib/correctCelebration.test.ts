import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  CORRECT_CELEBRATION_MS,
  shouldCelebrateCorrect,
} from './correctCelebration.ts'
import type { ActivityKind } from '../data/content.ts'

describe('shouldCelebrateCorrect', () => {
  it('stays in the 1–1.5s window', () => {
    assert.ok(CORRECT_CELEBRATION_MS >= 1000)
    assert.ok(CORRECT_CELEBRATION_MS <= 1500)
  })

  it('fires on scored kinds, not on the last item', () => {
    const scored: ActivityKind[] = [
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
    ]
    for (const kind of scored) {
      assert.equal(shouldCelebrateCorrect(kind, false), true)
      assert.equal(shouldCelebrateCorrect(kind, true), false)
    }
  })

  it('does not cover ★ 講完啦 / 讀完啦 or parent checklist', () => {
    assert.equal(shouldCelebrateCorrect('speak', false), false)
    assert.equal(shouldCelebrateCorrect('prompt', false), false)
  })
})
