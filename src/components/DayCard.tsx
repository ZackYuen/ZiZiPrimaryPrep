import type { CSSProperties } from 'react'
import type { DayPlan } from '../data/content'
import { playSfx, unlockAudio } from '../hooks/useSfx'

type Props = {
  day: DayPlan
  doneCount: number
  total: number
  onOpen: () => void
  delay?: number
}

const DAY_ART: Record<number, { bg: string; shape: string }> = {
  1: { bg: '#7EC8E3', shape: 'intro' },
  2: { bg: '#F5C84C', shape: 'eyes' },
  3: { bg: '#6BCB8B', shape: 'blocks' },
  4: { bg: '#FF9B7A', shape: 'heart' },
  5: { bg: '#F4A4B8', shape: 'home' },
  6: { bg: '#5AD1C9', shape: 'book' },
}

function DayGlyph({ day }: { day: number }) {
  const art = DAY_ART[day] ?? DAY_ART[1]
  return (
    <svg className="day-glyph" viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="18" fill={art.bg} />
      {art.shape === 'intro' && (
        <>
          <circle cx="32" cy="26" r="10" fill="#FFE08A" />
          <path d="M18 48c4-10 24-10 28 0" fill="#1B6B8A" />
        </>
      )}
      {art.shape === 'eyes' && (
        <>
          <circle cx="22" cy="28" r="8" fill="#fff" />
          <circle cx="42" cy="28" r="8" fill="#fff" />
          <circle cx="22" cy="28" r="3" fill="#1B3A4B" />
          <circle cx="42" cy="28" r="3" fill="#1B3A4B" />
          <path d="M24 42c4 4 12 4 16 0" fill="none" stroke="#8A6A12" strokeWidth="3" />
        </>
      )}
      {art.shape === 'blocks' && (
        <>
          <rect x="12" y="30" width="16" height="16" rx="3" fill="#fff" />
          <rect x="28" y="18" width="16" height="16" rx="3" fill="#FFE08A" />
          <rect x="36" y="34" width="16" height="16" rx="3" fill="#1F6B3A" opacity="0.85" />
        </>
      )}
      {art.shape === 'heart' && (
        <path
          d="M32 48s-14-9-14-20a8 8 0 0 1 14-5 8 8 0 0 1 14 5c0 11-14 20-14 20z"
          fill="#fff"
        />
      )}
      {art.shape === 'home' && (
        <>
          <path d="M12 30 L32 14 L52 30 V50 H12z" fill="#fff" />
          <rect x="28" y="36" width="8" height="14" fill="#8A2F4A" />
        </>
      )}
      {art.shape === 'book' && (
        <>
          <path d="M14 18h16v32H18a4 4 0 0 1-4-4V18z" fill="#fff" />
          <path d="M34 18h16v28a4 4 0 0 1-4 4H34V18z" fill="#FFE08A" />
        </>
      )}
      <text x="48" y="54" textAnchor="end" fontSize="14" fontWeight="700" fill="rgba(27,58,75,0.55)">
        {day}
      </text>
    </svg>
  )
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
      onClick={() => {
        unlockAudio()
        playSfx('tap')
        onOpen()
      }}
    >
      <span className="module-card__icon module-card__icon--art" aria-hidden>
        <DayGlyph day={day.day} />
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
