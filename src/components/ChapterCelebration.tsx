import { useEffect } from 'react'
import { Confetti } from './Confetti'
import { Mascot } from './Mascot'

type Props = {
  show: boolean
  title: string
  onDone: () => void
}

const DURATION_MS = 3000

/** Full-screen finale reserved for finishing a whole chapter/module. */
export function ChapterCelebration({ show, title, onDone }: Props) {
  useEffect(() => {
    if (!show) return
    const timer = window.setTimeout(onDone, DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [show, onDone])

  if (!show) return null

  return (
    <div className="chapter-finale" role="status" aria-live="assertive">
      <div className="chapter-finale__rays" aria-hidden />
      <Confetti show grand />
      <div className="chapter-finale__stars" aria-hidden>
        <span>★</span>
        <span>★</span>
        <span>★</span>
      </div>
      <div className="chapter-finale__card">
        <p className="chapter-finale__kicker">SUPER!</p>
        <Mascot mood="cheer" size={190} className="chapter-finale__mascot" />
        <h2>完成一章！</h2>
        <p>{title}</p>
        <div className="chapter-finale__trophy" aria-hidden>
          ★
        </div>
      </div>
    </div>
  )
}
