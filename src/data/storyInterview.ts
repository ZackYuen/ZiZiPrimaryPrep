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
  memoryPrompt: string
  endingQuestion: string
}

export const STORY_BROWSE_SECONDS = 60

export const storyInterviews: StoryInterview[] = [
  {
    id: 'ipad-story-teddy',
    title: '落雨了，啤啤熊呢？',
    shortTitle: '雨天的啤啤熊',
    accent: '#1B6B8A',
    memoryPrompt:
      '圖片收起咗。唔使背句子，跟住你記得嘅畫面慢慢講：碩孜帶咗邊個去公園？見到蝴蝶後做咗咩？落雨時漏低咗咩？返到屋企先發現咩？最後，如果你係碩孜，你會點做？',
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
    memoryPrompt:
      '圖片收起咗。唔使背句子，跟住你記得嘅畫面慢慢講：碩孜同美美做緊咩？個波飛咗去邊？花盆變成點？老師返嚟見到咩？最後，如果你係佢哋，你會點做？',
    endingQuestion: '老師入嚟之後，兩個小朋友會點做？',
    frames: [
      { id: 'plant-1', image: 'plant-1.jpg', alt: '碩孜同美美喺課室玩皮球' },
      { id: 'plant-2', image: 'plant-2.jpg', alt: '皮球突然飛向窗邊嘅盆栽' },
      { id: 'plant-3', image: 'plant-3.jpg', alt: '花盆跌落地打爛咗，兩個小朋友好擔心' },
      { id: 'plant-4', image: 'plant-4.jpg', alt: '老師返到課室，見到打爛咗嘅花盆' },
    ],
  },
]
