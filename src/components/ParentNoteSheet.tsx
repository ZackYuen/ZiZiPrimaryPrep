import { useEffect } from 'react'
import type { SchoolParentNote } from '../data/schoolWeek'

type Props = {
  title: string
  note: SchoolParentNote
  onClose: () => void
}

/** Adult-only reading sheet inside a school session: never spoken, never scored. */
export function ParentNoteSheet({ title, note, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="parent-sheet" role="dialog" aria-modal="true" aria-label={`${title} 家長須知`}>
      <button type="button" className="parent-sheet__scrim" aria-label="關閉" onClick={onClose} />
      <div className="parent-sheet__panel">
        <header className="parent-sheet__head">
          <div>
            <p className="parent-sheet__kicker">家長專用 · 唔計分 · 小朋友唔使答</p>
            <h2 className="parent-sheet__title">{title} · 家長須知</h2>
          </div>
          <button type="button" className="ghost-btn parent-sheet__close" onClick={onClose} aria-label="關閉">
            ×
          </button>
        </header>
        <p className="parent-sheet__lead">{note.blurb}</p>
        <div className="parent-sheet__list">
          {note.talkingPoints.map((point) => (
            <article key={point.title} className="parent-sheet__item">
              <h3>{point.title}</h3>
              <p>{point.body}</p>
            </article>
          ))}
        </div>
        <button type="button" className="primary-btn primary-btn--wide parent-sheet__done" onClick={onClose}>
          返去練習
        </button>
      </div>
    </div>
  )
}
