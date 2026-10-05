import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  childFacingText,
  dbsPlan,
  DBS_FORBIDDEN_CHILD_COPY,
  DBS_KID_KINDS,
  kidCanAnswerWithoutReading,
} from './dbsPractice.ts'

describe('男拔面試練習', () => {
  const plan = dbsPlan()

  it('is a parent-recognisable short session', () => {
    assert.match(plan.title, /男拔面試練習/)
    assert.ok(plan.activities.length >= 8)
    assert.ok(plan.activities.length <= 20)
  })

  it('covers the kid skill shapes with original items', () => {
    const ids = plan.activities.map((a) => a.id)
    assert.ok(ids.some((id) => id.startsWith('dbs-pose-')))
    assert.ok(ids.some((id) => id.startsWith('dbs-sort-')))
    assert.ok(ids.some((id) => id.startsWith('dbs-place-')))
    assert.ok(ids.some((id) => id.startsWith('dbs-missing-')))
    assert.ok(ids.some((id) => id.startsWith('dbs-shadow-')))
    assert.ok(ids.some((id) => id.startsWith('dbs-story-')))
    assert.ok(ids.some((id) => id.startsWith('dbs-pic-')))
    assert.ok(ids.some((id) => id.startsWith('dbs-say-')))
    assert.ok(ids.some((id) => id.startsWith('dbs-en-')))
  })

  it('lets a non-reader finish every item from voice and pictures', () => {
    for (const item of plan.activities) {
      assert.ok(DBS_KID_KINDS.includes(item.kind), `${item.id} kind ${item.kind}`)
      assert.equal(item.autoSpeak, true, `${item.id} should auto-speak`)
      assert.equal(item.readAloud, undefined, `${item.id} must not be a character card`)
      assert.equal(item.lookSeconds, undefined, `${item.id} must not use a fail timer`)
      assert.ok(kidCanAnswerWithoutReading(item), `${item.id} still needs reading`)
      if (item.choices) {
        assert.ok(item.choices.length >= 2 && item.choices.length <= 4, `${item.id} choice count`)
      }
      if (item.kind === 'sort') {
        assert.equal(item.buckets?.length, 2)
        assert.ok((item.sortItems?.length ?? 0) <= 4)
      }
    }
  })

  it('does not turn school facts, fees, or parent Q&A into child items', () => {
    for (const item of plan.activities) {
      const text = childFacingText(item)
      assert.equal(DBS_FORBIDDEN_CHILD_COPY.test(text), false, `${item.id}: ${text}`)
    }
    const stories = plan.activities.filter((a) => a.id.startsWith('dbs-story-'))
    assert.ok(stories.length >= 1)
    for (const story of stories) {
      assert.equal(story.hideStoryText, true)
      assert.ok((story.storyPics?.length ?? 0) >= 2)
      const sentences = String(story.sampleZh)
        .split(/[。！？]/)
        .map((s) => s.trim())
        .filter(Boolean)
      assert.ok(sentences.length >= 2 && sentences.length <= 3, story.id)
    }
  })
})
