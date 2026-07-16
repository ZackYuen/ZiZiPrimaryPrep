import { useState } from 'react'
import { DayCard } from './components/DayCard'
import { PracticeSession } from './components/PracticeSession'
import { ParentGuide } from './components/ParentGuide'
import { VocabSession } from './components/VocabSession'
import { Mascot } from './components/Mascot'
import { SoundToggle } from './components/SoundToggle'
import { CHILD, days, getDay, mockInterview, type DayId } from './data/content'
import { useProgress } from './hooks/useProgress'
import { playSfx, unlockAudio } from './hooks/useSfx'
import './App.css'

type View =
  | { name: 'home' }
  | { name: 'day'; id: DayId }
  | { name: 'mock' }
  | { name: 'vocab' }
  | { name: 'parent' }

export default function App() {
  const [view, setView] = useState<View>({ name: 'home' })
  const { progress, markDone, reset } = useProgress()

  const go = (next: View) => {
    unlockAudio()
    playSfx(next.name === 'home' ? 'whoosh' : 'tap')
    setView(next)
  }

  if (view.name === 'parent') {
    return (
      <div className="app-shell">
        <ParentGuide stars={progress.stars} onReset={reset} onBack={() => go({ name: 'home' })} />
      </div>
    )
  }

  if (view.name === 'vocab') {
    return (
      <div className="app-shell">
        <VocabSession
          completed={progress.completed}
          onMarkDone={markDone}
          onBack={() => go({ name: 'home' })}
        />
      </div>
    )
  }

  if (view.name === 'mock') {
    return (
      <div className="app-shell">
        <PracticeSession
          title="模擬面試"
          accent="#1B3A4B"
          items={mockInterview}
          moduleKey="mock"
          completed={progress.completed}
          onMarkDone={markDone}
          onBack={() => go({ name: 'home' })}
          celebrate
        />
      </div>
    )
  }

  if (view.name === 'day') {
    const day = getDay(view.id)
    if (!day) {
      return (
        <div className="app-shell">
          <button type="button" className="ghost-btn" onClick={() => go({ name: 'home' })}>
            ← 返回
          </button>
          <p>找不到這一天的練習。</p>
        </div>
      )
    }
    return (
      <div className="app-shell">
        <PracticeSession
          title={day.title}
          accent={day.accent}
          items={day.activities}
          moduleKey={day.id}
          completed={progress.completed}
          onMarkDone={markDone}
          onBack={() => go({ name: 'home' })}
        />
      </div>
    )
  }

  return (
    <div className="app-shell app-shell--home">
      <div className="sky" aria-hidden>
        <span className="sky__sun" />
        <span className="sky__cloud sky__cloud--a" />
        <span className="sky__cloud sky__cloud--b" />
        <span className="sky__kite" />
        <span className="sky__bird sky__bird--1" />
        <span className="sky__bird sky__bird--2" />
        <span className="sky__hill" />
        <span className="sky__tree sky__tree--a" />
        <span className="sky__tree sky__tree--b" />
      </div>

      <div className="home-tools">
        <SoundToggle />
      </div>

      <header className="hero">
        <p className="hero__brand">碩孜升小面試</p>
        <div className="hero__mascot-wrap">
          <Mascot mood="wave" size={150} />
        </div>
        <h1 className="hero__name">{CHILD.nameShort}</h1>
        <p className="hero__fullname">
          {CHILD.nameZh} · {CHILD.fullNameEn}
        </p>
        <p className="hero__tag">
          {CHILD.kindergarten}幼稚園 · {CHILD.ageZh}歲升小準備
        </p>
        <div className="hero__stars" aria-label={`已收集 ${progress.stars} 顆星`}>
          <span className="hero__star-icon">★</span>
          <span>{progress.stars} 顆星</span>
        </div>
      </header>

      <main className="home-main">
        <button
          type="button"
          className="mock-cta"
          onClick={() => go({ name: 'mock' })}
        >
          <span className="mock-cta__art" aria-hidden>
            <Mascot mood="cheer" size={64} />
          </span>
          <span className="mock-cta__text">
            <span className="mock-cta__label">★ 面試</span>
            <span className="mock-cta__sub">精選中英問答 · 像真傾偈</span>
          </span>
        </button>

        <button type="button" className="vocab-cta" onClick={() => go({ name: 'vocab' })}>
          <span className="vocab-cta__badge" aria-hidden>
            A
          </span>
          <span>
            <span className="vocab-cta__label">A 字詞</span>
            <span className="vocab-cta__sub">時間 · 人物 · 動作 · 地點（中英）</span>
          </span>
        </button>

        <h2 className="section-label">Day</h2>
        <div className="module-grid">
          {days.map((d, i) => (
            <DayCard
              key={d.id}
              day={d}
              doneCount={d.activities.filter((a) => progress.completed[a.id]).length}
              total={d.activities.length}
              delay={80 + i * 60}
              onOpen={() => go({ name: 'day', id: d.id })}
            />
          ))}
        </div>

        <button type="button" className="parent-link" onClick={() => go({ name: 'parent' })}>
          P 家長
        </button>
      </main>
    </div>
  )
}
