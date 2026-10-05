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
    assert.ok(plan.activities.length <= 30)
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
    for (const prefix of ['dbs-count-', 'dbs-safe-', 'dbs-chat-', 'dbs-use-', 'dbs-jigsaw-']) {
      assert.ok(ids.some((id) => id.startsWith(prefix)), prefix)
    }
  })

  it('counts with pictures only, up to five', () => {
    const counts = plan.activities.filter((a) => a.id.startsWith('dbs-count-'))
    assert.ok(counts.length >= 2)
    for (const item of counts) {
      const groups = item.pictureStrip ?? []
      assert.ok(groups.every((g) => g.count && g.count >= 1 && g.count <= 5), item.id)
      assert.equal(new Set(groups.map((g) => g.count)).size, groups.length, `${item.id} groups must differ`)
      assert.doesNotMatch(item.promptZh, /[0-9]/, `${item.id} should not need numerals`)
    }
    const more = plan.activities.find((a) => a.id === 'dbs-count-more')
    assert.equal(more?.choices?.length, 2)
  })

  it('situation items show three scenes with one safe answer', () => {
    for (const item of plan.activities.filter((a) => a.id.startsWith('dbs-safe-'))) {
      assert.equal(item.choices?.length, 3)
      assert.equal(item.choices?.filter((c) => c.correct).length, 1)
      assert.equal(item.sceneChoices, true)
    }
  })

  it('chat cards accept any answer and model a sentence', () => {
    const chats = plan.activities.filter((a) => a.id.startsWith('dbs-chat-'))
    assert.equal(chats.length, 3)
    for (const item of chats) {
      assert.equal(item.chatCard, true)
      assert.ok(item.choices?.every((c) => c.correct && c.say), item.id)
    }
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
      assert.ok((story.storyPics?.length ?? 0) >= 1)
      const answer = story.pictureStrip?.[story.choices?.findIndex((c) => c.correct) ?? -1]?.kidPic
      assert.ok(answer && !story.storyPics?.includes(answer), `${story.id} story picture gives the answer away`)
      const sentences = String(story.sampleZh)
        .split(/[。！？]/)
        .map((s) => s.trim())
        .filter(Boolean)
      assert.ok(sentences.length >= 2 && sentences.length <= 3, story.id)
    }
  })

  it('has a parent-only note that stays out of the quiz', () => {
    const note = plan.parentNote
    assert.ok(note, 'missing parent note')
    const text = [note.blurb, ...note.talkingPoints.map((p) => `${p.title} ${p.body}`)].join('\n')
    for (const must of [/10 月 8 至 10 日/, /中文同英文/, /夠鐘就停，唔緊要/, /冇玩具/, /坐定/, /可能有計時/, /兩分鐘/, /點解揀/, /補習/, /做錯/, /科技/, /唔怕難/, /好奇/, /瞓覺前/, /冇安排/, /語言/, /數感/, /追問/, /退出教育局/]) {
      assert.match(text, must)
    }
    assert.doesNotMatch(text, /\d{8}|QR|掃碼|學費|IBDP|\bIB\b|亞皆老|報名日期/)
    for (const item of plan.activities) {
      assert.doesNotMatch(childFacingText(item), /家長須知|兩分鐘|補習|退出教育局/)
    }
  })

  it('uses the shared watercolour plates, not drawn clip-art', () => {
    for (const item of plan.activities) {
      for (const pic of item.pictureStrip ?? []) {
        assert.ok(pic.kidPic, `${item.id} picture missing art`)
      }
    }
    const place = plan.activities.filter((a) => a.kind === 'place')
    assert.ok(place.length >= 1)
    for (const item of place) assert.match(item.promptZh, /星星/)
  })
})

