import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { playSfx } from '../hooks/useSfx'
import type { TangramMode, TangramShape } from '../data/content'
import { gameArt } from '../lib/gameArt'

export type PieceId = 'L1' | 'L2' | 'M' | 'S1' | 'S2' | 'SQ' | 'P'

type SlotLayout = { id: PieceId; left: string; top: string; width: string; rotate?: number }

type DragFrom = { kind: 'tray' } | { kind: 'slot'; id: PieceId }

type DragState = {
  id: PieceId
  from: DragFrom
  x: number
  y: number
  pointerId: number
}

type Props = {
  mode: TangramMode
  shape?: TangramShape
  locked?: boolean
  reveal?: boolean
  onSolved: () => void
  onWrong?: () => void
}

const TANGRAM_PIECES: Record<
  PieceId,
  { color: string; wash: string; viewBox: string; path: string; triangle: boolean }
> = {
  L1: { color: '#d97860', wash: '#e8a08c', viewBox: '0 0 100 100', path: 'M8 8 H92 L8 92 Z', triangle: true },
  L2: { color: '#6faebc', wash: '#9cc9d3', viewBox: '0 0 100 100', path: 'M8 8 V92 H92 Z', triangle: true },
  M: { color: '#79aa82', wash: '#a3c7a8', viewBox: '0 0 80 80', path: 'M8 72 H72 L40 8 Z', triangle: true },
  S1: { color: '#e9bd55', wash: '#f3d48a', viewBox: '0 0 56 56', path: 'M6 6 H50 L6 50 Z', triangle: true },
  S2: { color: '#c4a3d4', wash: '#d8c2e4', viewBox: '0 0 56 56', path: 'M6 50 H50 V6 Z', triangle: true },
  SQ: { color: '#e09a6a', wash: '#eec09a', viewBox: '0 0 56 56', path: 'M6 6 H50 V50 H6 Z', triangle: false },
  P: { color: '#8bb8c8', wash: '#b5d4de', viewBox: '0 0 84 56', path: 'M22 6 H78 L62 50 H6 Z', triangle: false },
}

const PIECE_ORDER: PieceId[] = ['L1', 'L2', 'M', 'S1', 'S2', 'SQ', 'P']
const TRIANGLES: PieceId[] = ['L1', 'L2', 'M', 'S1', 'S2']
const SQUARE_PAIR: PieceId[] = ['S1', 'S2']

const TRIANGLE_SLOTS: SlotLayout[] = [
  { id: 'M', left: '36%', top: '2%', width: '28%' },
  { id: 'S1', left: '22%', top: '28%', width: '18%' },
  { id: 'SQ', left: '41%', top: '28%', width: '18%' },
  { id: 'S2', left: '60%', top: '28%', width: '18%' },
  { id: 'L1', left: '6%', top: '52%', width: '32%' },
  { id: 'P', left: '36%', top: '58%', width: '28%' },
  { id: 'L2', left: '62%', top: '52%', width: '32%', rotate: 180 },
]

/** Classic sailboat: sail on top, pointed bow/stern hull below. */
const BOAT_SLOTS: SlotLayout[] = [
  { id: 'M', left: '36%', top: '2%', width: '28%' },
  { id: 'S2', left: '23%', top: '16%', width: '14%', rotate: -28 },
  { id: 'S1', left: '63%', top: '16%', width: '14%', rotate: 28 },
  { id: 'SQ', left: '42%', top: '40%', width: '16%' },
  { id: 'L1', left: '8%', top: '50%', width: '26%', rotate: 180 },
  { id: 'L2', left: '66%', top: '50%', width: '26%' },
  { id: 'P', left: '32%', top: '60%', width: '36%' },
]

function BoatOutline() {
  return (
    <svg className="tan-boat-outline" viewBox="0 0 200 180" aria-hidden>
      <path
        className="tan-boat-outline__sail"
        d="M100 6 L146 80 L54 80 Z"
      />
      <path
        className="tan-boat-outline__hull"
        d="M12 86 L188 86 L160 172 L40 172 Z"
      />
    </svg>
  )
}

function TanShape({ id, ghost }: { id: PieceId; ghost?: boolean }) {
  const def = TANGRAM_PIECES[id]
  const gradId = `tan-wash-${id}`
  return (
    <svg viewBox={def.viewBox} className={`tan-shape ${ghost ? 'tan-shape--ghost' : ''}`} aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="18%" y1="8%" x2="86%" y2="94%">
          <stop offset="0%" stopColor={def.wash} />
          <stop offset="55%" stopColor={def.color} />
          <stop offset="100%" stopColor={def.wash} />
        </linearGradient>
      </defs>
      <path
        d={def.path}
        fill={`url(#${gradId})`}
        stroke="#5a4a38"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TangramBoard({ mode, shape = 'triangle', locked, reveal, onSolved, onWrong }: Props) {
  const canPointer = typeof window !== 'undefined' && 'PointerEvent' in window
  const slots = shape === 'boat' ? BOAT_SLOTS : TRIANGLE_SLOTS
  const [placed, setPlaced] = useState<Partial<Record<PieceId, boolean>>>({})
  const [picked, setPicked] = useState<PieceId[]>([])
  const [tapped, setTapped] = useState<PieceId[]>([])
  const [selected, setSelected] = useState<PieceId | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [ghostOn, setGhostOn] = useState(false)
  const [overSlot, setOverSlot] = useState<PieceId | null>(null)
  const [shake, setShake] = useState(false)
  const solvedRef = useRef(false)

  const slotRefs = useRef<Partial<Record<PieceId, HTMLButtonElement | null>>>({})
  const originRef = useRef({ x: 0, y: 0 })
  const ghostOnRef = useRef(false)
  const overSlotRef = useRef<PieceId | null>(null)
  const dragRef = useRef<DragState | null>(null)

  const tray = useMemo(() => PIECE_ORDER.filter((id) => !placed[id]), [placed])

  useEffect(() => {
    if (!reveal) return
    if (mode === 'assemble') {
      const next: Partial<Record<PieceId, boolean>> = {}
      PIECE_ORDER.forEach((id) => {
        next[id] = true
      })
      setPlaced(next)
    } else if (mode === 'pair') setPicked([...SQUARE_PAIR])
    else if (mode === 'count') setTapped([...PIECE_ORDER])
    else setTapped([...TRIANGLES])
  }, [reveal, mode])

  const markSolved = () => {
    if (solvedRef.current || locked) return
    solvedRef.current = true
    onSolved()
  }

  const bumpWrong = () => {
    setShake(true)
    window.setTimeout(() => setShake(false), 420)
    onWrong?.()
  }

  useEffect(() => {
    if (mode !== 'assemble') return
    if (PIECE_ORDER.every((id) => placed[id])) markSolved()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, mode])

  const placeOnSlot = (id: PieceId, slotId: PieceId) => {
    if (locked) return
    if (id === slotId) {
      playSfx('tap')
      setPlaced((prev) => ({ ...prev, [id]: true }))
      setSelected(null)
      return
    }
    playSfx('wrong')
    bumpWrong()
    setSelected(null)
  }

  const returnFromSlot = (id: PieceId) => {
    if (locked) return
    setPlaced((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const clearHover = () => {
    overSlotRef.current = null
    setOverSlot(null)
  }

  const updateHover = (clientX: number, clientY: number) => {
    for (let i = 0; i < slots.length; i++) {
      const id = slots[i].id
      const el = slotRefs.current[id]
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        overSlotRef.current = id
        setOverSlot(id)
        return
      }
    }
    clearHover()
  }

  const beginDrag = (e: ReactPointerEvent<HTMLButtonElement>, id: PieceId, from: DragFrom) => {
    if (locked) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    ghostOnRef.current = false
    setGhostOn(false)
    originRef.current = { x: e.clientX, y: e.clientY }
    const next: DragState = { id, from, x: e.clientX, y: e.clientY, pointerId: e.pointerId }
    dragRef.current = next
    setDrag(next)
    setSelected(null)
    clearHover()
  }

  const moveDrag = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const cur = dragRef.current
    if (!cur || e.pointerId !== cur.pointerId) return
    const dx = e.clientX - originRef.current.x
    const dy = e.clientY - originRef.current.y
    if (!ghostOnRef.current && dx * dx + dy * dy > 64) {
      ghostOnRef.current = true
      setGhostOn(true)
    }
    dragRef.current = { ...cur, x: e.clientX, y: e.clientY }
    setDrag(dragRef.current)
    updateHover(e.clientX, e.clientY)
  }

  const endDrag = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const cur = dragRef.current
    if (!cur || e.pointerId !== cur.pointerId) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    const slotId = overSlotRef.current
    const moved = ghostOnRef.current
    dragRef.current = null
    setDrag(null)
    setGhostOn(false)
    ghostOnRef.current = false
    clearHover()
    if (!moved) {
      setSelected(cur.id)
      return
    }
    if (slotId) placeOnSlot(cur.id, slotId)
    else if (cur.from.kind === 'slot') returnFromSlot(cur.id)
  }

  const onPieceTap = (id: PieceId) => {
    if (locked) return
    playSfx('tap')
    if (mode === 'pair') {
      if (picked.includes(id)) {
        setPicked((prev) => prev.filter((x) => x !== id))
        return
      }
      const next = [...picked, id].slice(-2)
      setPicked(next)
      if (next.length < 2) return
      const ok = SQUARE_PAIR.every((p) => next.includes(p))
      if (ok) markSolved()
      else {
        playSfx('wrong')
        bumpWrong()
        window.setTimeout(() => setPicked([]), 500)
      }
      return
    }
    if (mode === 'count' || mode === 'count-tri') {
      const allowed = mode === 'count' ? PIECE_ORDER : TRIANGLES
      if (!allowed.includes(id)) {
        playSfx('wrong')
        bumpWrong()
        return
      }
      const next = tapped.includes(id) ? tapped : [...tapped, id]
      setTapped(next)
      if (allowed.every((p) => next.includes(p))) markSolved()
    }
  }

  const hint =
    mode === 'assemble'
      ? canPointer
        ? selected
          ? '拖去或者撳同一個形狀'
          : shape === 'boat'
            ? '拖去帆船：上面係帆，下面係船身'
            : '拖圖形去上面空位'
        : selected
          ? '再撳同一個形狀'
          : shape === 'boat'
            ? '先撳圖形，再撳帆船上同一個形狀'
            : '先撳圖形，再撳空位'
      : mode === 'pair'
        ? '撳兩塊可以合成正方形嘅'
        : mode === 'count-tri'
          ? '撳晒所有三角形'
          : '撳晒七塊'

  const ghost =
    drag && ghostOn
      ? createPortal(
          <div className="tan-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
            <TanShape id={drag.id} ghost />
          </div>,
          document.body,
        )
      : null

  if (mode === 'assemble') {
    return (
      <div className={`tan-board ${shake ? 'is-shake' : ''} ${drag ? 'is-dragging' : ''}`}>
        {ghost}
        <p className="reorder__hint">{hint}</p>
        <div className={`tan-stage tan-stage--${shape}`}>
          <img
            className="tan-stage__paper"
            src={gameArt(shape === 'boat' ? 'tan-water.jpg' : 'tan-table.jpg')}
            alt=""
            draggable={false}
          />
          {shape === 'boat' && <BoatOutline />}
          {slots.map((slot) => {
            const filled = !!placed[slot.id]
            const isSource = drag?.from.kind === 'slot' && drag.id === slot.id && ghostOn
            return (
              <button
                key={slot.id}
                type="button"
                ref={(el) => {
                  slotRefs.current[slot.id] = el
                }}
                className={[
                  'tan-slot',
                  filled ? 'is-filled' : '',
                  selected === slot.id || overSlot === slot.id ? 'is-drop-target' : '',
                  isSource ? 'is-dragging-source' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={{
                  left: slot.left,
                  top: slot.top,
                  width: slot.width,
                  transform: slot.rotate ? `rotate(${slot.rotate}deg)` : undefined,
                }}
                disabled={locked}
                aria-label="七巧板空位"
                onClick={() => {
                  if (canPointer && !selected) return
                  if (filled) {
                    if (!canPointer) returnFromSlot(slot.id)
                    return
                  }
                  if (selected) placeOnSlot(selected, slot.id)
                }}
              >
                {filled && !isSource ? <TanShape id={slot.id} /> : <TanShape id={slot.id} />}
              </button>
            )
          })}
        </div>
        <div className="tan-tray" hidden={tray.length === 0}>
          {tray.map((id) => {
            const isSource = drag?.from.kind === 'tray' && drag.id === id && ghostOn
            return (
              <button
                key={id}
                type="button"
                className={[
                  'tan-tray__piece',
                  selected === id ? 'is-selected' : '',
                  isSource ? 'is-dragging-source' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={locked}
                style={{ touchAction: canPointer ? 'none' : 'manipulation' }}
                onClick={() => {
                  if (canPointer) return
                  playSfx('tap')
                  setSelected(id)
                }}
                onPointerDown={
                  canPointer
                    ? (e) => beginDrag(e, id, { kind: 'tray' })
                    : undefined
                }
                onPointerMove={canPointer ? moveDrag : undefined}
                onPointerUp={canPointer ? endDrag : undefined}
                onPointerCancel={canPointer ? endDrag : undefined}
              >
                <TanShape id={id} />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const activeSet = mode === 'pair' ? picked : tapped
  const count = mode === 'count' ? tapped.length : mode === 'count-tri' ? tapped.length : picked.length

  return (
    <div className={`tan-board tan-board--pick ${shake ? 'is-shake' : ''}`}>
      <p className="reorder__hint">
        {hint}
        {count > 0 ? ` · ${count}` : ''}
      </p>
      <div className="tan-pick-grid">
        {PIECE_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            className={`tan-pick ${activeSet.includes(id) ? 'is-selected' : ''}`}
            disabled={locked}
            onClick={() => onPieceTap(id)}
          >
            <TanShape id={id} />
          </button>
        ))}
      </div>
    </div>
  )
}
