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
  | 'gift'
  | 'lost-toy'
  | 'grab'
  | 'firefighter'
  | 'bike'
  | 'bike-fall'
  | 'doctor'
  | 'nurse'
  | 'cook'
  | 'daily'
  | 'play-fun'
  | 'balloon'
  | 'pencil-case'
  | 'birthday'
  | 'family-hobbies'
  | 'zoo'
  | 'job'
  | 'policeman'
  | 'police-help'
  | 'uniform'
  | 'football'
  | 'driver'
  | 'postman'
  | 'actor'
  | 'writer'
  | 'lawyer'
  | 'toilet'
  | 'mtr'
  | 'bus-stop'
  | 'sweep'
  | 'sing'
  | 'clock'
  | 'coins'
  | 'like-blue'
  | 'insects'
  | 'seth-story'
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
  'd2-v': 'daily',
  'd3-v': 'play-fun',
  'd3-share': 'share',
  'd4-vocab': 'feelings',
  'd5-fam': 'family',
  'd5-story1': 'share',
  'd5-story2': 'vase',
  'd1-zh-basic': 'intro',
  'd1-zh-like': 'like-blue',
  'd1-zh-family': 'family',
  'd1-zh-dream': 'teacher',
  'd1-en-basic': 'intro',
  'd1-en-like': 'insects',
  'd1-en-family': 'family',
  'd1-en-story': 'seth-story',
  'd1-en-dream': 'teacher',
  day2: 'talk',
  'd2-opp': 'move',
  'd2-simon': 'move',
  day3: 'talk',
  'd3-r1': 'reorder',
  'd3-r2': 'reorder',
  'd3-r3': 'reorder',
  'd3-r4': 'reorder',
  'd3-en-q': 'bike',
  'd3-m1a': 'mix',
  'd3-m3b': 'mix',
  day4: 'feelings',
  'd4-emo1': 'gift',
  'd4-emo1b': 'lost-toy',
  'd4-emo2': 'gift',
  'd4-solve': 'grab',
  'd4-sort': 'sort',
  'd4-syn': 'happy',
  'd4-ben': 'zoo',
  'd4-leo': 'balloon',
  'd4-lily': 'pencil-case',
  'd4-sam': 'birthday',
  'd4-week': 'weekend',
  day5: 'family',
  'd5-job': 'job',
  'd5-hobby': 'family-hobbies',
  'd5-purse-most': 'coins',
  'd5-purse-least': 'coins',
  'd6-dad': 'firefighter',
  'd6-ming': 'bike-fall',
  'd6-ming2': 'bike-fall',
  'd6-en1': 'policeman',
  'd6-en2': 'uniform',
  'd6-en3': 'football',
  'd6-en4': 'police-help',
  'd6-r2': 'mix',
  'd6-r3a': 'mix',
  'cky-simon': 'move',
  'cky-simon-chain': 'move',
  'cky-amy-listen': 'birthday',
  'cky-amy-1': 'birthday',
  'cky-amy-2': 'gift',
  'cky-amy-3': 'birthday',
  'cky-amy-4': 'birthday',
  'cky-amy-5': 'birthday',
  'cky-amy-help': 'share',
  'cky-party-draw': 'birthday',
  'cky-party-gift': 'gift',
  'cky-mon-listen': 'zoo',
  'cky-mon-1': 'zoo',
  'cky-mon-2': 'zoo',
  'cky-mon-3': 'zoo',
  'cky-mon-4': 'zoo',
  'cky-mon-5': 'share',
  'cky-mon-next': 'zoo',
  'spcc-name': 'intro',
  'spcc-name-mean': 'intro',
  'spcc-job': 'teacher',
  'spcc-umbrella': 'park',
  'spcc-bridge-look': 'park',
  'spcc-bridge-shape': 'park',
  'spcc-bridge-blocks': 'park',
  'spcc-read': 'talk',
  'spcc-story5': 'family',
  'spcc-snacks': 'eat',
  'spcc-parents': 'family-hobbies',
  'spcc-holiday': 'park',
  'spcc-transport': 'mtr',
  'wkf-fest': 'play-fun',
  'wkf-fest-en': 'play-fun',
  'wkf-place': 'book',
  'wkf-place-why': 'book',
  'wkf-place-cmp': 'park',
  'wkf-tan-play': 'sort',
  'wkf-tan-7': 'sort',
  'wkf-tan-tri': 'sort',
  'wkf-tan-sq': 'sort',
  'wkf-tan-boat': 'sort',
  'wkf-mall-listen': 'lost-toy',
  'wkf-mall-1': 'gift',
  'wkf-mall-2': 'play-fun',
  'wkf-mall-3': 'lost-toy',
  'wkf-mall-4': 'police-help',
  'wkf-mall-5': 'police-help',
  'wkf-mall-phone': 'talk',
  'evg-puppy-listen': 'park',
  'evg-puppy-1': 'park',
  'evg-puppy-2': 'park',
  'evg-puppy-3': 'family',
  'evg-puppy-4': 'police-help',
  'evg-puppy-5': 'police-help',
  'evg-puppy-retell': 'story',
  'evg-order': 'story',
  'evg-order-ask': 'police-help',
  'evg-match': 'sort',
  'evg-lunch-listen': 'eat',
  'evg-lunch-1': 'eat',
  'evg-lunch-2': 'teacher',
  'evg-lunch-3': 'eat',
  'evg-lunch-4': 'sweep',
  'evg-read-zh': 'eat',
  'evg-mem-look': 'zoo',
  'evg-guess': 'zoo',
  'evg-animal-day': 'zoo',
  'evg-bridge-talk': 'share',
  'evg-morning': 'daily',
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
    kidLine: '唔使背全段。先望住老師講：My name is Seth.',
    moreLine: '再揀一樣講：I am five years old，或者講學校。',
  },
  'd1-en-like': {
    kidLine: '揀一幅圖講：I like insects.',
    moreLine: '再加一件事：I also like drawing，或者 My favourite colour is yellow.',
  },
  'd1-en-family': {
    kidLine: '先講屋企人：I live with my mum and dad.',
    moreLine: '再講一件真事：Sometimes I catch insects with a little bug net.',
  },
  'd1-en-story': {
    kidLine: '望一幅圖講一件事。唔記得原句，可以用自己嘅字。',
    moreLine: '用 and、sometimes、also 接下一件事；講三四個重點就夠。',
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
    kidLine: '收到禮物會點？多數係開心。',
    moreLine: '開心會笑；傷心先會喊。',
  },
  'd4-emo1b': {
    kidLine: '唔見最鍾意嘅玩具會點？多數係傷心。',
    moreLine: '搵唔到心愛嘅嘢，會喊、會唔開心。',
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
  'd4-leo': {
    kidLine: 'Leo 想要紅氣球，但收到藍氣球，之後送給 Tim。',
    moreLine: '最後佢覺得Proud，因為肯分享。',
  },
  'd4-lily': {
    kidLine: 'Lily 嬲因為弟弟整爛筆盒，佢深呼吸數到十。',
    moreLine: '嬲嘅時候可以深呼吸，等自己冷靜。',
  },
  'd4-sam': {
    kidLine: '跟住生日故事講心情：蛋糕、藍裇、遙控車、落雨、室內賽道。',
    moreLine: '有興奮、失望、擔心、開心。',
  },
  'd5-job': {
    kidLine: '講爸爸／媽媽做咩工作。',
    moreLine: '例如：我爸爸係老師，佢教小朋友。',
  },
  'd6-dad': {
    kidLine: '講一件同爸爸媽媽有關嘅事。',
    moreLine: '可以講一齊去邊、一齊食咩。',
  },
  'cky-simon': {
    kidLine: '聽到 Simon says 先撳「做」。冇聽到就撳「企定」。',
    moreLine: '拍手兩下、轉一圈：冇 Simon says 就企定。',
  },
  'cky-simon-chain': {
    kidLine: '跟次序：先摸鼻，再拍手，最後指門。',
    moreLine: '鼻 → 拍手 → 門。',
  },
  'cky-party-draw': {
    kidLine: '拖壽星、朋友、蛋糕、禮物同有趣嘢去派對。',
    moreLine: '六樣都放好就得。',
  },
  'spcc-bridge-look': {
    kidLine: '拖橋面、護欄同三角形支柱去河上面。',
    moreLine: '兩邊都要有護欄同支柱。',
  },
  'spcc-bridge-shape': {
    kidLine: '撳兩塊黃色三角形支柱。',
    moreLine: '三角形支柱令橋企得穩。',
  },
  'spcc-bridge-blocks': {
    kidLine: '先撳支柱，再橋面，最後護欄。',
    moreLine: '橋要先企得穩，先至可以行。',
  },
  'wkf-tan-play': {
    kidLine: '拖色塊去上面同一個形狀，砌大三角形。',
    moreLine: '對住顏色同形狀放。',
  },
  'wkf-tan-7': {
    kidLine: '撳晒七塊先至得。',
    moreLine: '兩大、一中、兩細、一方、一斜，合共七塊。',
  },
  'wkf-tan-tri': {
    kidLine: '只撳三角形。正方形同斜塊唔好撳。',
    moreLine: '有五塊三角形。',
  },
  'wkf-tan-sq': {
    kidLine: '撳兩塊最細嘅三角形。',
    moreLine: '兩塊細三角形合埋就係正方形。',
  },
  'wkf-tan-boat': {
    kidLine: '拖色塊去船形空位。',
    moreLine: '上面係帆，下面係船身。',
  },
  'evg-mem-look': {
    kidLine: '翻兩張，配對動物同佢攞住嘅嘢。',
    moreLine: '企鵝有藍波，大象有綠傘，兔子有紅蘿蔔。',
  },
  'cky-amy-3': {
    kidLine: 'Ben 着雨衣，唔係因為天花板漏水。',
    moreLine: '因為派對可能去花園，佢想準備好。',
  },
  'wkf-fest': {
    kidLine: '三個節日都得。揀一個你最想去嘅。',
    moreLine: '揀完要講因為，同埋喺度會做咩。',
  },
  'wkf-place': {
    kidLine: '三個地方都得。揀一個你最想去嘅。',
    moreLine: '圖書館睇書、科學館撳掣、郊野公園跑步。',
  },
  'wkf-mall-5': {
    kidLine: '唔好乱跑，唔好跟陌生人。',
    moreLine: '留喺玩具店門口，搵着制服嘅職員。',
  },
  'evg-order': {
    kidLine: '先落雨，再發現小狗，抹乾，最後主人返嚟。',
    moreLine: '拖字去上面：B → D → A → C。',
  },
  'evg-match': {
    kidLine: '英文拖去中文：name 係名字。',
    moreLine: 'egg 雞蛋、broccoli 西蘭花、ear 耳朵。',
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
    case 'tangram':
      return { kidLine: '拖色塊去同一個形狀。', moreLine: '兩塊細三角形可以砌成正方形。' }
    case 'simon':
      return { kidLine: '聽到 Simon says 先撳「做」。冇聽到就撳「企定」。', moreLine: '拍手、轉圈如果冇 Simon says，唔好郁。' }
    case 'build':
      return { kidLine: '拖零件去圖上嘅空位。', moreLine: '橋要先砌三角形支柱先穩。' }
    case 'memory':
      return { kidLine: '翻兩張，搵同一對。', moreLine: '企鵝配藍波，大象配綠傘。' }
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
  if (item.kind === 'money' || item.coins || /錢包|硬幣|幾多元/.test(`${item.promptZh}`)) return 'coins'
  if (item.kind === 'sort') return 'sort'
  if (item.kind === 'reorder') return 'reorder'
  if (item.kind === 'prompt') return 'move'
  if (item.kind === 'tangram') return 'mix'
  if (item.kind === 'simon') return 'play-fun'
  if (item.kind === 'build') return 'move'
  if (item.kind === 'memory') return 'zoo'
  if (item.calendarDay) return 'weekend'
  const p = `${item.promptZh} ${item.promptEn || ''} ${item.cue || ''}`
  if (/policeman|police|警察/.test(p)) return 'policeman'
  if (/firefighter|消防/.test(p)) return 'firefighter'
  if (/doctor|醫生|護士|醫院/.test(p)) return 'doctor'
  if (/cycle|bicycle|單車|騎車/.test(p)) return 'bike'
  if (/cook|煮嘢|煮/.test(p)) return 'cook'
  if (/uniform|制服/.test(p)) return 'uniform'
  if (/football|zoo|elephant|monkey|動物/.test(p)) return /football|park/.test(p) ? 'football' : 'zoo'
  if (/self-introduction|Say your name|我叫袁|我叫碩/.test(p)) return 'intro'
  if (/I like|鍾意藍色|畫畫/.test(p)) return 'like-blue'
  if (/school|kindergarten|老師|幼稚園|課室/.test(p)) return 'school'
  if (/family|家人|爸爸|媽媽/.test(p)) return 'family'
  if (/park|公園|跑步/.test(p)) return 'park'
  if (/balloon|氣球/.test(p)) return 'balloon'
  if (/pencil case|筆盒|筆袋/.test(p)) return 'pencil-case'
  if (/遙控車|藍裇|生日故事/.test(p)) return 'birthday'
  if (/share|分享|輪流/.test(p) && !/搶/.test(p)) return 'share'
  if (/禮物|gift|present/.test(p)) return 'gift'
  if (/唔見.*玩具|lost.*toy/.test(p)) return 'lost-toy'
  if (/sad|傷心|哭/.test(p)) return 'sad'
  if (/angry|嬲|憤怒|搶/.test(p)) return 'grab'
  if (/happy|開心|興奮/.test(p)) return 'happy'
  if (/job|工作|老師/.test(p)) return 'job'
  if (item.kind === 'math') {
    if (math?.op === '-') return 'minus'
    if (math?.op === '+') return 'plus'
    return 'mix'
  }
  if (/誰比較多|哪班比較多|多多少|比較多/.test(p)) return 'mix'
  if (item.kind === 'speak') return 'talk'
  return 'story'
}

export function vocabVisual(catId: string, zh: string): HintVisualId {
  if (catId === 'family') return 'family'
  if (catId === 'jobs') {
    if (/老師/.test(zh)) return 'teacher'
    if (/同學/.test(zh)) return 'school'
    if (/護士/.test(zh)) return 'nurse'
    if (/醫生/.test(zh)) return 'doctor'
    if (/消防/.test(zh)) return 'firefighter'
    if (/警察/.test(zh)) return 'policeman'
    if (/廚師/.test(zh)) return 'cook'
    if (/司機/.test(zh)) return 'driver'
    if (/郵差/.test(zh)) return 'postman'
    if (/演員/.test(zh)) return 'actor'
    if (/作家/.test(zh)) return 'writer'
    if (/律師/.test(zh)) return 'lawyer'
    return 'job'
  }
  if (catId === 'actions') {
    if (/吃/.test(zh)) return 'eat'
    if (/喝/.test(zh)) return 'drink'
    if (/跑|踏/.test(zh)) return 'run'
    if (/舞蹈/.test(zh)) return 'play-fun'
    if (/跳/.test(zh)) return 'happy'
    if (/單車/.test(zh)) return 'bike'
    if (/哭|跌倒/.test(zh)) return 'sad'
    if (/打|拉|推/.test(zh)) return 'grab'
    if (/抱/.test(zh)) return 'family'
    if (/唱/.test(zh)) return 'sing'
    if (/掃/.test(zh)) return 'sweep'
    if (/說話|叫|拍手/.test(zh)) return 'talk'
    return 'daily'
  }
  if (catId === 'places') {
    if (/家/.test(zh)) return 'family'
    if (/公園/.test(zh)) return 'park'
    if (/學|校|教室/.test(zh)) return 'school'
    if (/消防/.test(zh)) return 'firefighter'
    if (/醫院/.test(zh)) return 'doctor'
    if (/餐廳/.test(zh)) return 'eat'
    if (/圖書館/.test(zh)) return 'book'
    if (/超市|市場/.test(zh)) return 'coins'
    if (/洗手|廁/.test(zh)) return 'toilet'
    if (/地鐵/.test(zh)) return 'mtr'
    if (/巴士/.test(zh)) return 'bus-stop'
    return 'talk'
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
