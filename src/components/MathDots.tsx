import type { MathModel, MathOp, MathPiece } from '../lib/teachHint'

type Props = {
  model: MathModel
}

const OP_TEXT: Record<MathOp, string> = {
  '+': '＋',
  '-': '－',
  '×': '×',
  '÷': '÷',
  '=': '＝',
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

function PieceView({ piece, icon }: { piece: MathPiece; icon: MathModel['icon'] }) {
  if (piece.kind === 'count') return <TensOnes n={piece.n} icon={icon} />
  if (piece.kind === 'op') return <span className="math-dots__op">{OP_TEXT[piece.op]}</span>
  if (piece.kind === 'blank') return <span className="math-blank">□</span>
  if (piece.kind === 'num') {
    return (
      <span className={`math-num-tile ${piece.blank ? 'is-blank' : ''}`}>
        {piece.blank ? '□' : piece.n}
      </span>
    )
  }
  return (
    <div className="math-groups">
      {Array.from({ length: piece.groups }, (_, g) => (
        <TensOnes key={g} n={piece.each} icon={icon} />
      ))}
    </div>
  )
}

/** Ten-rods + ones so a 5-year-old can count instead of reading the sum. */
export function MathDots({ model }: Props) {
  const layout = model.pieces.every((p) => p.kind === 'num' || p.kind === 'blank') ? 'tiles' : 'ops'
  return (
    <div className={`math-dots math-dots--${layout}`} aria-label="用圖數一數">
      {model.pieces.map((piece, i) => (
        <PieceView key={i} piece={piece} icon={model.icon} />
      ))}
    </div>
  )
}
