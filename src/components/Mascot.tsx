import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { playSfx, unlockAudio } from '../hooks/useSfx'
import {
  pickMascotLine,
  type MascotMood,
  type MascotReason,
} from '../lib/mascotPresence'

type Props = {
  mood?: MascotMood
  size?: number
  className?: string
  /** Tap for a cheer + bubble. Never required to progress. */
  interactive?: boolean
  /** Auto-speak a short line when gameplay mood changes. */
  reason?: MascotReason
  bubbleAlign?: 'below' | 'end' | 'side'
}

/**
 * Same art language as Zizi-English-Class: one pose PNG per mood, limbs
 * already drawn. CSS only hops/bobs the whole figure — no overlay sticks.
 *   happy  → idle worm (default on load / wait)
 *   wave   → cheer pose (kept for explicit mood; not auto-played on entry)
 *   think  → comfort + nod
 *   cheer  → cheer + hop (tap or gameplay success)
 */
const MOOD_ART: Record<MascotMood, string> = {
  happy: 'zizi-idle.png',
  wave: 'zizi-cheer.png',
  think: 'zizi-think.png',
  cheer: 'zizi-cheer.png',
}

const TAP_MS = 2600
const IDLE_MS = 14000
const BLINK_EVERY_MS = 4800
const BLINK_MS = 170

type BurstOrigin = { x: number; y: number; s: number }

/** English-class ZiziFX.burst directions — local sparkle, not full-page confetti. */
const TAP_BURST = [
  { dx: -0.52, dy: -0.78, kind: 'spark', color: '#F5C84C', delay: 0 },
  { dx: 0.48, dy: -0.74, kind: 'star', color: '#FF7A59', delay: 0.02 },
  { dx: -0.78, dy: -0.22, kind: 'dot', color: '#6BCB8B', delay: 0.04 },
  { dx: 0.8, dy: -0.18, kind: 'dot', color: '#7EC8E3', delay: 0.03 },
  { dx: -0.62, dy: 0.42, kind: 'spark', color: '#FFE08A', delay: 0.06 },
  { dx: 0.64, dy: 0.4, kind: 'star', color: '#FF9B7A', delay: 0.05 },
  { dx: -0.12, dy: -0.92, kind: 'dot', color: '#F5C84C', delay: 0.01 },
  { dx: 0.16, dy: -0.88, kind: 'spark', color: '#6BCB8B', delay: 0.07 },
  { dx: -0.88, dy: 0.12, kind: 'dot', color: '#FF7A59', delay: 0.08 },
  { dx: 0.9, dy: 0.08, kind: 'dot', color: '#7EC8E3', delay: 0.04 },
  { dx: -0.38, dy: 0.62, kind: 'star', color: '#F5C84C', delay: 0.09 },
  { dx: 0.4, dy: 0.66, kind: 'spark', color: '#FF9B7A', delay: 0.1 },
] as const

function MascotTapBurst({ origin, burstKey }: { origin: BurstOrigin; burstKey: number }) {
  if (typeof document === 'undefined') return null
  const reach = Math.max(52, origin.s * 0.7)
  return createPortal(
    <span className="mascot-tap-fx" aria-hidden>
      <span
        className="mascot-tap-fx__ring"
        style={{ left: origin.x, top: origin.y }}
      />
      {TAP_BURST.map((bit, i) => {
        const style = {
          left: origin.x,
          top: origin.y,
          background: bit.kind === 'dot' ? bit.color : 'transparent',
          color: bit.color,
          animationDelay: `${bit.delay}s`,
          '--dx': `${bit.dx * reach}px`,
          '--dy': `${bit.dy * reach}px`,
        } as CSSProperties
        return (
          <span
            key={`${burstKey}-${i}`}
            className={`mascot-tap-fx__bit mascot-tap-fx__bit--${bit.kind}`}
            style={style}
          >
            {bit.kind === 'spark' ? '✦' : bit.kind === 'star' ? '★' : ''}
          </span>
        )
      })}
    </span>,
    document.body,
  )
}

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function poseSrc(file: string) {
  return `${import.meta.env.BASE_URL}characters/${file}`
}

/** Cream chip + unclipped pose PNG (English-class buddy-chip / buddy-pose). */
function MascotPose({
  mood,
  size,
  art,
  alt,
  hopKey,
}: {
  mood: MascotMood
  size: number
  art: string
  alt: string
  hopKey?: number | string
}) {
  return (
    <span className={`mascot-figure mascot-figure--${mood}`}>
      <span className="mascot-figure__plate" aria-hidden />
      <img
        key={hopKey}
        className={`mascot mascot--${mood}`}
        width={size}
        height={size}
        src={art}
        alt={alt}
        draggable={false}
      />
    </span>
  )
}

/** Illustrated lime-green paper buddy representing 孜孜 / Seth. */
export function Mascot({
  mood = 'happy',
  size = 160,
  className = '',
  interactive = false,
  reason,
  bubbleAlign = 'below',
}: Props) {
  const [burst, setBurst] = useState<'tap' | null>(null)
  const [bubble, setBubble] = useState<string | null>(null)
  const [blink, setBlink] = useState(false)
  const [motionKey, setMotionKey] = useState(0)
  const [fxOrigin, setFxOrigin] = useState<BurstOrigin | null>(null)
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blinkHideRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)

  // Exaggerated cheer/hop only on tap (or a 'cheer' reason). Idle nudge is a
  // bubble — never auto-swap to the big wave/cheer overlay on load or pause.
  const shownMood: MascotMood = burst === 'tap' ? 'cheer' : mood
  const popped = burst === 'tap'
  const art = poseSrc(MOOD_ART[shownMood])

  const clearHide = () => {
    if (hideRef.current != null) {
      clearTimeout(hideRef.current)
      hideRef.current = null
    }
  }

  const speakFor = (kind: 'tap' | 'cheer' | 'encourage' | 'idle', nextBurst: 'tap' | null) => {
    clearHide()
    if (nextBurst === 'tap') setMotionKey((n) => n + 1)
    setBurst(nextBurst)
    setBubble(pickMascotLine(kind))
    hideRef.current = setTimeout(() => {
      setBurst(null)
      setBubble(null)
      setFxOrigin(null)
      hideRef.current = null
    }, TAP_MS)
  }

  const fireTapDelight = () => {
    unlockAudio()
    playSfx('pop')
    const el = btnRef.current
    if (el && !prefersReducedMotion()) {
      const r = el.getBoundingClientRect()
      setFxOrigin({
        x: r.left + r.width / 2,
        y: r.top + r.height * 0.4,
        s: Math.min(r.width, r.height),
      })
    }
    speakFor('tap', 'tap')
  }

  useEffect(() => () => {
    clearHide()
    if (blinkHideRef.current != null) clearTimeout(blinkHideRef.current)
  }, [])

  useEffect(() => {
    if (!reason) return
    if (reason === 'cheer') speakFor('cheer', 'tap')
    else if (reason === 'encourage') speakFor('encourage', null)
    // wait / listen / start: pose only — idle nudge covers long pauses
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reason])

  useEffect(() => {
    if (!interactive || prefersReducedMotion()) return
    if (mood === 'cheer' || reason === 'cheer' || burst === 'tap') return
    const id = window.setTimeout(() => {
      // Bubble only — do not switch to wave/cheer art unprompted.
      speakFor('idle', null)
    }, IDLE_MS)
    return () => window.clearTimeout(id)
    // Restart the wait whenever the kid or the activity does something.
  }, [interactive, mood, reason, burst])

  useEffect(() => {
    if (!interactive || prefersReducedMotion()) return
    const id = window.setInterval(() => {
      setBlink(true)
      if (blinkHideRef.current != null) clearTimeout(blinkHideRef.current)
      blinkHideRef.current = setTimeout(() => {
        setBlink(false)
        blinkHideRef.current = null
      }, BLINK_MS)
    }, BLINK_EVERY_MS)
    return () => window.clearInterval(id)
  }, [interactive])

  if (!interactive) {
    return (
      <span
        className={`mascot-static mascot-static--${mood} ${className}`.trim()}
        style={{ width: size, height: size }}
      >
        <MascotPose
          mood={mood}
          size={size}
          art={poseSrc(MOOD_ART[mood])}
          alt="孜孜的綠色手工小伙伴"
        />
      </span>
    )
  }

  return (
    <button
      ref={btnRef}
      type="button"
      className={`mascot-buddy mascot-buddy--${shownMood} mascot-buddy--bubble-${bubbleAlign} ${
        popped ? 'is-pop' : ''
      } ${blink ? 'is-blink' : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-label="孜孜"
      title="孜孜"
      onClick={fireTapDelight}
    >
      {popped && fxOrigin ? (
        <MascotTapBurst key={motionKey} origin={fxOrigin} burstKey={motionKey} />
      ) : null}
      <span className="mascot-buddy__fx" aria-hidden>
        <span className="mascot-buddy__spark mascot-buddy__spark--a">✦</span>
        <span className="mascot-buddy__spark mascot-buddy__spark--b">★</span>
        <span className="mascot-buddy__spark mascot-buddy__spark--c">✦</span>
      </span>
      <span className="mascot-buddy__think" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      <MascotPose
        mood={shownMood}
        size={size}
        art={art}
        alt=""
        hopKey={`${shownMood}-${motionKey}`}
      />
      {bubble && (
        <span className="mascot-buddy__bubble" role="status" aria-live="polite">
          {bubble}
        </span>
      )}
    </button>
  )
}
