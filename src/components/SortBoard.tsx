import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { playSfx } from '../hooks/useSfx'

type DragFrom = { kind: 'pool' } | { kind: 'bucket'; bucket: string }

type DragState = {
  text: string
  from: DragFrom
  x: number
  y: number
  pointerId: number
}

type Props = {
  buckets: string[]
  pool: string[]
  placement: Record<string, string>
  /** Correct bucket per word — used when checked/revealed for styling */
  answerByText?: Record<string, string>
  locked?: boolean
  checked?: boolean
  reveal?: boolean
  onPlace: (text: string, bucket: string) => void
  onReturn: (text: string) => void
}

function bucketLabel(bucket: string): string {
  if (bucket === '正面的') return '＋'
  if (bucket === '負面的') return '－'
  return bucket
}

/**
 * Emotion / category sort with pointer drag (iPhone Safari).
 * Falls back to tap-word → tap-bucket when Pointer Events are missing (iOS 10).
 */
export function SortBoard({
  buckets,
  pool,
  placement,
  answerByText = {},
  locked,
  checked,
  reveal,
  onPlace,
  onReturn,
}: Props) {
  const canPointer = typeof window !== 'undefined' && 'PointerEvent' in window
  const [selected, setSelected] = useState<string | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [ghostOn, setGhostOn] = useState(false)
  const [overBucket, setOverBucket] = useState<string | null>(null)
  const [overPool, setOverPool] = useState(false)

  const bucketRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const poolRef = useRef<HTMLDivElement | null>(null)
  const originRef = useRef({ x: 0, y: 0 })
  const ghostOnRef = useRef(false)
  const overBucketRef = useRef<string | null>(null)
  const overPoolRef = useRef(false)
  const dragRef = useRef<DragState | null>(null)

  const available = pool.filter((t) => !placement[t])

  const clearHover = () => {
    overBucketRef.current = null
    overPoolRef.current = false
    setOverBucket(null)
    setOverPool(false)
  }

  const updateHover = (clientX: number, clientY: number) => {
    for (let i = 0; i < buckets.length; i++) {
      const b = buckets[i]
      const el = bucketRefs.current[b]
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        overBucketRef.current = b
        overPoolRef.current = false
        setOverBucket(b)
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
      overBucketRef.current = null
      setOverPool(inside)
      setOverBucket(null)
      return
    }
    clearHover()
  }

  const beginDrag = (e: ReactPointerEvent<HTMLButtonElement>, text: string, from: DragFrom) => {
    if (locked) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    ghostOnRef.current = false
    setGhostOn(false)
    originRef.current = { x: e.clientX, y: e.clientY }
    const next: DragState = {
      text,
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
    const { text, from } = cur
    dragRef.current = null
    setDrag(null)
    setGhostOn(false)
    ghostOnRef.current = false

    if (!moved) {
      // Short press: select from pool, or return from bucket.
      if (from.kind === 'bucket') {
        playSfx('tap')
        onReturn(text)
        setSelected(null)
      } else {
        playSfx('tap')
        setSelected((curSel) => (curSel === text ? null : text))
      }
      clearHover()
      return
    }

    if (overBucketRef.current) {
      playSfx('tap')
      onPlace(text, overBucketRef.current)
      setSelected(null)
      clearHover()
      return
    }

    if (overPoolRef.current && from.kind === 'bucket') {
      playSfx('tap')
      onReturn(text)
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

  const tapSelect = (text: string) => {
    if (locked) return
    playSfx('tap')
    setSelected((cur) => (cur === text ? null : text))
  }

  const tapBucket = (bucket: string) => {
    if (locked || !selected) return
    playSfx('tap')
    onPlace(selected, bucket)
    setSelected(null)
  }

  const tapReturn = (text: string) => {
    if (locked) return
    playSfx('tap')
    onReturn(text)
    setSelected(null)
  }

  const ghost =
    drag && ghostOn
      ? createPortal(
          <div
            className="reorder__ghost chip chip--placed"
            style={{ left: drag.x, top: drag.y }}
            aria-hidden
          >
            {drag.text}
          </div>,
          document.body,
        )
      : null

  const hint = canPointer
    ? selected
      ? `已揀「${selected}」→ 拖去或撳 ＋ / －`
      : '拖詞去 ＋ / － （亦可先撳再撳圓圈）'
    : selected
      ? `已揀「${selected}」→ 再撳 ＋ 或 －`
      : '先撳詞，再撳 ＋ 或 －'

  return (
    <div className={`sort-box ${drag ? 'is-dragging' : ''}`}>
      <p className="reorder__hint">{hint}</p>

      <div className="sort-buckets">
        {buckets.map((bucket) => (
          <div
            key={bucket}
            ref={(el) => {
              bucketRefs.current[bucket] = el
            }}
            role="button"
            tabIndex={0}
            className={[
              'sort-bucket',
              selected || drag ? 'is-ready' : '',
              overBucket === bucket ? 'is-drop-target' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => tapBucket(bucket)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                tapBucket(bucket)
              }
            }}
            aria-label={bucket}
          >
            <span className="sort-bucket__title" title={bucket}>
              {bucketLabel(bucket)}
            </span>
            <div className="sort-bucket__items">
              {pool
                .filter((text) => placement[text] === bucket)
                .map((text) => {
                  const correct = answerByText[text]
                  const wrongHere = !!checked && !reveal && !!correct && correct !== bucket
                  const showOk = ((checked && correct === bucket) || reveal) && correct === bucket
                  const isSource =
                    drag?.text === text && drag.from.kind === 'bucket' && drag.from.bucket === bucket
                  return (
                    <button
                      key={text}
                      type="button"
                      className={[
                        'chip chip--placed',
                        wrongHere ? 'is-sort-wrong' : '',
                        showOk ? 'is-sort-ok' : '',
                        isSource ? 'is-dragging-source' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      disabled={locked}
                      style={{ touchAction: canPointer ? 'none' : 'manipulation' }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (canPointer) return
                        tapReturn(text)
                      }}
                      onPointerDown={
                        canPointer
                          ? (e) => {
                              e.stopPropagation()
                              beginDrag(e, text, { kind: 'bucket', bucket })
                            }
                          : undefined
                      }
                      onPointerMove={canPointer ? onPointerMove : undefined}
                      onPointerUp={canPointer ? finishDrag : undefined}
                      onPointerCancel={canPointer ? cancelDrag : undefined}
                      aria-label={`已放入：${text}`}
                    >
                      {text}
                    </button>
                  )
                })}
            </div>
          </div>
        ))}
      </div>

      <div
        ref={poolRef}
        className={`reorder__pool ${overPool ? 'is-drop-target' : ''}`}
        aria-label="詞語區"
      >
        {available.map((text) => (
          <button
            key={text}
            type="button"
            className={[
              'chip',
              selected === text ? 'chip--active' : '',
              drag?.text === text && drag.from.kind === 'pool' ? 'is-dragging-source' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            disabled={locked}
            style={{ touchAction: canPointer ? 'none' : 'manipulation' }}
            onClick={canPointer ? undefined : () => tapSelect(text)}
            onPointerDown={canPointer ? (e) => beginDrag(e, text, { kind: 'pool' }) : undefined}
            onPointerMove={canPointer ? onPointerMove : undefined}
            onPointerUp={canPointer ? finishDrag : undefined}
            onPointerCancel={canPointer ? cancelDrag : undefined}
            aria-label={`詞語：${text}`}
          >
            {text}
          </button>
        ))}
        {available.length === 0 && <span className="reorder__placeholder">詞語都分晒啦</span>}
      </div>

      {ghost}
    </div>
  )
}
