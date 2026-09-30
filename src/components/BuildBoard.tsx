import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { playSfx } from '../hooks/useSfx'
import type { BuildScene } from '../data/content'
import { BUILD_ART, gameArt } from '../lib/gameArt'

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
  return <img className="build-part" src={gameArt(BUILD_ART[id])} alt="" draggable={false} />
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
          <img className="build-stage__bg" src={gameArt('bridge-bg.jpg')} alt="" draggable={false} />
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
          <img className="build-stage__bg" src={gameArt('bridge-bg.jpg')} alt="" draggable={false} />
        )}
        {scene === 'party' && (
          <img className="build-stage__bg" src={gameArt('party-bg.jpg')} alt="" draggable={false} />
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
