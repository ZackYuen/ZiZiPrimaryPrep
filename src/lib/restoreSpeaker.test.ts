import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { schoolPlans } from '../data/schoolWeek.ts'
import {
  markMicSession,
  micSessionWasUsed,
  restoreSpeakerPlayback,
  silentWavBytes,
} from './restoreSpeaker.ts'

function evangelActivity(id: string) {
  const plan = schoolPlans.find((s) => s.id === 'evangel')
  const item = plan?.activities.find((a) => a.id === id)
  if (!item) throw new Error(`missing ${id}`)
  return item
}

describe('迷路的小狗 幾時', () => {
  it('states 星期日下午 in the playable story copy', () => {
    const listen = evangelActivity('evg-puppy-listen')
    const when = evangelActivity('evg-puppy-1')
    assert.match(String(listen.sampleZh), /^星期日下午/)
    assert.equal(when.listenToSample, true)
    assert.match(String(when.sampleZh), /^星期日下午/)
    assert.match(when.promptZh, /幾時/)
    const correct = when.choices?.find((c) => c.correct)
    assert.equal(correct?.text, '星期日下午')
  })
})

describe('silentWavBytes', () => {
  it('writes a valid tiny WAV header', () => {
    const bytes = silentWavBytes(80)
    const ascii = (start: number, n: number) =>
      String.fromCharCode(...bytes.slice(start, start + n))
    assert.equal(ascii(0, 4), 'RIFF')
    assert.equal(ascii(8, 4), 'WAVE')
    assert.ok(bytes.length > 44)
  })
})

describe('speaker restore flags', () => {
  it('clears pending after restore, and keeps pending if mic restarts mid-restore', async () => {
    markMicSession()
    assert.equal(micSessionWasUsed(), true)
    await restoreSpeakerPlayback()
    assert.equal(micSessionWasUsed(), false)

    markMicSession()
    const first = restoreSpeakerPlayback()
    markMicSession()
    await first
    assert.equal(micSessionWasUsed(), true)
    await restoreSpeakerPlayback()
    assert.equal(micSessionWasUsed(), false)
  })
})
