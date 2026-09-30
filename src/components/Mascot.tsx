import { useEffect, useRef, useState } from 'react'
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

const MOOD_ART: Record<MascotMood, string> = {
  happy: 'zizi-wave.png',
  wave: 'zizi-wave.png',
  think: 'zizi-think.png',
  cheer: 'zizi-cheer.png',
}

const TAP_MS = 2600
const IDLE_MS = 14000
const BLINK_EVERY_MS = 4800
const BLINK_MS = 170

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
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
  const [burst, setBurst] = useState<'tap' | 'idle' | null>(null)
  const [bubble, setBubble] = useState<string | null>(null)
  const [blink, setBlink] = useState(false)
  const [motionKey, setMotionKey] = useState(0)
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const blinkHideRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const shownMood: MascotMood =
    burst === 'tap' ? 'cheer' : burst === 'idle' && mood !== 'cheer' ? 'wave' : mood
  const popped = burst === 'tap'

  const clearHide = () => {
    if (hideRef.current != null) {
      clearTimeout(hideRef.current)
      hideRef.current = null
    }
  }

  const speakFor = (kind: 'tap' | 'cheer' | 'encourage' | 'idle', nextBurst: 'tap' | 'idle' | null) => {
    clearHide()
    if (nextBurst === 'tap') setMotionKey((n) => n + 1)
    setBurst(nextBurst)
    setBubble(pickMascotLine(kind))
    hideRef.current = setTimeout(() => {
      setBurst(null)
      setBubble(null)
      hideRef.current = null
    }, TAP_MS)
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
      speakFor('idle', 'idle')
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

  const art = `${import.meta.env.BASE_URL}characters/${MOOD_ART[shownMood]}`
  const face = (
    <img
      className={`mascot mascot--${shownMood}`}
      width={size}
      height={size}
      src={art}
      alt=""
      draggable={false}
    />
  )

  if (!interactive) {
    return (
      <span className={`mascot-static mascot-static--${mood} ${className}`.trim()}>
        <img
          className={`mascot mascot--${mood}`}
          width={size}
          height={size}
          src={`${import.meta.env.BASE_URL}characters/${MOOD_ART[mood]}`}
          alt="孜孜的綠色手工小伙伴"
          draggable={false}
        />
      </span>
    )
  }

  return (
    <button
      type="button"
      className={`mascot-buddy mascot-buddy--${shownMood} mascot-buddy--bubble-${bubbleAlign} ${
        popped ? 'is-pop' : ''
      } ${blink ? 'is-blink' : ''} ${className}`}
      style={{ width: size, height: size }}
      aria-label="孜孜"
      title="孜孜"
      onClick={() => {
        unlockAudio()
        playSfx('tap')
        speakFor('tap', 'tap')
      }}
    >
      <span className="mascot-buddy__fx" aria-hidden>
        <span className="mascot-buddy__spark mascot-buddy__spark--a">✦</span>
        <span className="mascot-buddy__spark mascot-buddy__spark--b">★</span>
        <span className="mascot-buddy__spark mascot-buddy__spark--c">✦</span>
      </span>
      <span className="mascot-buddy__motion" key={`${shownMood}-${motionKey}`}>
        <span className="mascot-buddy__think" aria-hidden>
          <span />
          <span />
          <span />
        </span>
        <span className={`mascot-buddy__face ${blink ? 'is-blink' : ''}`}>{face}</span>
      </span>
      {bubble && (
        <span className="mascot-buddy__bubble" role="status" aria-live="polite">
          {bubble}
        </span>
      )}
    </button>
  )
}
