import type { MathModel } from '../lib/teachHint'

type Props = {
  model: MathModel
}

function Ones({ n, icon }: { n: number; icon: MathModel['icon'] }) {
  const count = Math.max(0, Math.min(n, 20))
  return (
    <div className={`math-ones math-ones--${icon}`} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="math-ones__bit" />
      ))}
    </div>
  )
}

function TensOnes({ n, icon }: { n: number; icon: MathModel['icon'] }) {
  if (!Number.isFinite(n) || n < 0) return null
  if (n > 99) {
    return <span className="math-num-tile">{n}</span>
  }
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return (
    <div className="math-place">
      {Array.from({ length: tens }, (_, i) => (
        <span key={`t-${i}`} className="math-ten" title="10" />
      ))}
      <Ones n={ones} icon={icon} />
    </div>
  )
}

/** Ten-rods + ones so a 5-year-old can count instead of reading the sum. */
export function MathDots({ model }: Props) {
  const { left, right, op, icon } = model
  return (
    <div className="math-dots" aria-label="用圖數一數">
      <TensOnes n={left} icon={icon} />
      {op && right != null && (
        <>
          <span className="math-dots__op">{op === '+' ? '＋' : '－'}</span>
          <TensOnes n={right} icon={icon} />
        </>
      )}
    </div>
  )
}
