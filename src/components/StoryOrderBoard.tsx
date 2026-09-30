import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { STORY_ORDER_LABELS, type StoryFrame } from '../data/storyInterview'
import { playSfx } from '../hooks/useSfx'
import { storyFrameSrc } from '../lib/storyFrameSrc'
import { StoryFrameArt } from './StoryFrameArt'

type DragFrom = { kind: 'pool'; index: number } | { kind: 'slot'; index: number }

type DragState = {
  frameId: string
  from: DragFrom
  x: number
  y: number
  pointerId: number
}

type Props = {
  frames: StoryFrame[]
  slots: (string | null)[]
  pool: string[]
  locked?: boolean
  showWrong?: boolean
  onChange: (next: { slots: (string | null)[]; pool: string[] }) => void
}

function frameById(frames: StoryFrame[], id: string) {
  return frames.find((frame) => frame.id === id)
}

function placeFrame(
  slots: (string | null)[],
  pool: string[],
  frameId: string,
  slotIndex: number,
): { slots: (string | null)[]; pool: string[] } {
  const nextSlots = [...slots]
  const nextPool = [...pool]
  const occupant = nextSlots[slotIndex]
  if (occupant === frameId) return { slots: nextSlots, pool: nextPool }

  const fromSlot = nextSlots.findIndex((id) => id === frameId)
  const fromPool = nextPool.indexOf(frameId)

  if (fromSlot >= 0) nextSlots[fromSlot] = occupant
  else if (fromPool >= 0) {
    nextPool.splice(fromPool, 1)
    if (occupant) nextPool.push(occupant)
  }

  nextSlots[slotIndex] = frameId
  return { slots: nextSlots, pool: nextPool }
}

function returnFrame(
  slots: (string | null)[],
  pool: string[],
  frameId: string,
): { slots: (string | null)[]; pool: string[] } {
  return {
    slots: slots.map((id) => (id === frameId ? null : id)),
    pool: pool.includes(frameId) ? pool : [...pool, frameId],
  }
}

/**
 * Four-picture sequencing board. Pointer drag on modern iOS; tap-to-place on iOS 10.
 */
export function StoryOrderBoard({ frames, slots, pool, locked, showWrong, onChange }: Props) {
  const canPointer = typeof window !== 'undefined' && 'PointerEvent' in window
  const [selected, setSelected] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [ghostOn, setGhostOn] = useState(false)
  const [overSlot, setOverSlot] = useState<number | null>(null)
  const [overPool, setOverPool] = useState(false)

  const slotRefs = useRef<(HTMLDivElement | null)[]>([])
  const poolRef = useRef<HTMLDivElement | null>(null)
  const originRef = useRef({ x: 0, y: 0 })
  const ghostOnRef = useRef(false)
  const overSlotRef = useRef<number | null>(null)
  const overPoolRef = useRef(false)
  const dragRef = useRef<DragState | null>(null)

  const clearHover = () => {
    overSlotRef.current = null
    overPoolRef.current = false
    setOverSlot(null)
    setOverPool(false)
  }

  const updateHover = (clientX: number, clientY: number) => {
    for (let i = 0; i < slots.length; i++) {
      const el = slotRefs.current[i]
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        overSlotRef.current = i
        overPoolRef.current = false
        setOverSlot(i)
        setOverPool(false)
        return
      }
    }
    const poolEl = poolRef.current
    if (poolEl) {
      const r = poolEl.getBoundingClientRect()
      const inside =
        clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom
      overPoolRef.current = inside
      overSlotRef.current = null
      setOverPool(inside)
      setOverSlot(null)
      return
    }
    clearHover()
  }

  const beginDrag = (
    e: ReactPointerEvent<HTMLButtonElement>,
    frameId: string,
    from: DragFrom,
  ) => {
    if (locked) return
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    ghostOnRef.current = false
    setGhostOn(false)
    originRef.current = { x: e.clientX, y: e.clientY }
    const next: DragState = {
      frameId,
      from,
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
    }
    dragRef.current = next
    setDrag(next)
    setSelected(null)
    clearHover()
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    const cur = dragRef.current
    if (!cur || e.pointerId !== cur.pointerId) return
    e.preventDefault()
    const dx = e.clientX - originRef.current.x
    const dy = e.clientY - originRef.current.y
    if (!ghostOnRef.current && dx * dx + dy * dy > 36) {
      ghostOnRef.current = true
      setGhostOn(true)
      playSfx('tap')
    }
    const next = { ...cur, x: e.clientX, y: e.clientY }
    dragRef.current = next
    setDrag(next)
    if (ghostOnRef.current) updateHover(e.clientX, e.clientY)
  }

  const finishDrag = (e: ReactPointerEvent) => {
    const cur = dragRef.current
    if (!cur || e.pointerId !== cur.pointerId) return
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId)
    } catch {
      /* ignore */
    }

    const moved = ghostOnRef.current
    const { frameId, from } = cur
    dragRef.current = null
    setDrag(null)
    setGhostOn(false)
    ghostOnRef.current = false

    if (!moved) {
      if (from.kind === 'slot') {
        if (selected && selected !== frameId) {
          playSfx('tap')
          onChange(placeFrame(slots, pool, selected, from.index))
          setSelected(null)
        } else {
          playSfx('tap')
          setSelected((curSel) => (curSel === frameId ? null : frameId))
        }
      } else {
        playSfx('tap')
        setSelected((curSel) => (curSel === frameId ? null : frameId))
      }
      clearHover()
      return
    }

    if (overSlotRef.current != null) {
      playSfx('tap')
      onChange(placeFrame(slots, pool, frameId, overSlotRef.current))
      setSelected(null)
      clearHover()
      return
    }

    if (overPoolRef.current && from.kind === 'slot') {
      playSfx('tap')
      onChange(returnFrame(slots, pool, frameId))
      setSelected(null)
      clearHover()
      return
    }

    clearHover()
  }

  const cancelDrag = (e: ReactPointerEvent) => {
    const cur = dragRef.current
    if (!cur || e.pointerId !== cur.pointerId) return
    dragRef.current = null
    setDrag(null)
    setGhostOn(false)
    ghostOnRef.current = false
    clearHover()
  }

  const tapPicture = (frameId: string) => {
    if (locked) return
    playSfx('tap')
    setSelected((cur) => (cur === frameId ? null : frameId))
  }

  const tapSlot = (slotIndex: number) => {
    if (locked) return
    const occupant = slots[slotIndex]
    if (selected) {
      playSfx('tap')
      onChange(placeFrame(slots, pool, selected, slotIndex))
      setSelected(null)
      return
    }
    if (occupant && !canPointer) {
      playSfx('tap')
      setSelected(occupant)
    }
  }

  const ghostFrame = drag ? frameById(frames, drag.frameId) : null
  const ghost =
    drag && ghostOn && ghostFrame
      ? createPortal(
          <div
            className="story-order__ghost"
            style={{ left: drag.x, top: drag.y }}
            aria-hidden
          >
            <img src={storyFrameSrc(ghostFrame.image)} alt="" draggable={false} />
          </div>,
          document.body,
        )
      : null

  const hint = locked
    ? '次序啱喇，跟住圖講故事'
    : canPointer
      ? selected
        ? '已揀一張圖 → 拖去或撳四格'
        : '拖圖去四格，排先後次序'
      : selected
        ? '已揀一張圖 → 再撳要放嘅格'
        : '先撳圖，再撳四格'

  return (
    <div className={`story-order ${drag ? 'is-dragging' : ''}`}>
      <p className="reorder__hint">{hint}</p>

      <div className="story-order__slots" aria-label="故事四格">
        {STORY_ORDER_LABELS.map((label, index) => {
          const frameId = slots[index]
          const frame = frameId ? frameById(frames, frameId) : undefined
          const isSource = drag?.from.kind === 'slot' && drag.from.index === index && ghostOn
          const wrong = Boolean(showWrong && frameId && frames[index]?.id !== frameId)
          return (
            <div
              key={label}
              ref={(el) => {
                slotRefs.current[index] = el
              }}
              className={[
                'story-order__slot',
                frame ? 'is-filled' : '',
                overSlot === index ? 'is-drop-target' : '',
                selected && !frame ? 'is-ready' : '',
                wrong ? 'is-wrong' : '',
                locked && !wrong ? 'is-ok' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={canPointer ? undefined : () => tapSlot(index)}
            >
              <span className="story-order__label">
                {index + 1} · {label}
              </span>
              {frame ? (
                <button
                  type="button"
                  className={`story-order__tile ${isSource ? 'is-dragging-source' : ''} ${
                    selected === frame.id ? 'is-selected' : ''
                  }`}
                  disabled={locked}
                  style={{ touchAction: canPointer ? 'none' : 'manipulation' }}
                  onClick={canPointer ? undefined : () => tapPicture(frame.id)}
                  onPointerDown={
                    canPointer ? (e) => beginDrag(e, frame.id, { kind: 'slot', index }) : undefined
                  }
                  onPointerMove={canPointer ? onPointerMove : undefined}
                  onPointerUp={canPointer ? finishDrag : undefined}
                  onPointerCancel={canPointer ? cancelDrag : undefined}
                  aria-label={`${label}：${frame.alt}`}
                >
                  <StoryFrameArt image={frame.image} alt={frame.alt} />
                </button>
              ) : (
                <button
                  type="button"
                  className="story-order__empty"
                  disabled={locked}
                  onClick={() => tapSlot(index)}
                  aria-label={`${label}空格`}
                >
                  放呢度
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div
        ref={poolRef}
        className={`story-order__pool ${overPool ? 'is-drop-target' : ''} ${locked ? 'is-hidden' : ''}`}
        aria-label="未排嘅圖"
        hidden={locked || pool.length === 0}
      >
        {pool.map((frameId, index) => {
          const frame = frameById(frames, frameId)
          if (!frame) return null
          const isSource = drag?.from.kind === 'pool' && drag.from.index === index && ghostOn
          return (
            <button
              key={frameId}
              type="button"
              className={`story-order__tile ${isSource ? 'is-dragging-source' : ''} ${
                selected === frameId ? 'is-selected' : ''
              }`}
              disabled={locked}
              style={{ touchAction: canPointer ? 'none' : 'manipulation' }}
              onClick={canPointer ? undefined : () => tapPicture(frameId)}
              onPointerDown={
                canPointer ? (e) => beginDrag(e, frameId, { kind: 'pool', index }) : undefined
              }
              onPointerMove={canPointer ? onPointerMove : undefined}
              onPointerUp={canPointer ? finishDrag : undefined}
              onPointerCancel={canPointer ? cancelDrag : undefined}
              aria-label={frame.alt}
            >
              <StoryFrameArt image={frame.image} alt={frame.alt} />
            </button>
          )
        })}
        {pool.length === 0 && (
          <span className="reorder__placeholder">四張圖都放咗入格</span>
        )}
      </div>

      {ghost}
    </div>
  )
}
