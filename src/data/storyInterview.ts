export type StoryScene =
  | 'park-teddy'
  | 'chase-butterfly'
  | 'rain-leave'
  | 'home-missing'
  | 'indoor-ball'
  | 'plant-hit'
  | 'broken-pot'
  | 'teacher-arrives'

export type StoryFrame = {
  id: string
  scene: StoryScene
  alt: string
}

export type StoryInterview = {
  id: string
  title: string
  shortTitle: string
  accent: string
  frames: StoryFrame[]
  memoryPrompt: string
}

export const STORY_BROWSE_SECONDS = 60

export const storyInterviews: StoryInterview[] = [
  {
    id: 'ipad-story-teddy',
    title: '公園裡的啤啤熊',
    shortTitle: '啤啤熊',
    accent: '#1B6B8A',
    memoryPrompt:
      '圖片收起咗。請由頭講返個故事：首先發生咩事？跟住點樣？最後碩孜發現咗咩？再幫故事作一個新結尾。',
    frames: [
      { id: 'teddy-1', scene: 'park-teddy', alt: '小朋友帶著啤啤熊去公園' },
      { id: 'teddy-2', scene: 'chase-butterfly', alt: '小朋友放下啤啤熊去追蝴蝶' },
      { id: 'teddy-3', scene: 'rain-leave', alt: '突然下雨，小朋友急忙離開公園' },
      { id: 'teddy-4', scene: 'home-missing', alt: '回到家後，小朋友發現啤啤熊不見了' },
    ],
  },
  {
    id: 'ipad-story-plant',
    title: '課室裡的小意外',
    shortTitle: '小意外',
    accent: '#B85C45',
    memoryPrompt:
      '圖片收起咗。請由頭講返個故事：首先兩個小朋友做緊咩？跟住發生咩事？老師返嚟見到咩？再幫故事作一個新結尾。',
    frames: [
      { id: 'plant-1', scene: 'indoor-ball', alt: '兩個小朋友在課室裡玩球' },
      { id: 'plant-2', scene: 'plant-hit', alt: '皮球飛向窗邊的盆栽' },
      { id: 'plant-3', scene: 'broken-pot', alt: '花盆跌在地上打破了' },
      { id: 'plant-4', scene: 'teacher-arrives', alt: '老師回到課室看見打破的花盆' },
    ],
  },
]
