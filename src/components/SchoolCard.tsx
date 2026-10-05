import type { CSSProperties } from 'react'
import type { SchoolPlan } from '../data/schoolWeek'
import { playSfx, unlockAudio } from '../hooks/useSfx'
import { ensureBgm, startBgm } from '../lib/bgm'

type Props = {
  school: SchoolPlan
  doneCount: number
  total: number
  onOpen: () => void
  delay?: number
}

function SchoolGlyph({ id }: { id: SchoolPlan['id'] }) {
  if (id === 'cky') {
    return (
      <svg className="day-glyph" viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="18" fill="#7EC8E3" />
        <circle cx="32" cy="24" r="9" fill="#FFE08A" />
        <path d="M18 46c4-11 24-11 28 0" fill="#1B6B8A" />
        <rect x="22" y="38" width="20" height="6" rx="3" fill="#fff" />
      </svg>
    )
  }
  if (id === 'spcc') {
    return (
      <svg className="day-glyph" viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="18" fill="#E85D75" />
        <path d="M14 34 L32 16 L50 34 V50 H14z" fill="#fff" />
        <rect x="28" y="36" width="8" height="14" fill="#8A2F4A" />
      </svg>
    )
  }
  if (id === 'wkf') {
    return (
      <svg className="day-glyph" viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="18" fill="#6BCB8B" />
        <path d="M12 40 L32 18 L52 40 L44 40 L44 50 L20 50 L20 40z" fill="#fff" />
        <circle cx="32" cy="36" r="5" fill="#1F6B3A" />
      </svg>
    )
  }
  if (id === 'jando') {
    return (
      <svg className="day-glyph" viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="18" fill="#B8D46A" />
        <rect x="20" y="16" width="24" height="32" rx="12" fill="#7CB342" />
        <circle cx="27" cy="24" r="2.2" fill="#1B3A16" />
        <circle cx="37" cy="24" r="2.2" fill="#1B3A16" />
        <path d="M26 30 Q32 35 38 30" fill="none" stroke="#1B3A16" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="32" cy="38" r="2" fill="#2E4A1A" />
        <circle cx="32" cy="43" r="2" fill="#2E4A1A" />
      </svg>
    )
  }
  if (id === 'dbs') {
    return (
      <svg className="day-glyph" viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" rx="18" fill="#7EA8D6" />
        <rect x="14" y="16" width="36" height="36" rx="8" fill="#fff" />
        <path d="M32 16 v36 M14 34 h36" stroke="#1B4F8A" strokeWidth="3" />
        <polygon points="23,23 26,29 32,29 27,33 29,39 23,35 17,39 19,33 14,29 20,29" fill="#F5C84C" />
      </svg>
    )
  }
  return (
    <svg className="day-glyph" viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="18" fill="#F5C84C" />
      <rect x="12" y="18" width="16" height="20" rx="3" fill="#fff" />
      <rect x="24" y="26" width="16" height="20" rx="3" fill="#FFE08A" />
      <rect x="36" y="22" width="16" height="20" rx="3" fill="#fff" />
    </svg>
  )
}

export function SchoolCard({ school, doneCount, total, onOpen, delay = 0 }: Props) {
  const pct = total ? Math.round((doneCount / total) * 100) : 0

  return (
    <button
      type="button"
      className="module-card"
      style={
        {
          '--card': school.color,
          '--card-accent': school.accent,
          animationDelay: `${delay}ms`,
        } as CSSProperties
      }
      onClick={() => {
        unlockAudio()
        ensureBgm()
        startBgm()
        playSfx('tap')
        onOpen()
      }}
    >
      <span className="module-card__icon module-card__icon--art" aria-hidden>
        <SchoolGlyph id={school.id} />
      </span>
      <span className="module-card__body">
        <span className="module-card__title">{school.title}</span>
        <span className="module-card__sub">{school.subtitle}</span>
        <span className="module-card__sections">
          {school.sections.slice(0, 3).join(' · ')}
          {school.sections.length > 3 ? ' …' : ''}
        </span>
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
