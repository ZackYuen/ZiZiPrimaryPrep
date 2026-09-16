import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { playSfx } from '../hooks/useSfx'
import type { BuildScene } from '../data/content'

type PartId = 'star' | 'friend1' | 'friend2' | 'cake' | 'gift' | 'fun' | 'deck' | 'railL' | 'railR' | 'postL' | 'postR'

type Slot = { id: PartId; left: string; top: string; width: string }

type DragState = {
  id: PartId
  x: number
  y: number
  pointerId: number
}

type Props = {
  scene: BuildScene
  locked?: boolean
  reveal?: boolean
  onSolved: () => void
  onWrong?: () => void
}

const PARTY_SLOTS: Slot[] = [
  { id: 'star', left: '36%', top: '28%', width: '22%' },
  { id: 'friend1', left: '12%', top: '34%', width: '20%' },
  { id: 'friend2', left: '68%', top: '34%', width: '20%' },
  { id: 'cake', left: '38%', top: '58%', width: '22%' },
  { id: 'gift', left: '62%', top: '62%', width: '16%' },
  { id: 'fun', left: '8%', top: '62%', width: '18%' },
]

const BRIDGE_SLOTS: Slot[] = [
  { id: 'postL', left: '18%', top: '48%', width: '16%' },
  { id: 'postR', left: '66%', top: '48%', width: '16%' },
  { id: 'deck', left: '16%', top: '38%', width: '68%' },
  { id: 'railL', left: '16%', top: '22%', width: '18%' },
  { id: 'railR', left: '66%', top: '22%', width: '18%' },
]

const ORDER: PartId[] = ['postL', 'deck', 'railL']

function PartArt({ id }: { id: PartId }) {
  if (id === 'cake') {
    return (
      <svg viewBox="0 0 80 70" aria-hidden>
        <rect x="14" y="32" width="52" height="28" rx="8" fill="#f7d7e8" stroke="#2c1810" strokeWidth="3" />
        <rect x="18" y="20" width="44" height="18" rx="8" fill="#fff" stroke="#2c1810" strokeWidth="3" />
        <rect x="36" y="8" width="6" height="14" fill="#f4c24a" />
        <circle cx="39" cy="8" r="5" fill="#ff7a59" />
      </svg>
    )
  }
  if (id === 'gift') {
    return (
      <svg viewBox="0 0 70 70" aria-hidden>
        <rect x="12" y="24" width="46" height="36" rx="6" fill="#e85d75" stroke="#2c1810" strokeWidth="3" />
        <rect x="32" y="24" width="8" height="36" fill="#f5c84c" />
        <rect x="12" y="38" width="46" height="8" fill="#f5c84c" />
        <path d="M22 24 Q35 8 35 24" fill="none" stroke="#6bcb8b" strokeWidth="4" />
      </svg>
    )
  }
  if (id === 'fun') {
    return (
      <svg viewBox="0 0 70 70" aria-hidden>
        <ellipse cx="35" cy="38" rx="22" ry="16" fill="#c9a0dc" stroke="#2c1810" strokeWidth="3" />
        <rect x="32" y="10" width="6" height="20" fill="#2c1810" />
        <circle cx="35" cy="10" r="6" fill="#f5c84c" />
      </svg>
    )
  }
  if (id === 'deck') {
    return (
      <svg viewBox="0 0 140 36" aria-hidden>
        <rect x="6" y="8" width="128" height="20" rx="6" fill="#c47a4a" stroke="#2c1810" strokeWidth="3" />
      </svg>
    )
  }
  if (id === 'railL' || id === 'railR') {
    return (
      <svg viewBox="0 0 70 50" aria-hidden>
        <path d="M8 42 V12 H62 V42" fill="none" stroke="#6bcb8b" strokeWidth="8" strokeLinejoin="round" />
        <path d="M8 42 V12 H62 V42" fill="none" stroke="#2c1810" strokeWidth="3" />
      </svg>
    )
  }
  if (id === 'postL' || id === 'postR') {
    return (
      <svg viewBox="0 0 70 70" aria-hidden>
        <path d="M8 62 L35 8 L62 62 Z" fill="#f5c84c" stroke="#2c1810" strokeWidth="3" strokeLinejoin="round" />
      </svg>
    )
  }
  const fill = id === 'star' ? '#f4c24a' : '#7ec8e3'
  return (
    <svg viewBox="0 0 70 90" aria-hidden>
      <circle cx="35" cy="22" r="14" fill="#f3d2b3" stroke="#2c1810" strokeWidth="3" />
      <rect x="20" y="36" width="30" height="28" rx="10" fill={fill} stroke="#2c1810" strokeWidth="3" />
      {id === 'star' && <path d="M24 14 L35 4 L46 14" fill="#e85d75" />}
    </svg>
  )
}

export function BuildBoard({ scene, locked, reveal, onSolved, onWrong }: Props) {
  const canPointer = typeof window !== 'undefined' && 'PointerEvent' in window
  const slots = scene === 'party' ? PARTY_SLOTS : BRIDGE_SLOTS
  const needed = scene === 'party' ? PARTY_SLOTS.map((s) => s.id) : BRIDGE_SLOTS.map((s) => s.id)
  const [placed, setPlaced] = useState<Partial<Record<PartId, boolean>>>({})
  const [selected, setSelected] = useState<PartId | null>(null)
  const [orderStep, setOrderStep] = useState(0)
  const [orderCards] = useState<PartId[]>(() => [...ORDER].sort(() => Math.random() - 0.5))
  const [drag, setDrag] = useState<DragState | null>(null)
  const [ghostOn, setGhostOn] = useState(false)
  const [overSlot, setOverSlot] = useState<PartId | null>(null)
  const [shake, setShake] = useState(false)
  const solvedRef = useRef(false)
  const slotRefs = useRef<Partial<Record<PartId, HTMLButtonElement | null>>>({})
  const originRef = useRef({ x: 0, y: 0 })
  const ghostOnRef = useRef(false)
  const overSlotRef = useRef<PartId | null>(null)
  const dragRef = useRef<DragState | null>(null)

  const tray = needed.filter((id) => !placed[id])

  useEffect(() => {
    if (!reveal) return
    if (scene === 'bridge-order') {
      setOrderStep(ORDER.length)
    } else if (scene === 'bridge-shape') {
      setPlaced({ postL: true, postR: true })
    } else {
      const next: Partial<Record<PartId, boolean>> = {}
      needed.forEach((id) => {
        next[id] = true
      })
      setPlaced(next)
    }
    markSolved()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal, scene])

  const markSolved = () => {
    if (solvedRef.current || locked) return
    solvedRef.current = true
    onSolved()
  }

  useEffect(() => {
    if (scene === 'bridge-order' || scene === 'bridge-shape') return
    if (needed.every((id) => placed[id])) markSolved()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, scene])

  useEffect(() => {
    if (scene === 'bridge-order' && orderStep >= ORDER.length) markSolved()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderStep, scene])

  const bumpWrong = () => {
    playSfx('wrong')
    setShake(true)
    window.setTimeout(() => setShake(false), 420)
    onWrong?.()
  }

  const place = (id: PartId, slotId: PartId) => {
    if (locked) return
    if (id === slotId) {
      playSfx('tap')
      setPlaced((prev) => ({ ...prev, [id]: true }))
      setSelected(null)
      return
    }
    bumpWrong()
    setSelected(null)
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
    overSlotRef.current = null
    setOverSlot(null)
  }

  const beginDrag = (e: ReactPointerEvent<HTMLButtonElement>, id: PartId) => {
    if (locked) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    ghostOnRef.current = false
    setGhostOn(false)
    originRef.current = { x: e.clientX, y: e.clientY }
    const next = { id, x: e.clientX, y: e.clientY, pointerId: e.pointerId }
    dragRef.current = next
    setDrag(next)
    setSelected(null)
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
    overSlotRef.current = null
    setOverSlot(null)
    if (!moved) {
      setSelected(cur.id)
      return
    }
    if (slotId) place(cur.id, slotId)
  }

  if (scene === 'bridge-shape') {
    const pickedTri = !!placed.postL && !!placed.postR
    return (
      <div className={`build-board ${shake ? 'is-shake' : ''}`}>
        <p className="reorder__hint">撳令橋更穩嘅形狀（三角形支柱）</p>
        <div className="build-stage build-stage--bridge">
          <svg className="build-stage__bg" viewBox="0 0 300 160" aria-hidden>
            <rect width="300" height="160" rx="18" fill="#cfe8f5" />
            <ellipse cx="150" cy="130" rx="120" ry="22" fill="#7ec8e3" />
            <path d="M0 118 Q80 96 150 118 T300 118 V160 H0 Z" fill="#6bcb8b" />
          </svg>
          {BRIDGE_SLOTS.map((slot) => {
            const isTri = slot.id === 'postL' || slot.id === 'postR'
            const picked = !!placed[slot.id]
            return (
              <button
                key={slot.id}
                type="button"
                className={`build-slot is-filled ${picked && isTri ? 'is-drop-target' : ''}`}
                style={{ left: slot.left, top: slot.top, width: slot.width }}
                disabled={locked || pickedTri}
                onClick={() => {
                  if (isTri) {
                    playSfx('tap')
                    setPlaced((prev) => {
                      const next = { ...prev, [slot.id]: true }
                      if (next.postL && next.postR) {
                        window.setTimeout(() => markSolved(), 200)
                      }
                      return next
                    })
                  } else bumpWrong()
                }}
              >
                <PartArt id={slot.id} />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (scene === 'bridge-order') {
    const labels: Record<string, string> = { postL: '支柱', deck: '橋面', railL: '護欄' }
    return (
      <div className={`build-board ${shake ? 'is-shake' : ''}`}>
        <p className="reorder__hint">撳你會先砌嘅部分，然後下一個。</p>
        <div className="build-order">
          {orderCards.map((id) => {
            const doneAt = ORDER.indexOf(id)
            return (
              <button
                key={id}
                type="button"
                className={`build-order__card ${orderStep > doneAt ? 'is-done' : ''} ${ORDER[orderStep] === id ? 'is-ready' : ''}`}
                disabled={locked}
                onClick={() => {
                  if (id === ORDER[orderStep]) {
                    playSfx('tap')
                    setOrderStep((n) => n + 1)
                  } else bumpWrong()
                }}
              >
                <PartArt id={id} />
                <span>{labels[id]}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const ghost =
    drag && ghostOn
      ? createPortal(
          <div className="tan-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
            <PartArt id={drag.id} />
          </div>,
          document.body,
        )
      : null

  return (
    <div className={`build-board ${shake ? 'is-shake' : ''} ${drag ? 'is-dragging' : ''}`}>
      {ghost}
      <p className="reorder__hint">
        {canPointer ? '拖零件去圖上嘅空位' : selected ? '再撳空位' : '先撳零件，再撳空位'}
      </p>
      <div className={`build-stage build-stage--${scene}`}>
        {scene === 'bridge' && (
          <svg className="build-stage__bg" viewBox="0 0 300 160" aria-hidden>
            <rect width="300" height="160" rx="18" fill="#cfe8f5" />
            <ellipse cx="150" cy="130" rx="120" ry="22" fill="#7ec8e3" />
            <path d="M0 118 Q80 96 150 118 T300 118 V160 H0 Z" fill="#6bcb8b" />
          </svg>
        )}
        {scene === 'party' && (
          <svg className="build-stage__bg" viewBox="0 0 300 180" aria-hidden>
            <rect width="300" height="180" rx="18" fill="#fff4d6" />
            <rect x="20" y="118" width="260" height="18" rx="6" fill="#c47a4a" />
            <path d="M30 40 Q80 10 90 48" fill="none" stroke="#e85d75" strokeWidth="6" />
            <path d="M210 18 Q250 8 270 50" fill="none" stroke="#5b8def" strokeWidth="6" />
          </svg>
        )}
        {slots.map((slot) => {
          const filled = !!placed[slot.id]
          return (
            <button
              key={slot.id}
              type="button"
              ref={(el) => {
                slotRefs.current[slot.id] = el
              }}
              className={[
                'build-slot',
                filled ? 'is-filled' : '',
                selected === slot.id || overSlot === slot.id ? 'is-drop-target' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{ left: slot.left, top: slot.top, width: slot.width }}
              disabled={locked}
              onClick={() => {
                if (canPointer && !selected) return
                if (!filled && selected) place(selected, slot.id)
              }}
            >
              {filled ? <PartArt id={slot.id} /> : <span className="build-slot__ghost"><PartArt id={slot.id} /></span>}
            </button>
          )
        })}
      </div>
      <div className="build-tray" hidden={tray.length === 0}>
        {tray.map((id) => (
          <button
            key={id}
            type="button"
            className={`build-tray__piece ${selected === id ? 'is-selected' : ''}`}
            disabled={locked}
            style={{ touchAction: canPointer ? 'none' : 'manipulation' }}
            onClick={() => {
              if (canPointer) return
              playSfx('tap')
              setSelected(id)
            }}
            onPointerDown={canPointer ? (e) => beginDrag(e, id) : undefined}
            onPointerMove={canPointer ? moveDrag : undefined}
            onPointerUp={canPointer ? endDrag : undefined}
            onPointerCancel={canPointer ? endDrag : undefined}
          >
            <PartArt id={id} />
          </button>
        ))}
      </div>
    </div>
  )
}
