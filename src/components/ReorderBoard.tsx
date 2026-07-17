import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { playSfx } from '../hooks/useSfx'

type Zone = 'pool' | 'order'

type DragState = {
  text: string
  from: Zone
  fromIndex: number
  x: number
  y: number
  pointerId: number
}

type Props = {
  pool: string[]
  order: string[]
  onChange: (next: { pool: string[]; order: string[] }) => void
  locked?: boolean
}

function removeAt(list: string[], index: number): string[] {
  return list.filter((_, i) => i !== index)
}

function insertAt(list: string[], index: number, text: string): string[] {
  const next = [...list]
  const i = Math.max(0, Math.min(index, next.length))
  next.splice(i, 0, text)
  return next
}

/**
 * Kid-friendly sentence reorder with pointer drag (works on iPhone Safari).
 * On iOS 10 (no Pointer Events), falls back to tap-to-place.
 */
export function ReorderBoard({ pool, order, onChange, locked }: Props) {
  const canPointer = typeof window !== 'undefined' && 'PointerEvent' in window
  const [drag, setDrag] = useState<DragState | null>(null)
  const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null)
  const [overPool, setOverPool] = useState(false)
  const [ghostOn, setGhostOn] = useState(false)
  const orderRef = useRef<HTMLDivElement | null>(null)
  const poolRef = useRef<HTMLDivElement | null>(null)
  const chipRefs = useRef<(HTMLButtonElement | null)[]>([])
  const originRef = useRef({ x: 0, y: 0 })
  const ghostOnRef = useRef(false)
  const insertRef = useRef<number | null>(null)
  const overPoolRef = useRef(false)
  const dragRef = useRef<DragState | null>(null)

  const tapMove = (from: Zone, fromIndex: number, text: string) => {
    if (locked) return
    playSfx('tap')
    if (from === 'pool') {
      onChange({
        pool: removeAt(pool, fromIndex),
        order: [...order, text],
      })
    } else {
      onChange({
        order: removeAt(order, fromIndex),
        pool: [...pool, text],
      })
    }
  }

  const clearHover = () => {
    insertRef.current = null
    overPoolRef.current = false
    setInsertAtIndex(null)
    setOverPool(false)
  }

  const updateHover = (clientX: number, clientY: number, orderLen: number) => {
    const poolEl = poolRef.current
    const orderEl = orderRef.current
    if (poolEl) {
      const r = poolEl.getBoundingClientRect()
      const inside =
        clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom
      overPoolRef.current = inside
      setOverPool(inside)
      if (inside) {
        insertRef.current = null
        setInsertAtIndex(null)
        return
      }
    }
    if (!orderEl) {
      insertRef.current = null
      setInsertAtIndex(null)
      return
    }
    const r = orderEl.getBoundingClientRect()
    const inside =
      clientX >= r.left - 8 &&
      clientX <= r.right + 8 &&
      clientY >= r.top - 8 &&
      clientY <= r.bottom + 8
    if (!inside) {
      insertRef.current = null
      setInsertAtIndex(null)
      return
    }

    let idx = orderLen
    for (let i = 0; i < orderLen; i++) {
      const el = chipRefs.current[i]
      if (!el) continue
      const cr = el.getBoundingClientRect()
      const mid = cr.left + cr.width / 2
      if (clientX < mid) {
        idx = i
        break
      }
    }
    insertRef.current = idx
    setInsertAtIndex(idx)
  }

  const beginDrag = (
    e: ReactPointerEvent<HTMLButtonElement>,
    from: Zone,
    fromIndex: number,
    text: string,
  ) => {
    if (locked) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    ghostOnRef.current = false
    setGhostOn(false)
    originRef.current = { x: e.clientX, y: e.clientY }
    const next: DragState = {
      text,
      from,
      fromIndex,
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
    }
    dragRef.current = next
    setDrag(next)
    clearHover()
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    const cur = dragRef.current
    if (!cur || e.pointerId !== cur.pointerId) return
    // Keep scrolling locked while dragging on iOS.
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
    if (ghostOnRef.current) updateHover(e.clientX, e.clientY, order.length)
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
    const { text, from, fromIndex } = cur
    dragRef.current = null
    setDrag(null)
    setGhostOn(false)
    ghostOnRef.current = false

    if (!moved) {
      if (from === 'order') {
        playSfx('tap')
        onChange({
          order: removeAt(order, fromIndex),
          pool: [...pool, text],
        })
      } else {
        playSfx('tap')
        onChange({
          pool: removeAt(pool, fromIndex),
          order: [...order, text],
        })
      }
      clearHover()
      return
    }

    let nextPool = [...pool]
    let nextOrder = [...order]

    if (from === 'pool') nextPool = removeAt(nextPool, fromIndex)
    else nextOrder = removeAt(nextOrder, fromIndex)

    if (overPoolRef.current) {
      nextPool = [...nextPool, text]
      playSfx('tap')
      onChange({ pool: nextPool, order: nextOrder })
      clearHover()
      return
    }

    if (insertRef.current != null) {
      let idx = insertRef.current
      if (from === 'order' && fromIndex < idx) idx -= 1
      nextOrder = insertAt(nextOrder, idx, text)
      playSfx('tap')
      onChange({ pool: nextPool, order: nextOrder })
      clearHover()
      return
    }

    if (from === 'pool') nextPool = insertAt(nextPool, fromIndex, text)
    else nextOrder = insertAt(nextOrder, fromIndex, text)
    onChange({ pool: nextPool, order: nextOrder })
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

  const ghost =
    drag && ghostOn
      ? createPortal(
          <div
            className="reorder__ghost chip chip--placed"
            style={{
              left: drag.x,
              top: drag.y,
            }}
            aria-hidden
          >
            {drag.text}
          </div>,
          document.body,
        )
      : null

  return (
    <div className={`reorder ${drag ? 'is-dragging' : ''}`}>
      <p className="reorder__hint">{canPointer ? '拖詞排成句子' : '撳詞組成句子'}</p>

      <div
        ref={orderRef}
        className={`reorder__sentence ${insertAtIndex != null ? 'is-drop-target' : ''}`}
        aria-label="句子區"
      >
        {order.length === 0 && !drag && (
          <span className="reorder__placeholder">{canPointer ? '拖詞語到這裡' : '撳下面詞語'}</span>
        )}
        {order.map((w, i) => (
          <span key={`slot-${i}`} className="reorder__slot">
            {insertAtIndex === i && <span className="reorder__caret" aria-hidden />}
            <button
              type="button"
              ref={(el) => {
                chipRefs.current[i] = el
              }}
              className={`chip chip--placed ${
                drag?.from === 'order' && drag.fromIndex === i ? 'is-dragging-source' : ''
              }`}
              disabled={locked}
              style={{ touchAction: canPointer ? 'none' : 'manipulation' }}
              onClick={canPointer ? undefined : () => tapMove('order', i, w)}
              onPointerDown={canPointer ? (e) => beginDrag(e, 'order', i, w) : undefined}
              onPointerMove={canPointer ? onPointerMove : undefined}
              onPointerUp={canPointer ? finishDrag : undefined}
              onPointerCancel={canPointer ? cancelDrag : undefined}
              aria-label={`句子：${w}`}
            >
              {w}
            </button>
          </span>
        ))}
        {insertAtIndex === order.length && order.length > 0 && (
          <span className="reorder__caret" aria-hidden />
        )}
      </div>

      <div
        ref={poolRef}
        className={`reorder__pool ${overPool ? 'is-drop-target' : ''}`}
        aria-label="詞語區"
      >
        {pool.map((w, i) => (
          <button
            key={`${w}-p-${i}`}
            type="button"
            className={`chip ${
              drag?.from === 'pool' && drag.fromIndex === i ? 'is-dragging-source' : ''
            }`}
            disabled={locked}
            style={{ touchAction: canPointer ? 'none' : 'manipulation' }}
            onClick={canPointer ? undefined : () => tapMove('pool', i, w)}
            onPointerDown={canPointer ? (e) => beginDrag(e, 'pool', i, w) : undefined}
            onPointerMove={canPointer ? onPointerMove : undefined}
            onPointerUp={canPointer ? finishDrag : undefined}
            onPointerCancel={canPointer ? cancelDrag : undefined}
            aria-label={`詞語：${w}`}
          >
            {w}
          </button>
        ))}
        {pool.length === 0 && <span className="reorder__placeholder">詞語都用晒啦</span>}
      </div>

      {ghost}
    </div>
  )
}
