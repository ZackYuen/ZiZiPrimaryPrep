import { KID } from '../lib/kidLabels'

type Props = {
  label: string
  value: string
  placeholder: string
  keys: readonly string[]
  locked: boolean
  padLabel: string
  onAppend: (key: string) => void
  onBackspace: () => void
  onSubmit: () => void
}

/** Number display + keypad + a wide ✓ so “type then check” is the one job. */
export function AnswerPad({
  label,
  value,
  placeholder,
  keys,
  locked,
  padLabel,
  onAppend,
  onBackspace,
  onSubmit,
}: Props) {
  const empty = !value
  return (
    <div className="math-box">
      <p className="math-box__label">{label}</p>
      <div className={`math-display ${empty ? 'is-empty' : ''}`} aria-live="polite">
        {value || <span className="math-display__placeholder">{placeholder}</span>}
      </div>
      <div
        className={`numpad ${keys.length === 10 ? 'numpad--dial' : ''}`}
        role="group"
        aria-label={padLabel}
      >
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            className="numpad__key"
            disabled={locked}
            onClick={() => onAppend(key)}
          >
            {key}
          </button>
        ))}
      </div>
      <div className="numpad-actions">
        <button
          type="button"
          className="numpad__key numpad__key--wide"
          disabled={locked || empty}
          onClick={onBackspace}
          aria-label="刪除"
        >
          ⌫
        </button>
        <button
          type="button"
          className="numpad__key numpad__key--wide numpad__key--go numpad__key--submit"
          disabled={locked || empty}
          onClick={onSubmit}
          aria-label="檢查答案"
        >
          {KID.check}
        </button>
      </div>
    </div>
  )
}
