import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { softSpeakFeedback } from './softSpeakFeedback.ts'

describe('softSpeakFeedback parent tip', () => {
  it('keeps the full STT parent sentence so phones can wrap/scroll it', () => {
    const fb = softSpeakFeedback('我。', '我叫袁碩孜。', 'zh', true)
    assert.ok(fb)
    assert.match(fb.message, /電話未必聽得準童聲/)
    assert.match(fb.message, /請爸爸媽媽判斷/)
    assert.match(fb.message, /\n/)
    assert.doesNotMatch(fb.message, /請爸爸媽$/)
  })
})
