import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { playSfx } from '../hooks/useSfx'
import type { PlaceCell } from '../data/content'
import { KidPic } from './KidPic'

type Props = {
  target: PlaceCell
  locked?: boolean
  reveal?: boolean
  onSolved: () => void
  onWrong?: () => void
}

const CELLS: { id: PlaceCell; aria: string }[] = [
  { id: 'tl', aria: '上面左邊' },
  { id: 'tr', aria: '上面右邊' },
  { id: 'bl', aria: '下面左邊' },
  { id: 'br', aria: '下面右邊' },
]

type Drag = { x: number; y: number; pointerId: number; moved: boolean }

function mascotSrc() {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}characters/zizi-point.png`
}

/**
 * Spoken 2×2 placement for a non-reader: the star he moves sits in a tray,
 * ZiZi stands beside the spoken cell pointing at it, and he drags the star
 * there (or taps the cell). Old iOS without Pointer Events still works by tap.
 */
export function PlaceGrid({ target, locked, reveal, onSolved, onWrong }: Props) {
  const canPointer = typeof window !== 'undefined' && 'PointerEvent' in window
  const [placed, setPlaced] = useState<PlaceCell | null>(null)
  const [bounce, setBounce] = useState<PlaceCell | null>(null)
  const [wrong, setWrong] = useState<PlaceCell[]>([])
  const [lifted, setLifted] = useState(false)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [over, setOver] = useState<PlaceCell | null>(null)
  const cellRefs = useRef<Partial<Record<PlaceCell, HTMLButtonElement | null>>>({})
  const originRef = useRef({ x: 0, y: 0 })
  const bounceTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (bounceTimer.current != null) window.clearTimeout(bounceTimer.current)
    },
    [],
  )

  const solved = placed === target || !!reveal
  const starCell = reveal ? target : placed ?? bounce
  const starInTray = !starCell
  const busy = locked || solved || bounce != null

  const drop = (cell: PlaceCell) => {
    if (busy) return
    setLifted(false)
    if (cell === target) {
      setPlaced(cell)
      playSfx('correct')
      onSolved()
      return
    }
    playSfx('wrong')
    setBounce(cell)
    setWrong((prev) => (prev.includes(cell) ? prev : [...prev, cell]))
    onWrong?.()
    bounceTimer.current = window.setTimeout(() => {
      setBounce(null)
      bounceTimer.current = null
    }, 650)
  }

  const cellAt = (x: number, y: number): PlaceCell | null => {
    for (const cell of CELLS) {
      const el = cellRefs.current[cell.id]
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return cell.id
    }
    return null
  }

  const onStarDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (busy) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    originRef.current = { x: e.clientX, y: e.clientY }
    setDrag({ x: e.clientX, y: e.clientY, pointerId: e.pointerId, moved: false })
  }

  const onStarMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag || e.pointerId !== drag.pointerId) return
    e.preventDefault()
    const dx = e.clientX - originRef.current.x
    const dy = e.clientY - originRef.current.y
    const moved = drag.moved || dx * dx + dy * dy > 36
    if (moved && !drag.moved) playSfx('tap')
    setDrag({ ...drag, x: e.clientX, y: e.clientY, moved })
    setOver(moved ? cellAt(e.clientX, e.clientY) : null)
  }

  const onStarUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag || e.pointerId !== drag.pointerId) return
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId)
    } catch {
      /* ignore */
    }
    const wasMoved = drag.moved
    setDrag(null)
    setOver(null)
    if (!wasMoved) {
      playSfx('tap')
      setLifted((v) => !v)
      return
    }
    const cell = cellAt(e.clientX, e.clientY)
    if (cell) drop(cell)
  }

  const onStarCancel = () => {
    setDrag(null)
    setOver(null)
  }

  const star = (
    <button
      type="button"
      className={`place-grid__star ${lifted ? 'is-lifted' : ''} ${drag?.moved ? 'is-hidden' : ''}`}
      aria-label="星星"
      disabled={busy}
      onPointerDown={canPointer ? onStarDown : undefined}
      onPointerMove={canPointer ? onStarMove : undefined}
      onPointerUp={canPointer ? onStarUp : undefined}
      onPointerCancel={canPointer ? onStarCancel : undefined}
      onClick={
        canPointer
          ? undefined
          : () => {
              playSfx('tap')
              setLifted((v) => !v)
            }
      }
    >
      <KidPic id="star" size={120} />
    </button>
  )

  const targetRow = target[0] === 't' ? 'top' : 'bottom'
  const targetSide = target[1] === 'l' ? 'left' : 'right'

  return (
    <div className={`place-grid ${bounce ? 'is-shake' : ''}`}>
      <div className="place-grid__tray" aria-hidden={!starInTray}>
        {starInTray ? star : <span className="place-grid__tray-empty" />}
      </div>

      <div
        className={`place-grid__stage place-grid__stage--${targetSide}`}
        role="group"
        aria-label="四格盒"
      >
        {!solved && (
          <img
            className={`place-grid__pointer place-grid__pointer--${targetSide} place-grid__pointer--${targetRow}`}
            src={mascotSrc()}
            alt=""
            draggable={false}
            aria-hidden
          />
        )}
        <div className="place-grid__box">
          {CELLS.map((cell) => {
            const isTarget = cell.id === target
            const hasStar = starCell === cell.id
            const triedWrong = wrong.includes(cell.id)
            return (
              <button
                key={cell.id}
                ref={(el) => {
                  cellRefs.current[cell.id] = el
                }}
                type="button"
                className={[
                  'place-grid__cell',
                  isTarget && !solved ? 'is-target' : '',
                  over === cell.id ? 'is-over' : '',
                  hasStar && solved ? 'is-correct' : '',
                  hasStar && bounce === cell.id ? 'is-bounce' : '',
                  triedWrong && !hasStar ? 'is-wrong' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={busy}
                aria-label={cell.aria}
                onClick={() => drop(cell.id)}
              >
                {hasStar ? (
                  <span className="place-grid__landed">
                    <KidPic id="star" size={96} />
                  </span>
                ) : isTarget && !solved ? (
                  <span className="place-grid__ghost" aria-hidden>
                    <KidPic id="star" size={80} />
                  </span>
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      {drag?.moved &&
        createPortal(
          <div className="place-grid__drag" style={{ left: drag.x, top: drag.y }} aria-hidden>
            <KidPic id="star" size={110} />
          </div>,
          document.body,
        )}
    </div>
  )
}
