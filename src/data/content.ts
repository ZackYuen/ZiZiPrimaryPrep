/** Content digitized from:
 *  - 名校模擬面試 Day 1-6 r.pdf（第二週練習）
 *  - 名校模擬面試 第一周字詞表.pdf
 */

export type Level = 1 | 2 | 3 | 4

export type ActivityKind = 'speak' | 'choice' | 'math' | 'reorder' | 'prompt'

export type Choice = {
  text: string
  correct: boolean
}

export type Activity = {
  id: string
  kind: ActivityKind
  level: Level
  cue: string
  promptZh: string
  promptEn?: string
  sampleZh?: string
  sampleEn?: string
  tip?: string
  choices?: Choice[]
  /** For math: accept answers like "13" or "13粒" */
  answer?: string
  answers?: string[]
  fragments?: string[]
  correctOrder?: string[]
  fields?: string[]
}

export type DayId = 'day1' | 'day2' | 'day3' | 'day4' | 'day5' | 'day6'

export type DayPlan = {
  id: DayId
  day: number
  title: string
  subtitle: string
  color: string
  accent: string
  icon: string
  activities: Activity[]
}

export type VocabItem = {
  zh: string
  en: string
}

export type VocabCategory = {
  id: string
  title: string
  items: VocabItem[]
}

export const CHILD = {
  nameZh: '孜孜',
  nameEn: 'ZiZi',
  age: 5,
  ageZh: '五',
  kindergarten: '○○',
}

export const levels = [
  {
    level: 1 as Level,
    name: '基礎鞏固',
    goal: '知道「我做得到」',
    target: '所有學校',
    color: '#5EB5D8',
  },
  {
    level: 2 as Level,
    name: '進階應用',
    goal: '知道「諗吓就有答案」',
    target: '龍組／學術型',
    color: '#6BCB8B',
  },
  {
    level: 3 as Level,
    name: '精英挑戰',
    goal: '知道「難嘅嘢都可以試」',
    target: '神校／非龍組',
    color: '#FF7A59',
  },
  {
    level: 4 as Level,
    name: '頂尖神級',
    goal: '知道「唔識都可以好玩」',
    target: '神校二面／資優',
    color: '#E85D75',
  },
]

export const coreAbilities = [
  {
    title: '面對難題的勇氣',
    body: '遇到不懂的題目，不逃避、不哭鬧，願意嘗試。',
  },
  {
    title: '表達自己的能力',
    body: '能夠清晰、有禮貌地用中英文表達想法。',
  },
  {
    title: '堅持不放棄的態度',
    body: '即使答錯，也願意再試一次。',
  },
]

export const parentQuotes = [
  { when: '答對時', quote: '嘩！你真係好努力！（讚努力，唔讚聰明）' },
  { when: '答錯時', quote: '唔緊要，再試一次！' },
  { when: '想放棄時', quote: '我哋一齊諗吓，好唔好？' },
  { when: '做到 Level 4', quote: '你好勇敢！呢題我都覺得難！' },
  { when: '面試前', quote: '記得望住老師笑，講話要大聲少少就得啦。' },
  { when: '面試後', quote: '無論結果點，你已經好叻！' },
]

export const parentTips = [
  {
    title: '面試不是考試，而是一場「傾偈」',
    body: '面試官想認識小朋友。願意說話、願意嘗試、有禮貌，遠比全部答對但不出聲更受歡迎。',
  },
  {
    title: '小朋友會感知你的緊張',
    body: '練習時保持輕鬆，面試當天平常心。你的平靜，是孜孜最大的定心丸。',
  },
  {
    title: '失敗不是壞事',
    body: '結果不理想也是學習。很多入讀名校的孩子都經歷過不止一次面試。',
  },
  {
    title: '最好的準備，是「唔驚」',
    body: '學術可以短時間催谷，但自信、禮貌、面對困難的態度需要長時間培養。目標不是「識晒」，而是「唔驚」。',
  },
  {
    title: '四個難度級別',
    body: 'Level 4 不是必須完成。做到 Level 3 開始吃力就可以停。價值在於「嘗試的過程」，不在於「答對的結果」。由淺入深，不太吃力才向上挑戰。',
  },
]

/** 第一周字詞表 */
export const vocabCategories: VocabCategory[] = [
  {
    id: 'weekdays',
    title: '時間 · 星期',
    items: [
      { zh: '星期一', en: 'Monday' },
      { zh: '星期二', en: 'Tuesday' },
      { zh: '星期三', en: 'Wednesday' },
      { zh: '星期四', en: 'Thursday' },
      { zh: '星期五', en: 'Friday' },
      { zh: '星期六', en: 'Saturday' },
      { zh: '星期日', en: 'Sunday' },
      { zh: '周末', en: 'Weekend' },
      { zh: '平日', en: 'Weekday' },
      { zh: '今天', en: 'Today' },
      { zh: '明天', en: 'Tomorrow' },
      { zh: '昨天', en: 'Yesterday' },
    ],
  },
  {
    id: 'months',
    title: '時間 · 月份',
    items: [
      { zh: '一月', en: 'January' },
      { zh: '二月', en: 'February' },
      { zh: '三月', en: 'March' },
      { zh: '四月', en: 'April' },
      { zh: '五月', en: 'May' },
      { zh: '六月', en: 'June' },
      { zh: '七月', en: 'July' },
      { zh: '八月', en: 'August' },
      { zh: '九月', en: 'September' },
      { zh: '十月', en: 'October' },
      { zh: '十一月', en: 'November' },
      { zh: '十二月', en: 'December' },
    ],
  },
  {
    id: 'times-of-day',
    title: '時間 · 一日',
    items: [
      { zh: '早上／上午', en: 'Morning' },
      { zh: '正午', en: 'Noon' },
      { zh: '下午', en: 'Afternoon' },
      { zh: '黃昏', en: 'Sunset' },
      { zh: '夜晚', en: 'Night' },
      { zh: '午夜', en: 'Midnight' },
    ],
  },
  {
    id: 'seasons',
    title: '時間 · 季節與節日',
    items: [
      { zh: '春天', en: 'Spring' },
      { zh: '夏天', en: 'Summer' },
      { zh: '秋天', en: 'Autumn' },
      { zh: '冬天', en: 'Winter' },
      { zh: '端午節', en: 'Dragon Boat Festival' },
      { zh: '中秋節', en: 'Mid-Autumn Festival' },
      { zh: '農曆新年', en: 'Chinese New Year' },
      { zh: '聖誕節', en: 'Christmas' },
      { zh: '復活節', en: 'Easter' },
      { zh: '萬聖節', en: 'Halloween' },
      { zh: '清明節', en: 'Ching Ming Festival' },
      { zh: '重陽節', en: 'Chung Yeung Festival' },
    ],
  },
  {
    id: 'family',
    title: '人物 · 家人',
    items: [
      { zh: '爸爸', en: 'Father / Dad' },
      { zh: '媽媽', en: 'Mother / Mom' },
      { zh: '姐姐', en: 'Elder sister' },
      { zh: '妹妹', en: 'Younger sister' },
      { zh: '哥哥', en: 'Elder brother' },
      { zh: '弟弟', en: 'Younger brother' },
      { zh: '祖母／嫲嫲', en: 'Grandmother' },
      { zh: '祖父／爺爺', en: 'Grandfather' },
      { zh: '外祖母／外婆', en: 'Grandmother (maternal)' },
      { zh: '外祖父／外公', en: 'Grandfather (maternal)' },
      { zh: '兒子', en: 'Son' },
      { zh: '女兒', en: 'Daughter' },
    ],
  },
  {
    id: 'jobs',
    title: '人物 · 職業',
    items: [
      { zh: '老師', en: 'Teacher' },
      { zh: '同學', en: 'Classmate' },
      { zh: '醫生', en: 'Doctor' },
      { zh: '護士', en: 'Nurse' },
      { zh: '消防員', en: 'Firefighter' },
      { zh: '警察', en: 'Police officer' },
      { zh: '司機', en: 'Driver' },
      { zh: '廚師', en: 'Cook / Chef' },
      { zh: '郵差', en: 'Postman' },
      { zh: '演員', en: 'Actor / Actress' },
      { zh: '作家', en: 'Author / Writer' },
      { zh: '律師', en: 'Lawyer' },
    ],
  },
  {
    id: 'actions',
    title: '動作',
    items: [
      { zh: '吃', en: 'Eat' },
      { zh: '喝', en: 'Drink' },
      { zh: '說話', en: 'Talk' },
      { zh: '叫', en: 'Shout' },
      { zh: '唱', en: 'Sing' },
      { zh: '哭', en: 'Cry' },
      { zh: '跑', en: 'Run' },
      { zh: '舞蹈', en: 'Dance' },
      { zh: '踏', en: 'Step' },
      { zh: '踩單車', en: 'Cycle' },
      { zh: '跳', en: 'Jump' },
      { zh: '跌倒', en: 'Fall' },
      { zh: '打', en: 'Hit' },
      { zh: '拉', en: 'Pull' },
      { zh: '推', en: 'Push' },
      { zh: '拍手', en: 'Clap' },
      { zh: '掃', en: 'Sweep' },
      { zh: '抱', en: 'Hug' },
    ],
  },
  {
    id: 'places',
    title: '地點',
    items: [
      { zh: '家裏', en: 'Home' },
      { zh: '學校', en: 'School' },
      { zh: '公園', en: 'Park' },
      { zh: '消防站', en: 'Fire station' },
      { zh: '教室', en: 'Classroom' },
      { zh: '餐廳', en: 'Restaurant' },
      { zh: '圖書館', en: 'Library' },
      { zh: '超級市場', en: 'Supermarket' },
      { zh: '洗手間', en: 'Restroom / Toilet' },
      { zh: '醫院', en: 'Hospital' },
      { zh: '地鐵站', en: 'MTR Station' },
      { zh: '巴士站', en: 'Bus stop' },
    ],
  },
]

const introZh = `老師好，我叫${CHILD.nameZh}，今年${CHILD.ageZh}歲，讀${CHILD.kindergarten}幼稚園。`
const introEn = `Good morning teacher. My name is ${CHILD.nameEn}. I am ${CHILD.age} years old. I study in ${CHILD.kindergarten} Kindergarten.`

export const days: DayPlan[] = [
  {
    id: 'day1',
    day: 1,
    title: 'Day 1 自我介紹',
    subtitle: '中英自我介紹 · 加減運算',
    color: '#7EC8E3',
    accent: '#1B6B8A',
    icon: '1',
    activities: [
      {
        id: 'd1-v',
        kind: 'speak',
        level: 1,
        cue: '詞匯',
        promptZh: '跟著讀：老師好、姓名、今年、歲、就讀、幼稚園、喜歡、多謝',
        sampleZh: '老師好。姓名。今年。歲。就讀。幼稚園。喜歡。多謝。',
        tip: '每個詞慢慢讀兩次。',
      },
      {
        id: 'd1-zh-basic',
        kind: 'speak',
        level: 1,
        cue: '中文 · 基本版',
        promptZh: '說出姓名、年齡、就讀幼稚園。',
        sampleZh: introZh,
        tip: '請家長把幼稚園名稱換成真實校名。',
      },
      {
        id: 'd1-zh-like',
        kind: 'speak',
        level: 2,
        cue: '中文 · 喜好',
        promptZh: '加入最喜歡的顏色／食物／活動（2–3 個），並說因為。',
        sampleZh: '我鍾意藍色，因為天空是藍色的，看起來很開心。我鍾意畫畫，因為可以畫出我的想像。',
      },
      {
        id: 'd1-zh-family',
        kind: 'speak',
        level: 2,
        cue: '中文 · 家人',
        promptZh: '說出最喜歡與家人一起做什麼。',
        sampleZh: '我鍾意與家人一起去公園。我們會跑步和踏單車，很開心。',
      },
      {
        id: 'd1-zh-dream',
        kind: 'speak',
        level: 3,
        cue: '中文 · 志願',
        promptZh: '長大後想做什麼？為什麼？最後說多謝老師。',
        sampleZh: '我長大後想做老師，因為可以教小朋友讀書寫字，好開心！多謝老師。',
        tip: '家長可追問：「點解你想做……？仲有冇其他原因？」',
      },
      {
        id: 'd1-en-basic',
        kind: 'speak',
        level: 1,
        cue: 'English · Basic',
        promptZh: 'Self-introduction (Basic)',
        promptEn: 'Say your name, age and kindergarten.',
        sampleEn: introEn,
        sampleZh: introEn,
      },
      {
        id: 'd1-en-like',
        kind: 'speak',
        level: 2,
        cue: 'English · Likes',
        promptZh: '加入喜好與原因。',
        promptEn: 'I like ____ because ____.',
        sampleEn: 'I like blue because the sky is blue. I like drawing because it is fun.',
        sampleZh: 'I like blue because the sky is blue. I like drawing because it is fun.',
      },
      {
        id: 'd1-en-family',
        kind: 'speak',
        level: 2,
        cue: 'English · Family',
        promptZh: '最喜歡與家人一起做什麼。',
        promptEn: 'I like to ____ with my family.',
        sampleEn: 'I like to go to the park with my family. We ride bicycles. It is fun.',
        sampleZh: 'I like to go to the park with my family. We ride bicycles. It is fun.',
      },
      {
        id: 'd1-en-dream',
        kind: 'speak',
        level: 3,
        cue: 'English · Dream job',
        promptZh: 'Future job + Thank you, teacher.',
        promptEn: 'I want to be a ____ because I can ____.',
        sampleEn: 'I want to be a teacher because I can help children learn. It is meaningful. Thank you, teacher.',
        sampleZh: 'I want to be a teacher because I can help children learn. Thank you, teacher.',
        tip: '追問：Why do you want to be a ____? What does a ____ do?',
      },
      {
        id: 'd1-m1',
        kind: 'math',
        level: 1,
        cue: '數學 Lv1',
        promptZh: '20 以內加法：8 + 5 = ?',
        answer: '13',
      },
      {
        id: 'd1-m2',
        kind: 'math',
        level: 1,
        cue: '數學 Lv1',
        promptZh: '20 以內減法：15 − 7 = ?',
        answer: '8',
      },
      {
        id: 'd1-m3',
        kind: 'math',
        level: 2,
        cue: '數學 Lv2',
        promptZh: '雙位數 + 個位數：23 + 5 = ?',
        answer: '28',
      },
      {
        id: 'd1-m4',
        kind: 'math',
        level: 2,
        cue: '數學 Lv2',
        promptZh: '雙位數 − 個位數：38 − 6 = ?',
        answer: '32',
      },
      {
        id: 'd1-m5',
        kind: 'math',
        level: 3,
        cue: '數學 Lv3',
        promptZh: '進位／退位：27 + 6 = ?',
        answer: '33',
      },
      {
        id: 'd1-m6',
        kind: 'math',
        level: 3,
        cue: '數學 Lv3',
        promptZh: '進位／退位：42 − 7 = ?',
        answer: '35',
      },
      {
        id: 'd1-m7',
        kind: 'math',
        level: 4,
        cue: '數學 Lv4',
        promptZh: '混合運算：8 + 7 − 3 = ?',
        answer: '12',
        tip: '由左到右計。答錯也讚勇敢嘗試！',
      },
      {
        id: 'd1-m8',
        kind: 'math',
        level: 4,
        cue: '數學 Lv4',
        promptZh: '整十數：120 + 30 = ?',
        answer: '150',
      },
    ],
  },
  {
    id: 'day2',
    day: 2,
    title: 'Day 2 看圖與指令',
    subtitle: '看圖選句 · 先後順序 · 聽指令',
    color: '#F5C84C',
    accent: '#8A6A12',
    icon: '2',
    activities: [
      {
        id: 'd2-v',
        kind: 'speak',
        level: 1,
        cue: '詞匯',
        promptZh: '跟著讀：吃飯、喝水、跑步、跳躍、讀書、睡覺、寫字、收拾',
        sampleZh: '吃飯。喝水。跑步。跳躍。讀書。睡覺。寫字。收拾。',
      },
      {
        id: 'd2-c1',
        kind: 'choice',
        level: 1,
        cue: '看圖選句',
        promptZh: '圖意：弟弟在床上睡覺，窗外有月亮。請先讀出選項，再選正確句子。',
        choices: [
          { text: '弟弟在睡覺', correct: true },
          { text: '弟弟在收拾書包', correct: false },
          { text: '弟弟在吃飯', correct: false },
        ],
      },
      {
        id: 'd2-c2',
        kind: 'choice',
        level: 1,
        cue: '看圖選句',
        promptZh: '圖意：妹妹在陽光公園裏跑步。請先讀出選項，再選正確句子。',
        choices: [
          { text: '妹妹在公園玩耍', correct: false },
          { text: '妹妹在教室裏跑步', correct: false },
          { text: '妹妹在公園裏跑步', correct: true },
        ],
      },
      {
        id: 'd2-c3',
        kind: 'choice',
        level: 1,
        cue: '看圖選句',
        promptZh: '圖意：學生們在課室專心看書。請先讀出選項，再選正確句子。',
        choices: [
          { text: '學生在教室睡覺', correct: false },
          { text: '學生在教室寫字', correct: false },
          { text: '學生在教室讀書', correct: true },
        ],
      },
      {
        id: 'd2-en1',
        kind: 'choice',
        level: 2,
        cue: 'Picture (EN)',
        promptZh: '圖意：小男孩正在喝水。',
        promptEn: 'Read the options, then choose.',
        choices: [
          { text: 'He is drinking water.', correct: true },
          { text: 'He is eating.', correct: false },
          { text: 'He is walking.', correct: false },
        ],
      },
      {
        id: 'd2-en2',
        kind: 'choice',
        level: 2,
        cue: 'Picture (EN)',
        promptZh: '圖意：小女孩在吃早餐／麵。',
        choices: [
          { text: 'She is eating noodles.', correct: true },
          { text: 'She is drinking milk.', correct: false },
          { text: 'She is eating breakfast.', correct: false },
        ],
        tip: '若圖是早餐場景，亦可接受 eating breakfast——家長可按圖調整。',
      },
      {
        id: 'd2-en3',
        kind: 'choice',
        level: 2,
        cue: 'Picture (EN)',
        promptZh: '圖意：女孩在看書做功課。',
        choices: [
          { text: 'She is writing her homework.', correct: false },
          { text: 'She is reading a book.', correct: true },
          { text: 'She is playing in the classroom.', correct: false },
        ],
      },
      {
        id: 'd2-seq',
        kind: 'speak',
        level: 2,
        cue: '先後順序',
        promptZh: '看三格圖（起床 → 刷牙 → 上學），用「首先／然後／最後」說出來。',
        promptEn: 'First, ... Then, ... At last, ...',
        sampleZh: '首先，小朋友起床。然後，他刷牙洗臉。最後，他背着書包上學。',
        sampleEn: 'First, he gets up. Then, he brushes his teeth. At last, he goes to school.',
      },
      {
        id: 'd2-opp',
        kind: 'prompt',
        level: 3,
        cue: '聽指令 · 做相反',
        promptZh: '家長讀指令，孜孜做「相反」動作。試試：舉起右手；踏前一步；企起身拍兩下手。',
        tip: '進階：單數拍手、雙數跳一下——但要做相反。家長說 3 → 跳；說 4 → 拍手。',
        fields: ['做完第 1 個指令', '做完第 2 個指令', '做完第 3 個指令'],
      },
      {
        id: 'd2-simon',
        kind: 'prompt',
        level: 4,
        cue: 'Simon says',
        promptZh: '家長用英文／廣東話混指令，例如：Raise your right hand, then clap once.／舉高左手，摸右耳，眨一下眼。',
        tip: '神校面試可能連續 2–3 個指令，或「唔好企起身」等雙重否定。混用語言練習。',
        fields: ['完成英文多步指令', '完成中英混合指令'],
      },
      {
        id: 'd2-m1',
        kind: 'math',
        level: 1,
        cue: '應用題',
        promptZh: '小明有 8 粒糖，媽媽再給他 5 粒，他現在有多少粒？',
        answer: '13',
        answers: ['13', '13粒'],
      },
      {
        id: 'd2-m2',
        kind: 'math',
        level: 1,
        cue: '應用題',
        promptZh: '書架上有 15 本書，借走了 6 本，還剩多少本？',
        answer: '9',
        answers: ['9', '9本'],
      },
      {
        id: 'd2-m3',
        kind: 'math',
        level: 2,
        cue: '應用題',
        promptZh: '公園有 12 個小朋友，再來了 7 個，又來了 5 個，現在共有多少個？',
        answer: '24',
      },
      {
        id: 'd2-m4',
        kind: 'math',
        level: 3,
        cue: '逆向',
        promptZh: '一個數加 7 等於 15，這個數是多少？',
        answer: '8',
      },
      {
        id: 'd2-m5',
        kind: 'math',
        level: 4,
        cue: '兩步逆向',
        promptZh: '一個數加 6 等於 14，再減 3 等於多少？',
        answer: '11',
        tip: '那個數加 6 得 14，再減 3 → 答案是 11。',
      },
    ],
  },
  {
    id: 'day3',
    day: 3,
    title: 'Day 3 重組與分享',
    subtitle: '重組句子 · 玩耍經歷 · 倍數比較',
    color: '#6BCB8B',
    accent: '#1F6B3A',
    icon: '3',
    activities: [
      {
        id: 'd3-v',
        kind: 'speak',
        level: 1,
        cue: '詞匯',
        promptZh: '跟著讀：唱歌、跳舞、踩單車、做功課、溫習、玩耍、分享、游泳',
        sampleZh: '唱歌。跳舞。踩單車。做功課。溫習。玩耍。分享。游泳。',
        promptEn: 'sing · dance · cycle · do homework',
      },
      {
        id: 'd3-r1',
        kind: 'reorder',
        level: 1,
        cue: '重組 Lv1',
        promptZh: '把詞語排成完整句子。',
        fragments: ['在游泳池', '小男孩', '游泳。'],
        correctOrder: ['小男孩', '在游泳池', '游泳。'],
      },
      {
        id: 'd3-r2',
        kind: 'reorder',
        level: 2,
        cue: '重組 Lv2',
        promptZh: '把詞語排成完整句子。',
        fragments: ['妹妹', '在書桌上', '晚上，', '做功課。'],
        correctOrder: ['晚上，', '妹妹', '在書桌上', '做功課。'],
      },
      {
        id: 'd3-r3',
        kind: 'reorder',
        level: 3,
        cue: '重組 Lv3',
        promptZh: '把詞語排成完整句子。',
        fragments: ['媽媽', '我和弟弟', '帶', '星期天，', '到公園', '玩耍。'],
        correctOrder: ['星期天，', '媽媽', '帶', '我和弟弟', '到公園', '玩耍。'],
      },
      {
        id: 'd3-r4',
        kind: 'reorder',
        level: 4,
        cue: '重組 Lv4',
        promptZh: '把詞語排成完整句子。',
        fragments: ['在房間裏', '溫習', '認真地', '快到考試，', '哥哥', '課本。'],
        correctOrder: ['快到考試，', '哥哥', '在房間裏', '認真地', '溫習', '課本。'],
      },
      {
        id: 'd3-share',
        kind: 'prompt',
        level: 2,
        cue: '分享經歷',
        promptZh: '分享一次玩耍的經歷。按提示講：時間、人物、地點、事情、為何、心情。',
        sampleZh: '上星期六，我和媽媽去公園玩滑梯。因為天氣很好，我們玩得很開心。',
        fields: ['時間', '人物', '地點', '事情', '為何', '心情'],
      },
      {
        id: 'd3-en-q',
        kind: 'speak',
        level: 2,
        cue: 'English Q&A',
        promptZh: '用完整句子回答英文問題。',
        promptEn: 'What do you like to do? Where? Who with? Why? How do you feel?',
        sampleEn:
          'I like cycling. I cycle in the park. I play with my daddy. Because it is fun. I feel happy.',
        sampleZh:
          'I like cycling. I cycle in the park. I play with my daddy. Because it is fun. I feel happy.',
      },
      {
        id: 'd3-m1',
        kind: 'math',
        level: 1,
        cue: '比較',
        promptZh: '小明有 18 粒糖，小華有 12 粒糖，誰比較多？多多少粒？',
        answer: '小明多6',
        answers: ['小明', '小明多6', '6', '小明多6粒'],
        tip: '完整答：小明比較多，多 6 粒。',
      },
      {
        id: 'd3-m2',
        kind: 'math',
        level: 2,
        cue: '倍數',
        promptZh: '妹妹有 5 粒糖，哥哥的糖是妹妹的 2 倍，哥哥有多少粒？',
        answer: '10',
      },
      {
        id: 'd3-m3',
        kind: 'math',
        level: 3,
        cue: '部分整體',
        promptZh: '蘋果和橙共 18 個，蘋果有 10 個，橙有幾個？誰多？多多少？',
        answer: '橙8蘋果多2',
        answers: ['8', '橙8', '蘋果多2', '蘋果多2個'],
        tip: '橙有 8 個；蘋果多 2 個。',
      },
      {
        id: 'd3-m4',
        kind: 'math',
        level: 4,
        cue: '平均',
        promptZh: '3 個好朋友共有 9 粒糖，平均每人有幾粒？',
        answer: '3',
      },
    ],
  },
  {
    id: 'day4',
    day: 4,
    title: 'Day 4 情緒與時間',
    subtitle: '情緒表達 · 英文短文 · 時間日曆',
    color: '#FF9B7A',
    accent: '#A0452A',
    icon: '4',
    activities: [
      {
        id: 'd4-emo1',
        kind: 'choice',
        level: 1,
        cue: '情緒',
        promptZh: '你收到一份禮物，你會覺得點？',
        choices: [
          { text: '開心／興奮', correct: true },
          { text: '傷心', correct: false },
          { text: '生氣', correct: false },
        ],
      },
      {
        id: 'd4-emo2',
        kind: 'speak',
        level: 2,
        cue: '情緒句子',
        promptZh: '用完整句子表達情緒：我覺得____，因為____。',
        sampleZh: '我覺得開心，因為媽媽送了禮物給我。',
      },
      {
        id: 'd4-solve',
        kind: 'speak',
        level: 3,
        cue: '情境解難',
        promptZh: '同學搶你的玩具，你會說什麼？怎樣處理情緒？',
        sampleZh:
          '首先，我會覺得不开心。但我不會打他。我會說：「可不可以輪流玩？」因為打人是不對的。',
        tip: '先認情緒 → 不做傷害行為 → 講出解決方法。',
      },
      {
        id: 'd4-ben',
        kind: 'choice',
        level: 1,
        cue: 'Reading Lv1',
        promptZh:
          'Ben is excited today. He is going to the zoo with his family. He wants to see the elephants and monkeys. Where is Ben going?',
        choices: [
          { text: 'To the zoo', correct: true },
          { text: 'To the park', correct: false },
          { text: 'To school', correct: false },
        ],
      },
      {
        id: 'd4-leo',
        kind: 'choice',
        level: 2,
        cue: 'Reading Lv2',
        promptZh:
          'Leo wants a red balloon but gets a blue one. He feels disappointed, then gives it to Tim who has none. How does Leo feel at the end?',
        choices: [
          { text: 'Proud of himself', correct: true },
          { text: 'Angry', correct: false },
          { text: 'Sleepy', correct: false },
        ],
      },
      {
        id: 'd4-lily',
        kind: 'speak',
        level: 2,
        cue: 'Reading · Lily',
        promptZh:
          'Lily is angry because her brother breaks her pencil case. She takes a deep breath and counts to ten. What can you do when you are angry?',
        sampleEn: 'I take a deep breath. I count to ten. I feel calm again.',
        sampleZh: '我會深呼吸，數到十，讓自己冷靜。',
      },
      {
        id: 'd4-sam',
        kind: 'speak',
        level: 3,
        cue: 'Reading Lv3 · Sam',
        promptZh:
          'Sam 生日故事：興奮→失望（藍裇衫）→興奮（遙控車）→擔心（下雨）→開心（室內賽道）。講出他有哪幾種心情。',
        sampleZh: 'Sam 有興奮、失望、擔心、開心等心情。最後他過了一個很棒的生日。',
        tip: 'Bonus：你失望／擔心時會怎樣做？',
      },
      {
        id: 'd4-t1',
        kind: 'math',
        level: 1,
        cue: '時間',
        promptZh: '現在是 3 時，2 小時後是幾點？',
        answer: '5',
        answers: ['5', '5時', '5點'],
      },
      {
        id: 'd4-t2',
        kind: 'math',
        level: 2,
        cue: '時間',
        promptZh: '現在是 2 時 30 分，30 分鐘後是幾點幾分？',
        answer: '3時',
        answers: ['3', '3時', '3:00', '3時0分', '3時00分'],
      },
      {
        id: 'd4-cal',
        kind: 'math',
        level: 2,
        cue: '日曆',
        promptZh: '今天是 6 月 8 日，明天是幾月幾日？',
        answer: '6月9日',
        answers: ['6月9日', '6/9', '九月', '9日'],
      },
      {
        id: 'd4-cal2',
        kind: 'math',
        level: 3,
        cue: '跨月',
        promptZh: '今天是 6 月 28 日，5 天後是幾月幾日？（六月有 30 天）',
        answer: '7月3日',
        answers: ['7月3日', '7/3', '七月三日'],
      },
    ],
  },
  {
    id: 'day5',
    day: 5,
    title: 'Day 5 家人故事',
    subtitle: '職業喜好 · 四格圖 · 金錢',
    color: '#F4A4B8',
    accent: '#8A2F4A',
    icon: '5',
    activities: [
      {
        id: 'd5-fam',
        kind: 'speak',
        level: 1,
        cue: '家人詞匯',
        promptZh: '讀出：爸爸、媽媽、哥哥、姐姐、弟弟、妹妹、爺爺、嫲嫲、外公、外婆',
        sampleZh: '爸爸、媽媽、哥哥、姐姐、弟弟、妹妹、爺爺、嫲嫲、外公、外婆。',
      },
      {
        id: 'd5-job',
        kind: 'speak',
        level: 2,
        cue: '職業介紹',
        promptZh: '介紹一位家人的工作（職業、地點、工作內容）。',
        sampleZh: '我爸爸是一位工程師。他在辦公室返工。他的工作是設計大廈，很厲害。',
        sampleEn: 'My father is an engineer. He works in an office. His job is to design buildings.',
        tip: '追問：工作辛苦嗎？想唔想做一樣？放假一齊做咩？',
      },
      {
        id: 'd5-hobby',
        kind: 'speak',
        level: 2,
        cue: '家人喜好',
        promptZh: '講家人喜好：睇書、煮嘢、影相、園藝、露營、釣魚、同我玩、同我聊天。',
        sampleZh: '我媽媽鍾意煮嘢，因為可以整好吃的晚餐。她經常都會煮給我們吃。',
        sampleEn: 'My mother likes cooking because she can make yummy dinner. She often cooks for us.',
      },
      {
        id: 'd5-story1',
        kind: 'speak',
        level: 2,
        cue: '四格圖 · 分享',
        promptZh:
          '故事：小明本來想自己吃曲奇，見到妹妹也想吃，就把曲奇分給妹妹。兩人都開心。你學到什麼？',
        sampleZh: '分享會令快樂加倍。小明把曲奇給妹妹，妹妹開心，小明自己也開心。',
      },
      {
        id: 'd5-story2',
        kind: 'speak',
        level: 3,
        cue: '四格圖 · 誠實',
        promptZh:
          '故事：小明踢球弄破花瓶，很害怕，最後鼓起勇氣向媽媽說對不起。媽媽讚他誠實。你學到什麼？',
        sampleZh: '做錯事不要緊，最緊要肯承認和承擔。誠實很重要。',
      },
      {
        id: 'd5-$1',
        kind: 'math',
        level: 1,
        cue: '金錢',
        promptZh: '買 12 元的書和 8 元的筆，共需付多少元？',
        answer: '20',
        answers: ['20', '20元'],
      },
      {
        id: 'd5-$2',
        kind: 'math',
        level: 2,
        cue: '找續',
        promptZh: '媽媽買了 23 元的東西，付 50 元，應找回多少元？',
        answer: '27',
        answers: ['27', '27元'],
      },
      {
        id: 'd5-$3',
        kind: 'math',
        level: 2,
        cue: '元角',
        promptZh: '買一本簿 3 元 2 角、一枝筆 2 元 5 角，共要付多少？（可寫 5 元 7 角）',
        answer: '5元7角',
        answers: ['5元7角', '5.7', '57角', '5元7'],
      },
      {
        id: 'd5-$4',
        kind: 'math',
        level: 3,
        cue: '找續+多樣',
        promptZh: '買 18 元巧克力 + 5 元糖果，付 50 元，找回多少？',
        answer: '27',
        answers: ['27', '27元'],
      },
      {
        id: 'd5-$5',
        kind: 'math',
        level: 4,
        cue: '綜合',
        promptZh: '爸爸用 50 元買菜 12.5、魚 18.8、肉 15.3。總共用了多少？還餘多少？',
        answer: '用46.6餘3.4',
        answers: ['46.6', '3.4', '用46.6餘3.4', '46元6角', '3元4角'],
        tip: '總額 46 元 6 角，餘 3 元 4 角。',
      },
    ],
  },
  {
    id: 'day6',
    day: 6,
    title: 'Day 6 閱讀複習',
    subtitle: '中英短文 · 聆聽選擇 · 綜合複習',
    color: '#5AD1C9',
    accent: '#176660',
    icon: '6',
    activities: [
      {
        id: 'd6-dad',
        kind: 'speak',
        level: 1,
        cue: '中文短文',
        promptZh:
          '短文：我的爸爸是消防員，每天早起上班，救火救人，十分勇敢。放假會陪我去公園騎單車、教功課。問：爸爸做什麼工作？放假會做什麼？你覺得爸爸是怎樣的人？',
        sampleZh: '爸爸是消防員。他放假會陪我騎單車和教功課。我覺得爸爸很勇敢，是一個好爸爸。',
      },
      {
        id: 'd6-ming',
        kind: 'choice',
        level: 2,
        cue: '騎單車故事',
        promptZh: '明明五歲，第一次騎單車跌倒想放棄，爸爸鼓勵他再試。最後成功。明明學到什麼？',
        choices: [
          { text: '只要堅持，就一定會成功', correct: true },
          { text: '騎單車太難，不要學', correct: false },
          { text: '跌倒就要馬上放棄', correct: false },
        ],
      },
      {
        id: 'd6-ming2',
        kind: 'speak',
        level: 3,
        cue: '延伸',
        promptZh: '你覺得明明是怎樣的孩子？你學到什麼道理？',
        sampleZh: '明明很勇敢，不輕易放棄。我學到跌倒了可以再試一次。',
      },
      {
        id: 'd6-en1',
        kind: 'choice',
        level: 1,
        cue: 'Listening EN',
        promptZh:
          'My father is a policeman. He works in a police station. What does my father do?',
        choices: [
          { text: 'He is a firefighter.', correct: false },
          { text: 'He is a policeman.', correct: true },
          { text: 'He is a doctor.', correct: false },
        ],
      },
      {
        id: 'd6-en2',
        kind: 'choice',
        level: 1,
        cue: 'Listening EN',
        promptZh: 'What does my father wear?',
        choices: [
          { text: 'A blue uniform.', correct: true },
          { text: 'A red uniform.', correct: false },
          { text: 'A white uniform.', correct: false },
        ],
      },
      {
        id: 'd6-en3',
        kind: 'choice',
        level: 2,
        cue: 'Listening EN',
        promptZh: 'When does my father play with me? What do we do?',
        choices: [
          { text: 'At weekends — park and football', correct: true },
          { text: 'On weekdays — watch TV', correct: false },
          { text: 'Every night — go swimming', correct: false },
        ],
      },
      {
        id: 'd6-en4',
        kind: 'choice',
        level: 2,
        cue: 'Listening EN',
        promptZh: 'Why is the writer proud of his father?',
        choices: [
          { text: 'Because his father is rich.', correct: false },
          { text: 'Because his father helps people and catches bad guys.', correct: true },
          { text: 'Because his father can run fast.', correct: false },
        ],
      },
      {
        id: 'd6-r1',
        kind: 'math',
        level: 1,
        cue: '複習 Lv1',
        promptZh: '現在是 10 時，3 小時後是幾時？',
        answer: '13',
        answers: ['13', '1', '13時', '1時', '下午1時'],
        tip: '也可以說下午 1 時。',
      },
      {
        id: 'd6-r2',
        kind: 'math',
        level: 1,
        cue: '複習 Lv1',
        promptZh: '小明有 8 粒糖，小華有 5 粒，誰比較多？',
        answer: '小明',
        answers: ['小明', '小明多'],
      },
      {
        id: 'd6-r3',
        kind: 'math',
        level: 2,
        cue: '複習 Lv2',
        promptZh: '一班 14 人，二班 9 人，哪班多？多幾多？',
        answer: '一班多5',
        answers: ['一班', '5', '一班多5', '多5'],
      },
      {
        id: 'd6-r4',
        kind: 'math',
        level: 3,
        cue: '複習 Lv3',
        promptZh: '買 4 元 6 角麵包 + 2 元 5 角牛奶，共多少？付 10 元找回多少？',
        answer: '共7.1找回2.9',
        answers: ['7.1', '2.9', '7元1角', '2元9角', '共7.1找回2.9'],
        tip: '共 7 元 1 角，找回 2 元 9 角。',
      },
    ],
  },
]

/** Short mock flow drawn from key speaking tasks */
export const mockInterview: Activity[] = [
  days[0].activities[1],
  days[0].activities[2],
  days[0].activities[4],
  days[0].activities[5],
  days[2].activities[5],
  days[3].activities[2],
  days[4].activities[1],
  days[5].activities[0],
  days[5].activities[3],
]

export function getDay(id: DayId): DayPlan | undefined {
  return days.find((d) => d.id === id)
}

export function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '').replace(/元角/g, '')
}

export function checkMath(activity: Activity, input: string): boolean {
  const accepted = (activity.answers ?? (activity.answer ? [activity.answer] : [])).map(normalizeAnswer)
  const got = normalizeAnswer(input)
  if (!got || accepted.length === 0) return false
  return accepted.some((a) => a.includes(got) || got.includes(a))
}
