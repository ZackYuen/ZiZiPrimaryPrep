import { HintPicture } from './HintPicture'
import { MathDots } from './MathDots'
import { KID } from '../lib/kidLabels'
import type { TeachHint } from '../lib/teachHint'

type Props = {
  hint: TeachHint
  open: boolean
  step: 1 | 2
  /** Picture already shown above the question — don't repeat A/B-style clutter. */
  hideArt?: boolean
  onToggle: () => void
  onMore: () => void
  onSpeak: (text: string) => void
}

/**
 * Always-available kid help: picture first, then a spoken clue.
 * Parents still have the separate P sample button.
 */
export function KidHelp({ hint, open, step, hideArt, onToggle, onMore, onSpeak }: Props) {
  const line = step >= 2 ? hint.moreLine : hint.kidLine
  return (
    <div className={`kid-help ${open ? 'is-open' : ''}`}>
      <button type="button" className="kid-help__btn" onClick={onToggle} aria-label="幫我睇圖">
        {KID.help}
        <span className="kid-help__btn-label">幫我</span>
      </button>
      {open && (
        <div className="kid-help__panel">
          <button type="button" className="kid-help__close" onClick={onToggle} aria-label="收起提示">
            ×
          </button>
          {!hideArt && <HintPicture visual={hint.visual} size={240} />}
          {hint.math && <MathDots model={hint.math} />}
          <p className="kid-help__line">{line}</p>
          <div className="session__actions">
            <button
              type="button"
              className="pill-btn"
              onClick={() => onSpeak(line)}
              aria-label="聽提示"
            >
              {KID.listen}
            </button>
            {step < 2 && (
              <button type="button" className="pill-btn pill-btn--soft" onClick={onMore} aria-label="再提示">
                {KID.help}{KID.help}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
