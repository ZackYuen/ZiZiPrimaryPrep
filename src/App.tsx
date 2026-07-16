import { useState } from 'react'
import { DayCard } from './components/DayCard'
import { PracticeSession } from './components/PracticeSession'
import { ParentGuide } from './components/ParentGuide'
import { VocabSession } from './components/VocabSession'
import { CHILD, days, getDay, mockInterview, type DayId } from './data/content'
import { useProgress } from './hooks/useProgress'
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

  if (view.name === 'parent') {
    return (
      <div className="app-shell">
        <ParentGuide stars={progress.stars} onReset={reset} onBack={() => setView({ name: 'home' })} />
      </div>
    )
  }

  if (view.name === 'vocab') {
    return (
      <div className="app-shell">
        <VocabSession
          completed={progress.completed}
          onMarkDone={markDone}
          onBack={() => setView({ name: 'home' })}
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
          onBack={() => setView({ name: 'home' })}
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
          <button type="button" className="ghost-btn" onClick={() => setView({ name: 'home' })}>
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
          onBack={() => setView({ name: 'home' })}
        />
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="sky" aria-hidden>
        <span className="sky__sun" />
        <span className="sky__cloud sky__cloud--a" />
        <span className="sky__cloud sky__cloud--b" />
        <span className="sky__hill" />
      </div>

      <header className="hero">
        <p className="hero__brand">孜孜升小面試</p>
        <h1 className="hero__name">{CHILD.nameZh}</h1>
        <p className="hero__tag">名校模擬面試 · 第一周字詞 + Day 1–6</p>
        <div className="hero__stars" aria-label={`已收集 ${progress.stars} 顆星`}>
          <span className="hero__star-icon">★</span>
          <span>{progress.stars} 顆星</span>
        </div>
      </header>

      <main className="home-main">
        <button type="button" className="mock-cta" onClick={() => setView({ name: 'mock' })}>
          <span className="mock-cta__label">開始模擬面試</span>
          <span className="mock-cta__sub">精選中英問答 · 像真傾偈</span>
        </button>

        <button type="button" className="vocab-cta" onClick={() => setView({ name: 'vocab' })}>
          <span className="vocab-cta__label">第一周字詞表</span>
          <span className="vocab-cta__sub">時間 · 人物 · 動作 · 地點（中英）</span>
        </button>

        <h2 className="section-label">第二周 · Day 1–6</h2>
        <div className="module-grid">
          {days.map((d, i) => (
            <DayCard
              key={d.id}
              day={d}
              doneCount={d.activities.filter((a) => progress.completed[a.id]).length}
              total={d.activities.length}
              delay={80 + i * 60}
              onOpen={() => setView({ name: 'day', id: d.id })}
            />
          ))}
        </div>

        <button type="button" className="parent-link" onClick={() => setView({ name: 'parent' })}>
          家長指引與金句
        </button>
      </main>
    </div>
  )
}
