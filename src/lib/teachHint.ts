import type { Activity, ActivityKind, SceneId } from '../data/content'

export type HintVisualId =
  | 'me'
  | 'intro'
  | 'family'
  | 'school'
  | 'teacher'
  | 'park'
  | 'run'
  | 'eat'
  | 'drink'
  | 'sleep'
  | 'book'
  | 'write'
  | 'share'
  | 'vase'
  | 'happy'
  | 'sad'
  | 'angry'
  | 'feelings'
  | 'zoo'
  | 'job'
  | 'policeman'
  | 'uniform'
  | 'football'
  | 'clock'
  | 'coins'
  | 'like-blue'
  | 'talk'
  | 'sort'
  | 'reorder'
  | 'move'
  | 'weekend'
  | 'mix'
  | 'plus'
  | 'minus'
  | 'story'

export type MathModel = {
  left: number
  right?: number
  op?: '+' | '-'
  icon: 'dot' | 'apple' | 'book' | 'kid' | 'star'
}

export type TeachHint = {
  visual: HintVisualId
  /** One short line a 5-year-old can follow */
  kidLine: string
  /** Second step: slightly more specific, still kid-facing */
  moreLine: string
  math?: MathModel
}

const SCENE_VISUAL: Partial<Record<SceneId, HintVisualId>> = {
  sleep: 'sleep',
  'run-park': 'run',
  'classroom-read': 'school',
  drink: 'drink',
  eat: 'eat',
  'read-book': 'book',
  'write-hw': 'write',
  'share-cookie': 'share',
  'broken-vase': 'vase',
  playground: 'park',
  sequence: 'story',
  intro: 'intro',
}

const ID_VISUAL: Record<string, HintVisualId> = {
  'd1-v': 'talk',
  'd2-v': 'run',
  'd3-v': 'talk',
  'd3-share': 'share',
  'd4-vocab': 'feelings',
  'd5-fam': 'family',
  'd5-story1': 'share',
  'd5-story2': 'vase',
  'd6-dad': 'family',
  'd1-zh-basic': 'intro',
  'd1-zh-like': 'like-blue',
  'd1-zh-family': 'family',
  'd1-zh-dream': 'teacher',
  'd1-en-basic': 'intro',
  'd1-en-like': 'like-blue',
  'd1-en-family': 'family',
  'd1-en-dream': 'teacher',
  day2: 'talk',
  'd2-opp': 'move',
  'd2-simon': 'move',
  day3: 'talk',
  'd3-r1': 'reorder',
  'd3-r2': 'reorder',
  'd3-r3': 'reorder',
  'd3-r4': 'reorder',
  'd3-en-q': 'share',
  day4: 'feelings',
  'd4-emo1': 'sad',
  'd4-emo1b': 'angry',
  'd4-emo2': 'happy',
  'd4-solve': 'share',
  'd4-sort': 'sort',
  'd4-syn': 'happy',
  'd4-ben': 'zoo',
  'd4-leo': 'sad',
  'd4-lily': 'feelings',
  'd4-sam': 'feelings',
  'd4-week': 'weekend',
  day5: 'family',
  'd5-job': 'job',
  'd5-hobby': 'happy',
  'd6-ming': 'story',
  'd6-ming2': 'talk',
  'd6-en1': 'policeman',
  'd6-en2': 'uniform',
  'd6-en3': 'football',
  'd6-en4': 'policeman',
}

const ID_KID: Record<string, { kidLine: string; moreLine: string }> = {
  weekdays: {
    kidLine: '跟住圖讀：星期一、星期二……',
    moreLine: '一週有七日。星期六同日係週末。',
  },
  'd1-zh-basic': {
    kidLine: '望住自己，大聲講：我叫袁碩孜。',
    moreLine: '再講：我今年五歲，讀藍田靈糧幼稚園。',
  },
  'd1-zh-like': {
    kidLine: '講一樣你鍾意嘅嘢，再講「因為」。',
    moreLine: '例如：我鍾意藍色，因為天空是藍色的。',
  },
  'd1-zh-family': {
    kidLine: '講你同家人一齊做過咩開心嘅事。',
    moreLine: '例如：我鍾意同家人去公園跑步。',
  },
  'd1-zh-dream': {
    kidLine: '講你大個想做咩，最後記得講多謝老師。',
    moreLine: '例如：我想做老師，因為可以教小朋友。多謝老師。',
  },
  'd1-en-basic': {
    kidLine: '跟住講英文：My name is Seth.',
    moreLine: '再講：I am 5 years old. I study in Lam Tin Ling Liang Kindergarten.',
  },
  'd1-en-like': {
    kidLine: '講 I like ____ because ____.',
    moreLine: 'I like blue because the sky is blue.',
  },
  'd1-en-family': {
    kidLine: '講同家人去邊：I like to go to the park.',
    moreLine: 'We ride bicycles. It is fun.',
  },
  'd1-en-dream': {
    kidLine: '講 I want to be a teacher. Thank you, teacher.',
    moreLine: 'Because I can help children learn.',
  },
  'd2-opp': {
    kidLine: '爸爸媽媽做一個動作，你做相反。',
    moreLine: '佢舉手 → 你唔好舉。佢踏前 → 你踏後。',
  },
  'd2-simon': {
    kidLine: '聽指令先做。有「唔好」就要停。',
    moreLine: 'Raise your hand = 舉手。Clap = 拍手。',
  },
  'd3-share': {
    kidLine: '講點樣同朋友分享玩具。',
    moreLine: '我會話：我哋一齊玩，輪流得唔得？',
  },
  'd6-ming': {
    kidLine: '睇故仔，揀小明做咗咩。',
    moreLine: '跟住圖講：首先……然後……最後……',
  },
  'd3-en-q': {
    kidLine: '用英文講分享：I can share.',
    moreLine: 'I share my toys with my friends.',
  },
  'd4-emo1': {
    kidLine: '唔見玩具會點？多數係傷心。',
    moreLine: '開心／興奮係笑；傷心係喊。',
  },
  'd4-emo2': {
    kidLine: '講：今日我好____，因為____。',
    moreLine: '今日我好開心，因為媽媽送禮物俾我。',
  },
  'd4-solve': {
    kidLine: '有人搶玩具：先講感受，再請輪流玩，唔好打人。',
    moreLine: '我會話：我唔開心。我哋一齊輪流玩得唔得？',
  },
  'd4-sort': {
    kidLine: '笑嘅、開心嘅放 ＋。喊嘅、嬲嘅放 －。',
    moreLine: '＋開心興奮平靜　－傷心憤怒擔憂驚慌失望',
  },
  'd4-ben': {
    kidLine: 'Ben 去邊？圖係動物園。',
    moreLine: 'He is going to the zoo.',
  },
  'd5-job': {
    kidLine: '講爸爸／媽媽做咩工作。',
    moreLine: '例如：我爸爸係老師，佢教小朋友。',
  },
  'd6-dad': {
    kidLine: '講一件同爸爸媽媽有關嘅事。',
    moreLine: '可以講一齊去邊、一齊食咩。',
  },
}

function defaultKidLine(kind: ActivityKind): { kidLine: string; moreLine: string } {
  switch (kind) {
    case 'speak':
      return { kidLine: '睇圖，大聲講一句。', moreLine: '唔識就跟住黃色字讀。' }
    case 'choice':
      return { kidLine: '睇圖，再揀一個。', moreLine: '聽晒選項，慢慢揀。' }
    case 'math':
      return { kidLine: '數圖上嘅點／積木。', moreLine: '十個就係一條橙色。' }
    case 'clock':
      return { kidLine: '短針係幾點，長針係幾分。', moreLine: '長針指 6 = 30 分。' }
    case 'money':
      return { kidLine: '撳硬幣做記號，一舊一舊數。', moreLine: '先數銀紙／大銀，再數細幣。' }
    case 'reorder':
      return { kidLine: '拖第一個字去上面，再拖下一個。', moreLine: '句子通常由「我／小明／首先」開頭。' }
    case 'sort':
      return { kidLine: '拖去 ＋ 或者 －。', moreLine: '笑面去 ＋，喊面去 －。' }
    case 'prompt':
      return { kidLine: '睇圖，同爸爸媽媽一齊做。', moreLine: '做完就撳 ✓。' }
    default:
      return { kidLine: '睇圖再試。', moreLine: '試完唔識可以再撳 ?' }
  }
}

function iconForPrompt(prompt: string): MathModel['icon'] {
  if (/書/.test(prompt)) return 'book'
  if (/糖|蘋果|橙|粒/.test(prompt)) return 'apple'
  if (/小朋友|人/.test(prompt)) return 'kid'
  if (/星/.test(prompt)) return 'star'
  return 'dot'
}

export function parseMathModel(prompt: string): MathModel | undefined {
  const add = prompt.match(/(\d{1,3})\s*[＋+]\s*(\d{1,3})/)
  if (add) {
    return { left: Number(add[1]), right: Number(add[2]), op: '+', icon: iconForPrompt(prompt) }
  }
  const sub = prompt.match(/(\d{1,3})\s*[－−\-–]\s*(\d{1,3})/)
  if (sub) {
    return { left: Number(sub[1]), right: Number(sub[2]), op: '-', icon: iconForPrompt(prompt) }
  }
  const nums = [...prompt.matchAll(/(\d{1,3})/g)].map((m) => Number(m[1])).filter((n) => n > 0 && n <= 99)
  if (nums.length >= 2) {
    const op: '+' | '-' = /再給|又來|再來|加|共|一共|多/.test(prompt) && !/借走|剩|減|少/.test(prompt) ? '+' : '-'
    if (/借走|剩|減|少了|吃了/.test(prompt)) {
      return { left: nums[0], right: nums[1], op: '-', icon: iconForPrompt(prompt) }
    }
    if (/再給|又來|再來|加|共有|一共/.test(prompt)) {
      return { left: nums[0], right: nums[1], op: '+', icon: iconForPrompt(prompt) }
    }
    if (op && nums[0] <= 40 && nums[1] <= 40) {
      return { left: nums[0], right: nums[1], op, icon: iconForPrompt(prompt) }
    }
  }
  if (nums.length === 1 && nums[0] <= 20) {
    return { left: nums[0], icon: iconForPrompt(prompt) }
  }
  return undefined
}

function inferVisual(item: Activity, math?: MathModel): HintVisualId {
  if (ID_VISUAL[item.id]) return ID_VISUAL[item.id]
  if (item.scene && SCENE_VISUAL[item.scene]) return SCENE_VISUAL[item.scene]!
  if (item.kind === 'clock' || item.clock) return 'clock'
  if (item.kind === 'money' || item.coins) return 'coins'
  if (item.kind === 'sort') return 'sort'
  if (item.kind === 'reorder') return 'reorder'
  if (item.kind === 'prompt') return 'move'
  if (item.calendarDay) return 'weekend'
  const p = `${item.promptZh} ${item.promptEn || ''} ${item.cue || ''}`
  if (/policeman|police|警察/.test(p)) return 'policeman'
  if (/uniform|制服/.test(p)) return 'uniform'
  if (/football|zoo|elephant|monkey|動物/.test(p)) return /football|park/.test(p) ? 'football' : 'zoo'
  if (/self-introduction|Say your name|我叫袁|我叫碩/.test(p)) return 'intro'
  if (/I like|鍾意藍色|畫畫/.test(p)) return 'like-blue'
  if (/school|kindergarten|老師|幼稚園|課室/.test(p)) return 'school'
  if (/family|家人|爸爸|媽媽/.test(p)) return 'family'
  if (/park|公園|跑步/.test(p)) return 'park'
  if (/share|分享|輪流/.test(p)) return 'share'
  if (/sad|傷心|哭/.test(p)) return 'sad'
  if (/angry|嬲|憤怒|搶/.test(p)) return 'angry'
  if (/happy|開心|興奮/.test(p)) return 'happy'
  if (/job|工作|老師/.test(p)) return 'job'
  if (item.kind === 'math') {
    if (math?.op === '-') return 'minus'
    if (math?.op === '+') return 'plus'
    return 'mix'
  }
  if (item.kind === 'speak') return 'talk'
  return 'story'
}

export function vocabVisual(catId: string, zh: string): HintVisualId {
  if (catId === 'family') return 'family'
  if (catId === 'jobs') return 'job'
  if (catId === 'actions') {
    if (/吃/.test(zh)) return 'eat'
    if (/喝/.test(zh)) return 'drink'
    if (/跑|踏/.test(zh)) return 'run'
    if (/哭/.test(zh)) return 'sad'
    if (/說話|叫|唱/.test(zh)) return 'talk'
    return 'move'
  }
  if (catId === 'places') {
    if (/學|校|園/.test(zh)) return 'school'
    return 'park'
  }
  if (/吃|食|飯/.test(zh)) return 'eat'
  if (catId === 'times-of-day') {
    if (/夜|午夜/.test(zh)) return 'sleep'
    return 'clock'
  }
  if (catId === 'weekdays' || catId === 'months' || catId === 'seasons') return 'weekend'
  return 'talk'
}
export function resolveTeachHint(item: Activity): TeachHint {
  const math =
    item.kind === 'math' || item.kind === 'clock' || item.kind === 'money'
      ? parseMathModel(item.promptZh)
      : undefined
  const visual = inferVisual(item, math)
  const copy = ID_KID[item.id] || defaultKidLine(item.kind)
  let moreLine = copy.moreLine
  if (!ID_KID[item.id] && item.sampleZh) {
    moreLine = `可以咁開頭：${item.sampleZh.slice(0, 18)}${item.sampleZh.length > 18 ? '…' : ''}`
  }
  return {
    visual,
    kidLine: copy.kidLine,
    moreLine,
    math: item.kind === 'math' ? math : undefined,
  }
}
