import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type TouchEvent as ReactTouchEvent,
} from 'react'
import {
  STORY_BROWSE_SECONDS,
  storyInterviews,
  type StoryInterview,
} from '../data/storyInterview'
import type { ModuleKey } from '../hooks/useProgress'
import { useSpeech } from '../hooks/useSpeech'
import { playSfx, unlockAudio } from '../hooks/useSfx'
import { setBgmMood } from '../lib/bgm'
import { Confetti } from './Confetti'
import { SoundToggle } from './SoundToggle'
import { StoryFrameArt, storyFrameSrc } from './StoryFrameArt'

type Props = {
  completed: Record<string, boolean>
  onMarkDone: (itemId: string, moduleKey: ModuleKey) => void
  onBack: () => void
}

type Phase = 'select' | 'study' | 'recall'

export function StoryInterviewSession({ completed, onMarkDone, onBack }: Props) {
  const [phase, setPhase] = useState<Phase>('select')
  const [story, setStory] = useState<StoryInterview | null>(null)
  const [frameIndex, setFrameIndex] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(STORY_BROWSE_SECONDS)
  const [justStar, setJustStar] = useState(false)
  const touchStartX = useRef<number | null>(null)
  const { speak, stop } = useSpeech()

  useEffect(() => {
    setBgmMood(phase === 'recall' ? 'listen' : 'practice')
  }, [phase])

  useEffect(() => {
    if (phase !== 'study' || !story) return
    const deadline = Date.now() + STORY_BROWSE_SECONDS * 1000
    const timer = window.setInterval(() => {
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setSecondsLeft(next)
      if (next === 0) {
        window.clearInterval(timer)
        playSfx('whoosh')
        setPhase('recall')
      }
    }, 250)
    return () => window.clearInterval(timer)
  }, [phase, story])

  useEffect(() => () => stop(), [stop])

  const chooseStory = (next: StoryInterview) => {
    unlockAudio()
    playSfx('tap')
    next.frames.forEach((frame) => {
      const image = new Image()
      image.src = storyFrameSrc(frame.image)
    })
    setStory(next)
    setFrameIndex(0)
    setSecondsLeft(STORY_BROWSE_SECONDS)
    setJustStar(false)
    setPhase('study')
  }

  const changeFrame = (next: number) => {
    if (!story) return
    const bounded = Math.max(0, Math.min(story.frames.length - 1, next))
    if (bounded === frameIndex) return
    setFrameIndex(bounded)
    playSfx('flip')
  }

  const finishStudy = () => {
    playSfx('whoosh')
    setPhase('recall')
  }

  const goBack = () => {
    stop()
    if (phase === 'select') {
      onBack()
      return
    }
    setPhase('select')
    setStory(null)
    setFrameIndex(0)
  }

  const onTouchStart = (event: ReactTouchEvent) => {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null
  }

  const onTouchEnd = (event: ReactTouchEvent) => {
    if (touchStartX.current === null) return
    const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 42) return
    changeFrame(frameIndex + (delta < 0 ? 1 : -1))
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
          <p>{phase === 'study' ? '記住每一張圖' : phase === 'recall' ? '收圖後自己講' : '升小面試練習'}</p>
        </div>
        <SoundToggle />
      </header>

      {phase === 'select' && (
        <main className="story-select">
          <div className="story-how">
            <span><b>1</b> 一分鐘逐張睇</span>
            <span><b>2</b> 圖片會收起</span>
            <span><b>3</b> 講返故事＋新結尾</span>
          </div>
          <p className="story-select__note">每頁只會見到一張圖。記住人物、地方、先後次序。</p>
          <div className="story-select__grid">
            {storyInterviews.map((item, index) => (
              <button
                type="button"
                className="story-choice"
                style={{ '--story-accent': item.accent } as CSSProperties}
                key={item.id}
                onClick={() => chooseStory(item)}
              >
                <StoryFrameArt image={item.frames[0].image} alt={item.frames[0].alt} />
                <span className="story-choice__body">
                  <strong>故事 {index + 1} · {item.shortTitle}</strong>
                  <span>{completed[item.id] ? '★ 已完成 · 再玩' : '60 秒 · 開始'}</span>
                </span>
                <span className="story-choice__arrow" aria-hidden>→</span>
              </button>
            ))}
          </div>
          <p className="story-select__parent">家長提示：睇圖階段唔好解釋，模擬小朋友自己操作 iPad。</p>
        </main>
      )}

      {phase === 'study' && story && (
        <main className="story-study">
          <div className={`story-timer ${secondsLeft <= 10 ? 'is-ending' : ''}`} role="timer" aria-live="polite">
            <span className="story-timer__clock" aria-hidden>◷</span>
            <strong>0:{String(secondsLeft).padStart(2, '0')}</strong>
            <span>仲有時間</span>
          </div>

          <div
            className="story-viewer"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <p className="story-viewer__counter">第 {frameIndex + 1} 張／共 {story.frames.length} 張</p>
            <StoryFrameArt
              key={story.frames[frameIndex].id}
              image={story.frames[frameIndex].image}
              alt={story.frames[frameIndex].alt}
            />
            <div className="story-viewer__dots" aria-hidden>
              {story.frames.map((frame, index) => (
                <span key={frame.id} className={index === frameIndex ? 'is-active' : ''} />
              ))}
            </div>
            <p className="story-viewer__swipe">← 左右掃，逐張記住 →</p>
          </div>

          <div className="story-nav">
            <button
              type="button"
              className="story-nav__button"
              disabled={frameIndex === 0}
              onClick={() => changeFrame(frameIndex - 1)}
              aria-label="上一張圖"
            >
              ←
            </button>
            <button type="button" className="pill-btn pill-btn--soft" onClick={finishStudy}>
              睇完 · 收圖
            </button>
            <button
              type="button"
              className="story-nav__button"
              disabled={frameIndex === story.frames.length - 1}
              onClick={() => changeFrame(frameIndex + 1)}
              aria-label="下一張圖"
            >
              →
            </button>
          </div>
        </main>
      )}

      {phase === 'recall' && story && (
        <main className="story-recall">
          <div className="story-hidden" aria-label="圖片已收起">
            {['首先', '跟住', '然後', '最後'].map((label) => (
              <div key={label}>
                <span aria-hidden>?</span>
                <strong>{label}</strong>
              </div>
            ))}
          </div>
          <div className="story-recall__prompt">
            <p>圖片收起咗！</p>
            <h2>講返成個故事</h2>
            <ol>
              <li>由第一張開始，講清楚先後次序。</li>
              <li><strong>{story.endingQuestion}</strong></li>
            </ol>
            <button
              type="button"
              className="pill-btn pill-btn--soft"
              onClick={() => {
                unlockAudio()
                playSfx('tap')
                speak(story.memoryPrompt, 'zh-HK')
              }}
            >
              ▶ 聽提示
            </button>
          </div>

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

          <div className="story-recall__actions">
            <button type="button" className="primary-btn" onClick={() => chooseStory(story)}>
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
