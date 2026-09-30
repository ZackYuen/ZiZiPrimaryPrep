import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Confetti } from './Confetti'
import { Mascot } from './Mascot'
import { pickMascotLine } from '../lib/mascotPresence'
import { CORRECT_CELEBRATION_MS } from '../lib/correctCelebration'

type Props = {
  onDone?: () => void
}

/** Screen-center sparkle dirs — same English-class burst language as mascot tap. */
const SPARKS = [
  { dx: -78, dy: -92, ch: '✦', color: '#F5C84C', delay: '0s', size: '1.55rem' },
  { dx: 82, dy: -86, ch: '★', color: '#FF7A59', delay: '0.05s', size: '1.7rem' },
  { dx: -108, dy: -12, ch: '✦', color: '#6BCB8B', delay: '0.08s', size: '1.25rem' },
  { dx: 112, dy: -8, ch: '★', color: '#7EC8E3', delay: '0.04s', size: '1.35rem' },
  { dx: -72, dy: 70, ch: '★', color: '#FFE08A', delay: '0.1s', size: '1.2rem' },
  { dx: 76, dy: 74, ch: '✦', color: '#FF9B7A', delay: '0.07s', size: '1.3rem' },
  { dx: -18, dy: -118, ch: '✦', color: '#F5C84C', delay: '0.02s', size: '1.15rem' },
  { dx: 22, dy: -110, ch: '★', color: '#6BCB8B', delay: '0.09s', size: '1.45rem' },
] as const

/**
 * Kid-friendly full-screen cheer on a correct answer.
 * Mount once per success; pointer-events none so ★ 講完啦 / STT tip stay tappable.
 */
export function CorrectCelebration({ onDone }: Props) {
  const [line] = useState(() => pickMascotLine('cheer'))
  const onDoneRef = useRef(onDone)

  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    const t = window.setTimeout(() => onDoneRef.current?.(), CORRECT_CELEBRATION_MS)
    return () => window.clearTimeout(t)
  }, [])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="correct-celeb" role="status" aria-live="polite" data-correct-celebration="1">
      <Confetti show />
      <div className="correct-celeb__glow" aria-hidden />
      <div className="correct-celeb__stage">
        {SPARKS.map((s, i) => {
          const style = {
            color: s.color,
            fontSize: s.size,
            animationDelay: s.delay,
            '--dx': `${s.dx}px`,
            '--dy': `${s.dy}px`,
          } as CSSProperties
          return (
            <span key={i} className="correct-celeb__spark" style={style} aria-hidden>
              {s.ch}
            </span>
          )
        })}
        <span className="correct-celeb__ring" aria-hidden />
        <Mascot mood="cheer" size={168} className="correct-celeb__mascot" />
        <p className="correct-celeb__line">{line}</p>
      </div>
    </div>,
    document.body,
  )
}
