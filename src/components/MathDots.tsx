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

function onesColumns(n: number) {
  if (n <= 0) return 1
  if (n <= 5) return n
  return 5
}

function Ones({ n, icon }: { n: number; icon: MathModel['icon'] }) {
  const count = Math.max(0, Math.min(n, 20))
  const cols = onesColumns(count)
  return (
    <div
      className={`math-ones math-ones--${icon} math-ones--cols${cols}`}
      style={{ gridTemplateColumns: `repeat(${cols}, var(--math-dot-size))` }}
      aria-hidden
    >
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="math-ones__bit" />
      ))}
    </div>
  )
}

function TensOnes({
  n,
  icon,
  take,
}: {
  n: number
  icon: MathModel['icon']
  take?: boolean
}) {
  if (!Number.isFinite(n) || n < 0) return null
  if (n > 99) {
    return <span className="math-num-tile">{n}</span>
  }
  const tens = n > 10 ? Math.floor(n / 10) : 0
  const ones = n > 10 ? n % 10 : n
  return (
    <div className={`math-place ${take ? 'math-place--take' : ''}`} aria-label={`${n}`}>
      {Array.from({ length: tens }, (_, i) => (
        <span key={`t-${i}`} className="math-ten" title="10" />
      ))}
      {ones > 0 || tens === 0 ? <Ones n={ones} icon={icon} /> : null}
    </div>
  )
}

function PieceView({
  piece,
  icon,
  take,
  blankGlyph,
}: {
  piece: MathPiece
  icon: MathModel['icon']
  take?: boolean
  blankGlyph: string
}) {
  if (piece.kind === 'count') return <TensOnes n={piece.n} icon={icon} take={take} />
  if (piece.kind === 'op') return <span className="math-dots__op">{OP_TEXT[piece.op]}</span>
  if (piece.kind === 'blank') return <span className="math-blank">{blankGlyph}</span>
  if (piece.kind === 'num') {
    return (
      <span className={`math-num-tile ${piece.blank ? 'is-blank' : ''}`}>
        {piece.blank ? blankGlyph : piece.n}
      </span>
    )
  }
  return (
    <div className="math-groups" aria-label={`${piece.groups} 組，每組 ${piece.each}`}>
      {Array.from({ length: piece.groups }, (_, g) => (
        <TensOnes key={g} n={piece.each} icon={icon} />
      ))}
    </div>
  )
}

function withEqualsBlank(pieces: MathPiece[]): MathPiece[] {
  const hasOp = pieces.some((p) => p.kind === 'op' && p.op !== '=')
  const hasBlank = pieces.some((p) => p.kind === 'blank' || (p.kind === 'num' && p.blank))
  const hasEquals = pieces.some((p) => p.kind === 'op' && p.op === '=')
  if (!hasOp || hasBlank || hasEquals) return pieces
  return [...pieces, { kind: 'op', op: '=' }, { kind: 'blank' }]
}

/** Keep operator glued to the following group so wrap never splits “3 +” from “2”. */
function clusterPieces(pieces: MathPiece[]): MathPiece[][] {
  if (pieces.length === 0) return []
  const clusters: MathPiece[][] = []
  let i = 0
  if (pieces[0].kind !== 'op') {
    clusters.push([pieces[0]])
    i = 1
  }
  while (i < pieces.length) {
    const chunk: MathPiece[] = []
    if (pieces[i].kind === 'op') {
      chunk.push(pieces[i])
      i += 1
    }
    if (i < pieces.length && pieces[i].kind !== 'op') {
      chunk.push(pieces[i])
      i += 1
    }
    if (chunk.length) clusters.push(chunk)
  }
  return clusters
}

function takeFlags(pieces: MathPiece[]): boolean[] {
  const flags = pieces.map(() => false)
  let takeNext = false
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i]
    if (piece.kind === 'op' && piece.op === '-') {
      takeNext = true
      continue
    }
    if (takeNext && piece.kind === 'count') flags[i] = true
    takeNext = false
  }
  return flags
}

/** Ten-rods + ones so a 5-year-old can count instead of reading the sum. */
export function MathDots({ model }: Props) {
  const isTiles = model.pieces.every((p) => p.kind === 'num' || p.kind === 'blank')
  const hasOp = model.pieces.some((p) => p.kind === 'op')
  const isGroups = model.pieces.some((p) => p.kind === 'groups')
  const isCompare = !isTiles && !hasOp && !isGroups
  const pieces = isTiles ? model.pieces : withEqualsBlank(model.pieces)
  const flags = takeFlags(pieces)
  const blankGlyph = isTiles ? '□' : '?'
  const layoutClass = [
    'math-dots',
    isTiles ? 'math-dots--tiles' : 'math-dots--ops',
    isGroups ? 'math-dots--groups' : '',
    isCompare ? 'math-dots--compare' : '',
  ]
    .filter(Boolean)
    .join(' ')

  if (isTiles) {
    return (
      <div className={layoutClass} role="img" aria-label="用圖數一數">
        {pieces.map((piece, i) => (
          <PieceView key={i} piece={piece} icon={model.icon} blankGlyph={blankGlyph} />
        ))}
      </div>
    )
  }

  const clusters = clusterPieces(pieces)
  let cursor = 0
  return (
    <div className={layoutClass} role="img" aria-label="用圖數一數">
      {clusters.map((chunk, c) => {
        const start = cursor
        cursor += chunk.length
        return (
          <span key={c} className="math-dots__term">
            {chunk.map((piece, j) => (
              <PieceView
                key={start + j}
                piece={piece}
                icon={model.icon}
                take={flags[start + j]}
                blankGlyph={blankGlyph}
              />
            ))}
          </span>
        )
      })}
    </div>
  )
}
