import { useEffect, useState, type CSSProperties } from 'react'
import {
  shuffleStoryIds,
  storyInterviews,
  type StoryInterview,
} from '../data/storyInterview'
import type { ModuleKey } from '../hooks/useProgress'
import { useSpeech } from '../hooks/useSpeech'
import { playSfx, unlockAudio } from '../hooks/useSfx'
import { setBgmMood } from '../lib/bgm'
import { storyFrameSrc } from '../lib/storyFrameSrc'
import { Confetti } from './Confetti'
import { SoundToggle } from './SoundToggle'
import { StoryFrameArt } from './StoryFrameArt'
import { StoryOrderBoard } from './StoryOrderBoard'

type Props = {
  completed: Record<string, boolean>
  onMarkDone: (itemId: string, moduleKey: ModuleKey) => void
  onBack: () => void
}

type Phase = 'select' | 'play'

const emptySlots = (): (string | null)[] => [null, null, null, null]

export function StoryInterviewSession({ completed, onMarkDone, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('select')
  const [story, setStory] = useState<StoryInterview | null>(null)
  const [slots, setSlots] = useState<(string | null)[]>(emptySlots)
  const [pool, setPool] = useState<string[]>([])
  const [ordered, setOrdered] = useState(false)
  const [showWrong, setShowWrong] = useState(false)
  const [justStar, setJustStar] = useState(false)
  const { speak, stop } = useSpeech()

  useEffect(() => {
    setBgmMood(phase === 'play' && ordered ? 'listen' : 'practice')
  }, [phase, ordered])

  useEffect(() => () => stop(), [stop])

  const applyBoard = (next: { slots: (string | null)[]; pool: string[] }, current = story) => {
    setSlots(next.slots)
    setPool(next.pool)
    if (!current || ordered) return
    if (next.slots.some((id) => !id)) {
      setShowWrong(false)
      return
    }
    const ok = current.frames.every((frame, index) => next.slots[index] === frame.id)
    if (ok) {
      playSfx('correct')
      setShowWrong(false)
      setOrdered(true)
      return
    }
    playSfx('wrong')
    setShowWrong(true)
  }

  const startStory = (next: StoryInterview) => {
    unlockAudio()
    playSfx('tap')
    next.frames.forEach((frame) => {
      const image = new Image()
      image.src = storyFrameSrc(frame.image)
    })
    setStory(next)
    setSlots(emptySlots())
    setPool(shuffleStoryIds(next.frames.map((frame) => frame.id)))
    setOrdered(false)
    setShowWrong(false)
    setJustStar(false)
    setPhase('play')
  }

  const goBack = () => {
    stop()
    if (phase === 'select') {
      onBack()
      return
    }
    setPhase('select')
    setStory(null)
    setSlots(emptySlots())
    setPool([])
    setOrdered(false)
    setShowWrong(false)
  }

  const done = story ? Boolean(completed[story.id]) : false

  return (
    <section className="story-interview">
      <header className="session__top">
        <button type="button" className="ghost-btn" onClick={goBack} aria-label="返回">
          ←
        </button>
        <div className="story-interview__heading">
          <h1>iPad 看圖講故事</h1>
          <p>
            {phase === 'play'
              ? ordered
                ? '睇住四格圖講故事'
                : '拖圖入四格排次序'
              : '升小面試練習'}
          </p>
        </div>
        <SoundToggle />
      </header>

      {phase === 'select' && (
        <main className="story-select">
          <div className="story-how">
            <span>
              <b>1</b> 拖四張圖
            </span>
            <span>
              <b>2</b> 排先後次序
            </span>
            <span>
              <b>3</b> 睇圖講故事
            </span>
          </div>
          <p className="story-select__note">四張圖會打亂。拖去「首先、跟住、然後、最後」。</p>
          <div className="story-select__grid">
            {storyInterviews.map((item, index) => (
              <button
                type="button"
                className="story-choice"
                style={{ '--story-accent': item.accent } as CSSProperties}
                key={item.id}
                onClick={() => startStory(item)}
              >
                <StoryFrameArt image={item.frames[0].image} alt={item.frames[0].alt} />
                <span className="story-choice__body">
                  <strong>
                    故事 {index + 1} · {item.shortTitle}
                  </strong>
                  <span>{completed[item.id] ? '★ 已完成 · 再玩' : '拖圖排次序 · 開始'}</span>
                </span>
                <span className="story-choice__arrow" aria-hidden>
                  →
                </span>
              </button>
            ))}
          </div>
          <p className="story-select__parent">家長提示：小朋友自己拖圖，排好先後再講，唔好代拖。</p>
        </main>
      )}

      {phase === 'play' && story && (
        <main className="story-play">
          <StoryOrderBoard
            frames={story.frames}
            slots={slots}
            pool={pool}
            locked={ordered}
            showWrong={showWrong}
            onChange={applyBoard}
          />

          {showWrong && !ordered && (
            <p className="math-feedback is-no">再諗下邊張最先發生，拖去換一換。</p>
          )}

          {ordered && (
            <div className="story-recall__prompt">
              <p>次序啱喇！</p>
              <h2>講返成個故事</h2>
              <ol>
                <li>由「首先」講到「最後」。</li>
                <li>
                  <strong>{story.endingQuestion}</strong>
                </li>
              </ol>
              <button
                type="button"
                className="pill-btn pill-btn--soft"
                onClick={() => {
                  unlockAudio()
                  playSfx('tap')
                  speak(story.tellPrompt, 'zh-HK')
                }}
              >
                ▶ 聽提示
              </button>
            </div>
          )}

          {ordered && (
            <div className="story-parent-check">
              <div>
                <strong>{done ? '完成咗！' : '講完故事未？'}</strong>
                <span>{done ? '可以再玩，講另一個結尾。' : '家長確認：有次序，亦有新結尾。'}</span>
              </div>
              <button
                type="button"
                className={`speak-box__parent-star ${done ? 'is-done' : ''}`}
                disabled={done}
                onClick={() => {
                  unlockAudio()
                  stop()
                  playSfx('star')
                  onMarkDone(story.id, 'story')
                  setJustStar(true)
                }}
                aria-label={done ? '故事已完成' : '爸爸媽媽確認完成'}
              >
                ★
              </button>
            </div>
          )}

          <div className="story-recall__actions">
            <button type="button" className="primary-btn" onClick={() => startStory(story)}>
              ↻ 再試一次
            </button>
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                stop()
                setStory(null)
                setPhase('select')
              }}
            >
              揀另一個故事
            </button>
          </div>
        </main>
      )}

      <Confetti show={justStar} onDone={() => setJustStar(false)} />
      {justStar && <div className="star-burst">+1 ★</div>}
    </section>
  )
}
