import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isMicPermissionError,
  kidSttFromBrowserError,
  kidSttFromThrown,
  kidSttMessage,
} from './kidSttCopy.ts'

describe('kidSttFromBrowserError', () => {
  it('hands off to Google instead of 網頁聽寫唔得 when the key is baked', () => {
    const mapped = kidSttFromBrowserError('service-not-allowed', {
      apple: true,
      micOk: false,
      restartCount: 2,
      googleReady: true,
    })
    assert.equal(mapped.handoffGoogle, true)
    assert.equal(mapped.block, false)
    assert.equal(mapped.message, '')
    assert.notEqual(mapped.kind, 'service-blocked')
    assert.doesNotMatch(mapped.message, /網頁聽寫唔得/)
  })

  it('maps Safari service-not-allowed to service-blocked only without Google', () => {
    const mapped = kidSttFromBrowserError('service-not-allowed', {
      apple: true,
      micOk: false,
      restartCount: 2,
      googleReady: false,
    })
    assert.equal(mapped.kind, 'service-blocked')
    assert.equal(mapped.message, kidSttMessage('service-blocked'))
    assert.match(mapped.message, /網頁聽寫唔得/)
  })

  it('maps real mic denial to mic-permission, not service-blocked', () => {
    const mapped = kidSttFromBrowserError('not-allowed', {
      apple: true,
      micOk: false,
      restartCount: 0,
      googleReady: true,
    })
    assert.equal(mapped.kind, 'mic-permission')
    assert.equal(mapped.message, kidSttMessage('mic-permission'))
    assert.equal(mapped.handoffGoogle, undefined)
    assert.doesNotMatch(mapped.message, /網頁聽寫唔得/)
  })

  it('does not call a working mic a permission problem on Apple+Web Speech', () => {
    const mapped = kidSttFromBrowserError('not-allowed', {
      apple: true,
      micOk: true,
      restartCount: 2,
      googleReady: false,
    })
    assert.equal(mapped.kind, 'service-blocked')
  })

  it('hands off to Google when mic is already ok but Safari STT is blocked', () => {
    const mapped = kidSttFromBrowserError('audio-capture', {
      apple: true,
      micOk: true,
      restartCount: 2,
      googleReady: true,
    })
    assert.equal(mapped.handoffGoogle, true)
    assert.notEqual(mapped.kind, 'mic-permission')
    assert.notEqual(mapped.kind, 'service-blocked')
  })
})

describe('kidSttFromThrown', () => {
  it('uses mic-permission for NotAllowedError by name', () => {
    const err = new DOMException('The operation was denied', 'NotAllowedError')
    assert.equal(isMicPermissionError(err), true)
    assert.equal(kidSttFromThrown(err, { google: true }), kidSttMessage('mic-permission'))
  })

  it('does not treat Google referrer "not allowed" as a mic problem', () => {
    const err = new Error('Requests from referer https://zackyuen.github.io/ are not allowed.')
    assert.equal(isMicPermissionError(err), false)
    assert.equal(kidSttFromThrown(err, { google: true }), kidSttMessage('google-fail'))
    assert.doesNotMatch(kidSttFromThrown(err, { google: true }), /網頁聽寫唔得/)
    assert.doesNotMatch(kidSttFromThrown(err, { google: true }), /咪高峰/)
  })

  it('maps API key / 403 failures to google-fail, not service-blocked', () => {
    const err = new Error('API_KEY_HTTP_REFERRER_BLOCKED')
    assert.equal(kidSttFromThrown(err, { google: true }), kidSttMessage('google-fail'))
  })

  it('maps Failed to fetch to network copy', () => {
    assert.equal(
      kidSttFromThrown(new TypeError('Failed to fetch'), { google: true }),
      kidSttMessage('network'),
    )
  })

  it('never returns 網頁聽寫唔得 from thrown Google errors', () => {
    const samples = [
      new Error('Google STT 失敗（403）'),
      new Error('PERMISSION_DENIED'),
      new Error('未設定 Google STT'),
      new Error('something else'),
    ]
    for (const err of samples) {
      const msg = kidSttFromThrown(err, { google: true })
      assert.doesNotMatch(msg, /網頁聽寫唔得/)
    }
  })
})
