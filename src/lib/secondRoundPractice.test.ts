import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Activity, KidPicId } from '../data/content.ts'
import { getSchool } from '../data/schoolWeek.ts'
import { kidPicFile } from './kidPicArt.ts'
import {
  JANDO2_FORBIDDEN_CHILD_COPY,
  ROUND2_KID_KINDS,
  round2ChildText,
  round2KidCanAnswerWithoutReading,
  round2Plan,
  WKF2_FORBIDDEN_CHILD_COPY,
} from './secondRoundPractice.ts'

const ROUND2_KEEP_SHARED: ReadonlySet<KidPicId> = new Set(['star', 'stand', 'sit', 'foot'])

function round2KidPics(item: Activity): KidPicId[] {
  const ids: KidPicId[] = []
  if (item.hintKidPic) ids.push(item.hintKidPic)
  if (item.hintCount?.pic) ids.push(item.hintCount.pic)
  ids.push(...(item.storyPics ?? []))
  for (const pic of item.pictureStrip ?? []) {
    if (pic.kidPic) ids.push(pic.kidPic)
  }
  return ids
}

describe('王錦輝二輪 playable stations', () => {
  const plan = round2Plan('wkf2')

  it('is a parent-recognisable short session on the home card', () => {
    assert.equal(plan.title, '王錦輝二輪')
    assert.match(plan.subtitle, /親子面談練習/)
    assert.ok(plan.activities.length >= 8)
    assert.ok(plan.activities.length <= 20)
  })

  it('covers the five practical stations with tap tasks', () => {
    const ids = plan.activities.map((a) => a.id)
    assert.ok(ids.some((id) => id.startsWith('wkf2-book-')))
    assert.ok(ids.some((id) => id.startsWith('wkf2-look-')))
    assert.ok(ids.some((id) => id.startsWith('wkf2-do-')))
    assert.ok(ids.some((id) => id.startsWith('wkf2-en-')))
    assert.ok(ids.some((id) => id.startsWith('wkf2-help-')))
    assert.deepEqual(
      [...new Set(plan.activities.map((a) => a.section))],
      ['揀書講故事', '看圖講三句', '聽指令做', '簡單英文', '幫朋友'],
    )
  })

  it('lets the child pick a book cover then answer who / what / why with pictures', () => {
    const pick = plan.activities.find((a) => a.id === 'wkf2-book-pick')
    assert.equal(pick?.chatCard, true)
    assert.equal(pick?.pictureStrip?.length, 4)
    assert.ok(pick?.choices?.every((c) => c.correct))
    const beats = ['wkf2-book-who', 'wkf2-book-what', 'wkf2-book-why'].map((id) =>
      plan.activities.find((a) => a.id === id),
    )
    for (const item of beats) {
      assert.ok(item, 'missing story beat')
      assert.equal(item?.kind, 'choice')
      assert.equal(item?.choices?.filter((c) => c.correct).length, 1)
      assert.ok((item?.pictureStrip?.length ?? 0) >= 2)
      assert.equal(item?.hideStoryText, true)
    }
  })

  it('asks three look-and-tell picture questions about one scene', () => {
    const looks = plan.activities.filter((a) => a.id.startsWith('wkf2-look-'))
    assert.equal(looks.length, 3)
    for (const item of looks) {
      assert.equal(item.hintKidPic, 'r2-park')
      assert.ok((item.pictureStrip?.length ?? 0) >= 2)
      assert.ok((item.pictureStrip?.length ?? 0) <= 3)
    }
  })

  it('uses parent 做到 / 再試 for 踏步 停 企好', () => {
    const moves = ['wkf2-do-step', 'wkf2-do-stop', 'wkf2-do-stand'].map((id) =>
      plan.activities.find((a) => a.id === id),
    )
    assert.equal(moves.length, 3)
    for (const item of moves) {
      assert.equal(item?.kind, 'prompt')
      assert.equal(item?.parentCheck, true)
      assert.ok(item?.hintKidPic)
      assert.equal(item?.autoSpeak, true)
    }
  })

  it('has English name tap plus I like follow-along', () => {
    const name = plan.activities.find((a) => a.id === 'wkf2-en-name')
    const like = plan.activities.find((a) => a.id === 'wkf2-en-like')
    assert.ok(name?.choices?.some((c) => c.correct && c.say && /My name is/.test(c.say)))
    assert.equal(like?.chatCard, true)
    assert.ok(like?.choices?.every((c) => c.correct && c.say && /I like/.test(c.say)))
  })

  it('has two to three helpful-action scenarios', () => {
    const helps = plan.activities.filter((a) => a.id.startsWith('wkf2-help-'))
    assert.ok(helps.length >= 2 && helps.length <= 3)
    for (const item of helps) {
      assert.equal(item.sceneChoices, true)
      assert.equal(item.choices?.filter((c) => c.correct).length, 1)
    }
  })

  it('lets a non-reader finish every item from voice and pictures', () => {
    for (const item of plan.activities) {
      assert.ok(ROUND2_KID_KINDS.includes(item.kind), `${item.id} kind ${item.kind}`)
      assert.equal(item.autoSpeak, true, `${item.id} should auto-speak`)
      assert.equal(item.readAloud, undefined, `${item.id} must not be a character card`)
      assert.ok(round2KidCanAnswerWithoutReading(item), `${item.id} still needs reading`)
    }
  })

  it('does not turn invitation logistics into child items', () => {
    for (const item of plan.activities) {
      const text = round2ChildText(item)
      assert.equal(WKF2_FORBIDDEN_CHILD_COPY.test(text), false, `${item.id}: ${text}`)
    }
  })

  it('keeps parent P notes as practice checklists with the verified register facts', () => {
    const note = plan.parentNote
    assert.ok(note, 'missing parent note')
    const text = [note.blurb, ...note.talkingPoints.map((p) => `${p.title} ${p.body}`)].join('\n')
    for (const must of [
      /練習/,
      /唔係學校官方/,
      /QR/,
      /下午 4 時|4 時/,
      /安睦里/,
      /301/,
      /情緒/,
      /決定/,
      /老師/,
      /樂器/,
      /唔背稿/,
      /2026年11月12日/,
    ]) {
      assert.match(text, must)
    }
    for (const item of plan.activities) {
      assert.doesNotMatch(round2ChildText(item), /家長須知|樂器|QR|安睦里/)
    }
  })
})

describe('真道二輪 playable stations', () => {
  const plan = round2Plan('jando2')

  it('is scaffolded as a short tap session', () => {
    assert.equal(plan.title, '真道二輪')
    assert.ok(plan.activities.length >= 6)
    assert.ok(plan.activities.length <= 16)
  })

  it('covers story order, asking why, care, add-subtract, and listen-pick', () => {
    const ids = plan.activities.map((a) => a.id)
    assert.ok(ids.some((id) => id.startsWith('jando2-story-')))
    assert.ok(ids.includes('jando2-ask-why'))
    assert.ok(ids.includes('jando2-care'))
    assert.ok(ids.some((id) => id.startsWith('jando2-add') || id.startsWith('jando2-minus')))
    assert.ok(ids.some((id) => id.startsWith('jando2-word-')))
  })

  it('tells a 3-beat picture story with one correct tap each', () => {
    const beats = plan.activities.filter((a) => a.id.startsWith('jando2-story-'))
    assert.equal(beats.length, 3)
    for (const item of beats) {
      assert.equal(item.hideStoryText, true)
      assert.equal(item.choices?.filter((c) => c.correct).length, 1)
    }
  })

  it('practises asking 點解 with any question card accepted', () => {
    const ask = plan.activities.find((a) => a.id === 'jando2-ask-why')
    assert.equal(ask?.chatCard, true)
    assert.ok(ask?.choices?.every((c) => c.correct && c.say && /點解/.test(c.say)))
  })

  it('adds and subtracts with pictures within five', () => {
    const add = plan.activities.find((a) => a.id === 'jando2-add')
    const minus = plan.activities.find((a) => a.id === 'jando2-minus')
    assert.equal(add?.hintCount?.n, 2)
    assert.equal(minus?.hintCount?.n, 4)
    for (const item of [add, minus]) {
      const groups = item?.pictureStrip ?? []
      assert.ok(groups.every((g) => g.count && g.count >= 1 && g.count <= 5), item?.id)
      assert.doesNotMatch(item?.promptZh ?? '', /[0-9]/)
    }
  })

  it('lets a non-reader finish every item from voice and pictures', () => {
    for (const item of plan.activities) {
      assert.ok(ROUND2_KID_KINDS.includes(item.kind), `${item.id} kind ${item.kind}`)
      assert.equal(item.autoSpeak, true)
      assert.ok(round2KidCanAnswerWithoutReading(item), `${item.id} still needs reading`)
    }
  })

  it('does not leak round-2 logistics into child copy', () => {
    for (const item of plan.activities) {
      const text = round2ChildText(item)
      assert.equal(JANDO2_FORBIDDEN_CHILD_COPY.test(text), false, `${item.id}: ${text}`)
    }
  })

  it('labels parent notes as practice and notes the day-of flow may split', () => {
    const note = plan.parentNote
    assert.ok(note)
    const text = [note.blurb, ...note.talkingPoints.map((p) => `${p.title} ${p.body}`)].join('\n')
    for (const must of [
      /練習/,
      /唔係學校官方/,
      /D006/,
      /嶺光街/,
      /8 時半/,
      /2026年11月14日/,
      /當日流程以校方/,
      /十一年/,
      /家校/,
      /創新/,
      /委身/,
      /決定/,
      /時間/,
      /挫折/,
    ]) {
      assert.match(text, must)
    }
  })
})

describe('round-2 art is new plates, not 男拔／一輪 sprites', () => {
  it('keeps only star / pose chrome reused; everything else is school-week/round2', () => {
    for (const id of ['wkf2', 'jando2'] as const) {
      const plan = round2Plan(id)
      for (const item of plan.activities) {
        for (const pic of round2KidPics(item)) {
          const file = kidPicFile(pic)
          if (ROUND2_KEEP_SHARED.has(pic)) {
            assert.ok(
              /school-week\/(games|dbs)\//.test(file) || file.endsWith('star.png'),
              `${item.id} ${pic} expected shared chrome`,
            )
            continue
          }
          assert.match(pic, /^r2-/, `${item.id} still uses old id ${pic}`)
          assert.match(file, /^school-week\/round2\//, `${item.id} ${pic} → ${file}`)
          assert.ok(
            existsSync(resolve('public', file)),
            `missing public/${file}`,
          )
        }
      }
    }
  })
})

describe('existing round-1 school modes stay wired', () => {
  it('keeps 真道 and 男拔 first-round ids', () => {
    const jando = getSchool('jando')
    const dbs = getSchool('dbs')
    const wkf = getSchool('wkf')
    assert.equal(jando?.title, '真道')
    assert.ok(jando?.activities.some((a) => a.id === 'jando-name-zh'))
    assert.match(dbs?.title ?? '', /男拔面試練習/)
    assert.ok(dbs?.activities.some((a) => a.id === 'dbs-pose-stand'))
    assert.equal(wkf?.title, '王錦輝')
    assert.ok(wkf?.activities.some((a) => a.id === 'wkf-fest'))
  })
})
