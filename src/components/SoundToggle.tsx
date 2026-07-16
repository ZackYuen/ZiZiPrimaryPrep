import { useEffect, useState } from 'react'
import { getSfxMuted, playSfx, setSfxMuted, unlockAudio } from '../hooks/useSfx'

type Props = {
  className?: string
}

export function SoundToggle({ className = '' }: Props) {
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    setMuted(getSfxMuted())
  }, [])

  return (
    <button
      type="button"
      className={`sound-toggle ${muted ? 'is-muted' : ''} ${className}`}
      aria-label={muted ? '開啟音效' : '關閉音效'}
      aria-pressed={!muted}
      onClick={() => {
        unlockAudio()
        const next = !muted
        setMuted(next)
        setSfxMuted(next)
        if (!next) playSfx('tap')
      }}
    >
      <span className="sound-toggle__icon" aria-hidden>
        {muted ? (
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path
              d="M4 10v4h4l5 4V6L8 10H4zm13.5 2l2.5 2.5M17.5 12L20 9.5M17.5 12H22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path
              d="M4 10v4h4l5 4V6L8 10H4zm11 2a3 3 0 0 0 0-4m3 7a6 6 0 0 0 0-10"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span>{muted ? '音效關' : '音效開'}</span>
    </button>
  )
}
