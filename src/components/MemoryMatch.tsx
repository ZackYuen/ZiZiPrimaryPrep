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
        <path d="M46 18 L62 8" stroke="#6bcb8b" strokeWidth="4" />
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
  if (face === 'penguin') {
    return (
      <svg viewBox="0 0 80 80" aria-hidden>
        <ellipse cx="40" cy="46" rx="20" ry="24" fill="#2c1810" />
        <ellipse cx="40" cy="50" rx="12" ry="16" fill="#fff" />
        <circle cx="34" cy="36" r="3" fill="#fff" />
        <circle cx="46" cy="36" r="3" fill="#fff" />
        <path d="M36 42 L40 48 L44 42 Z" fill="#ff9f6b" />
      </svg>
    )
  }
  if (face === 'elephant') {
    return (
      <svg viewBox="0 0 80 80" aria-hidden>
        <circle cx="36" cy="40" r="18" fill="#b7c0cc" stroke="#2c1810" strokeWidth="3" />
        <ellipse cx="22" cy="42" rx="8" ry="14" fill="#b7c0cc" stroke="#2c1810" strokeWidth="3" />
        <path d="M50 46 Q68 58 52 70" fill="none" stroke="#b7c0cc" strokeWidth="8" strokeLinecap="round" />
        <circle cx="32" cy="36" r="2.5" fill="#2c1810" />
      </svg>
    )
  }
  if (face === 'rabbit') {
    return (
      <svg viewBox="0 0 80 80" aria-hidden>
        <ellipse cx="28" cy="20" rx="6" ry="16" fill="#f3d2b3" stroke="#2c1810" strokeWidth="2.5" />
        <ellipse cx="48" cy="20" rx="6" ry="16" fill="#f3d2b3" stroke="#2c1810" strokeWidth="2.5" />
        <circle cx="38" cy="46" r="18" fill="#f3d2b3" stroke="#2c1810" strokeWidth="3" />
        <circle cx="32" cy="44" r="2.5" fill="#2c1810" />
        <circle cx="44" cy="44" r="2.5" fill="#2c1810" />
        <circle cx="38" cy="52" r="3" fill="#e85d75" />
      </svg>
    )
  }
  if (face === 'lion') {
    return (
      <svg viewBox="0 0 80 80" aria-hidden>
        <circle cx="40" cy="42" r="26" fill="#e8a820" />
        <circle cx="40" cy="42" r="16" fill="#f3d2b3" stroke="#2c1810" strokeWidth="3" />
        <circle cx="34" cy="40" r="2.5" fill="#2c1810" />
        <circle cx="46" cy="40" r="2.5" fill="#2c1810" />
        <path d="M34 50 Q40 54 46 50" fill="none" stroke="#2c1810" strokeWidth="2.5" />
      </svg>
    )
  }
  if (face === 'panda') {
    return (
      <svg viewBox="0 0 80 80" aria-hidden>
        <circle cx="40" cy="44" r="20" fill="#fff" stroke="#2c1810" strokeWidth="3" />
        <circle cx="26" cy="28" r="8" fill="#2c1810" />
        <circle cx="54" cy="28" r="8" fill="#2c1810" />
        <ellipse cx="32" cy="42" rx="6" ry="7" fill="#2c1810" />
        <ellipse cx="48" cy="42" rx="6" ry="7" fill="#2c1810" />
        <circle cx="32" cy="42" r="2" fill="#fff" />
        <circle cx="48" cy="42" r="2" fill="#fff" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 80 80" aria-hidden>
      <circle cx="40" cy="46" r="16" fill="#c47a4a" stroke="#2c1810" strokeWidth="3" />
      <circle cx="24" cy="34" r="8" fill="#c47a4a" stroke="#2c1810" strokeWidth="3" />
      <circle cx="56" cy="34" r="8" fill="#c47a4a" stroke="#2c1810" strokeWidth="3" />
      <circle cx="34" cy="44" r="2.5" fill="#2c1810" />
      <circle cx="46" cy="44" r="2.5" fill="#2c1810" />
      <ellipse cx="40" cy="52" rx="5" ry="3" fill="#2c1810" />
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
