import type { CSSProperties } from 'react'
import type { DayPlan } from '../data/content'

type Props = {
  day: DayPlan
  doneCount: number
  total: number
  onOpen: () => void
  delay?: number
}

export function DayCard({ day, doneCount, total, onOpen, delay = 0 }: Props) {
  const pct = total ? Math.round((doneCount / total) * 100) : 0

  return (
    <button
      type="button"
      className="module-card"
      style={
        {
          '--card': day.color,
          '--card-accent': day.accent,
          animationDelay: `${delay}ms`,
        } as CSSProperties
      }
      onClick={onOpen}
    >
      <span className="module-card__icon" aria-hidden>
        {day.icon}
      </span>
      <span className="module-card__body">
        <span className="module-card__title">{day.title}</span>
        <span className="module-card__sub">{day.subtitle}</span>
        <span className="module-card__bar" aria-hidden>
          <span style={{ width: `${pct}%` }} />
        </span>
        <span className="module-card__meta">
          {doneCount}/{total} 完成
        </span>
      </span>
    </button>
  )
}
