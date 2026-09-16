import { useEffect, useRef, useState } from 'react'
import { playSfx } from '../hooks/useSfx'
import type { MemoryFace, MemoryGame as MemoryConfig } from '../data/content'
import { gameArt, MEMORY_ART } from '../lib/gameArt'

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
  return <img className="memory-face" src={gameArt(MEMORY_ART[face])} alt="" draggable={false} />
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
