import { useEffect, useMemo, useState } from 'react'

type Props = {
  show: boolean
  onDone?: () => void
  grand?: boolean
}

type Piece = {
  id: number
  left: number
  delay: number
  color: string
  rot: number
  size: number
}

const COLORS = ['#FF7A59', '#F5C84C', '#7EC8E3', '#6BCB8B', '#FF9B7A', '#FFE08A']

export function Confetti({ show, onDone, grand = false }: Props) {
  const [alive, setAlive] = useState(false)
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: grand ? 90 : 28 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.35,
        color: COLORS[i % COLORS.length],
        rot: Math.random() * 180,
        size: (grand ? 10 : 8) + Math.random() * (grand ? 16 : 10),
      })),
    // recreate when show flips on
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alive, grand],
  )

  useEffect(() => {
    if (!show) return
    setAlive(true)
    const t = window.setTimeout(() => {
      setAlive(false)
      onDone?.()
    }, grand ? 2900 : 1400)
    return () => window.clearTimeout(t)
  }, [show, onDone, grand])

  if (!alive) return null

  return (
    <div className={`confetti ${grand ? 'confetti--grand' : ''}`} aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti__piece"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            background: p.color,
            width: p.size,
            height: p.size * 0.6,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  )
}
