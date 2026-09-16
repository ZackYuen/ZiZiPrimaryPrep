import { useEffect, useRef, useState } from 'react'
import { playSfx } from '../hooks/useSfx'
import type { MemoryFace, MemoryGame as MemoryConfig } from '../data/content'

type Card = {
  key: string
  pairId: string
  face: MemoryFace
}

type Props = {
  config: MemoryConfig
  locked?: boolean
  reveal?: boolean
  onSolved: () => void
  onWrong?: () => void
}

function FaceArt({ face }: { face: MemoryFace }) {
  if (face === 'ball') {
    return (
      <svg viewBox="0 0 80 80" aria-hidden>
        <circle cx="40" cy="40" r="26" fill="#5B8DEF" stroke="#2c1810" strokeWidth="3" />
        <path d="M40 14 V66 M14 40 H66" stroke="#fff" strokeWidth="3" />
      </svg>
    )
  }
  if (face === 'umbrella') {
    return (
      <svg viewBox="0 0 80 80" aria-hidden>
        <path d="M14 42 Q40 10 66 42 Z" fill="#6BCB8B" stroke="#2c1810" strokeWidth="3" />
        <path d="M40 42 V64" stroke="#2c1810" strokeWidth="3" />
        <path d="M40 64 Q52 70 56 62" fill="none" stroke="#2c1810" strokeWidth="3" />
      </svg>
    )
  }
  if (face === 'carrot') {
    return (
      <svg viewBox="0 0 80 80" aria-hidden>
        <path d="M32 18 L48 18 L40 66 Z" fill="#ff7a59" stroke="#2c1810" strokeWidth="3" />
        <path d="M32 18 Q28 8 40 12 Q52 8 48 18" fill="#6bcb8b" />
      </svg>
    )
  }
  if (face === 'hat') {
    return (
      <svg viewBox="0 0 80 80" aria-hidden>
        <ellipse cx="40" cy="52" rx="28" ry="8" fill="#f5c84c" stroke="#2c1810" strokeWidth="3" />
        <rect x="24" y="22" width="32" height="30" rx="8" fill="#f5c84c" stroke="#2c1810" strokeWidth="3" />
      </svg>
    )
  }
  if (face === 'bamboo') {
    return (
      <svg viewBox="0 0 80 80" aria-hidden>
        <rect x="34" y="12" width="12" height="56" rx="4" fill="#6bcb8b" stroke="#2c1810" strokeWidth="3" />
        <path d="M34 30 H46 M34 48 H46" stroke="#2c1810" strokeWidth="3" />
      </svg>
    )
  }
  if (face === 'banana') {
    return (
      <svg viewBox="0 0 80 80" aria-hidden>
        <path d="M20 28 Q40 70 64 36 Q44 58 22 34 Z" fill="#f5c84c" stroke="#2c1810" strokeWidth="3" />
      </svg>
    )
  }
  const colors: Partial<Record<MemoryFace, string>> = {
    penguin: '#4a5564',
    elephant: '#b7c0cc',
    rabbit: '#f3d2b3',
    lion: '#e8a820',
    panda: '#f7f4ee',
    monkey: '#c47a4a',
  }
  return (
    <svg viewBox="0 0 80 80" aria-hidden>
      <circle cx="40" cy="42" r="24" fill={colors[face] || '#ddd'} stroke="#2c1810" strokeWidth="3" />
      <circle cx="32" cy="38" r="3" fill="#2c1810" />
      <circle cx="48" cy="38" r="3" fill="#2c1810" />
      {face === 'penguin' && <ellipse cx="40" cy="50" rx="10" ry="12" fill="#fff" />}
      {face === 'panda' && (
        <>
          <circle cx="28" cy="32" r="8" fill="#2c1810" />
          <circle cx="52" cy="32" r="8" fill="#2c1810" />
        </>
      )}
      {face === 'rabbit' && (
        <>
          <ellipse cx="28" cy="18" rx="6" ry="14" fill="#f3d2b3" stroke="#2c1810" strokeWidth="2" />
          <ellipse cx="52" cy="18" rx="6" ry="14" fill="#f3d2b3" stroke="#2c1810" strokeWidth="2" />
        </>
      )}
      {face === 'elephant' && <path d="M58 46 Q74 58 52 62" fill="none" stroke="#2c1810" strokeWidth="6" />}
      {face === 'lion' && <circle cx="40" cy="42" r="30" fill="none" stroke="#e8a820" strokeWidth="8" />}
    </svg>
  )
}

function shuffle<T>(list: T[]): T[] {
  const next = [...list]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = next[i]
    next[i] = next[j]
    next[j] = tmp
  }
  return next
}

export function MemoryMatch({ config, locked, reveal, onSolved, onWrong }: Props) {
  const [cards] = useState<Card[]>(() =>
    shuffle(
      config.pairs.flatMap((pair) => [
        { key: `${pair.id}-a`, pairId: pair.id, face: pair.a },
        { key: `${pair.id}-b`, pairId: pair.id, face: pair.b },
      ]),
    ),
  )
  const [open, setOpen] = useState<string[]>([])
  const [matched, setMatched] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const solvedRef = useRef(false)

  useEffect(() => {
    if (reveal) {
      setMatched(config.pairs.map((p) => p.id))
      setOpen(cards.map((c) => c.key))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal])

  useEffect(() => {
    if (matched.length === config.pairs.length && config.pairs.length > 0) {
      if (solvedRef.current) return
      solvedRef.current = true
      onSolved()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched])

  const flip = (card: Card) => {
    if (locked || busy || matched.includes(card.pairId) || open.includes(card.key)) return
    playSfx('tap')
    const next = [...open, card.key]
    setOpen(next)
    if (next.length % 2 === 1) return
    const [firstKey, secondKey] = next.slice(-2)
    const first = cards.find((c) => c.key === firstKey)
    const second = cards.find((c) => c.key === secondKey)
    if (!first || !second) return
    if (first.pairId === second.pairId) {
      setMatched((prev) => [...prev, first.pairId])
      return
    }
    setBusy(true)
    playSfx('wrong')
    onWrong?.()
    window.setTimeout(() => {
      setOpen((prev) => prev.filter((k) => k !== firstKey && k !== secondKey))
      setBusy(false)
    }, 700)
  }

  return (
    <div className="memory-board">
      <p className="reorder__hint">翻兩張，配對動物同佢攞住嘅嘢</p>
      <div className={`memory-grid memory-grid--${cards.length}`}>
        {cards.map((card) => {
          const isOpen = open.includes(card.key) || matched.includes(card.pairId)
          const isMatch = matched.includes(card.pairId)
          return (
            <button
              key={card.key}
              type="button"
              className={`memory-card ${isOpen ? 'is-open' : ''} ${isMatch ? 'is-matched' : ''}`}
              disabled={locked || busy}
              onClick={() => flip(card)}
            >
              {isOpen ? <FaceArt face={card.face} /> : <span className="memory-card__back">★</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
