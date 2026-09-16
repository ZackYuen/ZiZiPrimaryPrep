export type StoryFrame = {
  id: string
  image: string
  alt: string
}

export type StoryInterview = {
  id: string
  title: string
  shortTitle: string
  accent: string
  frames: StoryFrame[]
  tellPrompt: string
  endingQuestion: string
}

export const STORY_ORDER_LABELS = ['首先', '跟住', '然後', '最後'] as const

export function shuffleStoryIds(ids: string[]): string[] {
  const original = ids.join('|')
  const next = [...ids]
  for (let attempt = 0; attempt < 12; attempt++) {
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const swap = next[i]
      next[i] = next[j]
      next[j] = swap
    }
    if (next.join('|') !== original) return next
  }
  if (next.length > 1) {
    const swap = next[0]
    next[0] = next[1]
    next[1] = swap
  }
  return next
}

export const storyInterviews: StoryInterview[] = [
  {
    id: 'ipad-story-teddy',
    title: '落雨了，啤啤熊呢？',
    shortTitle: '雨天的啤啤熊',
    accent: '#1B6B8A',
    tellPrompt:
      '跟住四格圖，由首先講到最後。講清楚邊個、喺邊、發生咗咩事。講完之後答：如果你係碩孜，會點樣搵返啤啤熊？',
    endingQuestion: '如果你係碩孜，會點樣搵返啤啤熊？',
    frames: [
      { id: 'teddy-1', image: 'teddy-1.jpg', alt: '碩孜帶住心愛嘅啤啤熊去公園' },
      { id: 'teddy-2', image: 'teddy-2.jpg', alt: '碩孜將啤啤熊放喺長櫈上，走去追蝴蝶' },
      { id: 'teddy-3', image: 'teddy-3.jpg', alt: '突然落大雨，碩孜急忙離開，啤啤熊仍然留喺長櫈' },
      { id: 'teddy-4', image: 'teddy-4.jpg', alt: '返到屋企，碩孜先發現啤啤熊唔見咗' },
    ],
  },
  {
    id: 'ipad-story-plant',
    title: '飛走了的皮球',
    shortTitle: '課室小意外',
    accent: '#B85C45',
    tellPrompt:
      '跟住四格圖，由首先講到最後。講清楚邊個、喺邊、發生咗咩事。講完之後答：老師入嚟之後，兩個小朋友會點做？',
    endingQuestion: '老師入嚟之後，兩個小朋友會點做？',
    frames: [
      { id: 'plant-1', image: 'plant-1.jpg', alt: '碩孜同美美喺課室玩皮球' },
      { id: 'plant-2', image: 'plant-2.jpg', alt: '皮球突然飛向窗邊嘅盆栽' },
      { id: 'plant-3', image: 'plant-3.jpg', alt: '花盆跌落地打爛咗，兩個小朋友好擔心' },
      { id: 'plant-4', image: 'plant-4.jpg', alt: '老師返到課室，見到打爛咗嘅花盆' },
    ],
  },
]
