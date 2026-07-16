type Props = {
  mood?: 'happy' | 'cheer' | 'think' | 'wave'
  size?: number
  className?: string
}

/** Friendly SVG buddy for Seth — no emoji */
export function Mascot({ mood = 'happy', size = 160, className = '' }: Props) {
  const mouth =
    mood === 'think'
      ? 'M70 108 Q88 100 106 108'
      : mood === 'cheer'
        ? 'M66 100 Q88 122 110 100'
        : 'M68 102 Q88 118 108 102'

  return (
    <svg
      className={`mascot mascot--${mood} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 160 160"
      aria-hidden
    >
      <ellipse cx="80" cy="148" rx="46" ry="8" fill="rgba(27,58,75,0.12)" />
      <circle cx="80" cy="78" r="52" fill="#FFE08A" />
      <circle cx="80" cy="78" r="52" fill="url(#mascotShine)" />
      <path d="M40 62 Q28 28 52 34 Q64 18 80 30 Q96 18 108 34 Q132 28 120 62" fill="#1B3A4B" />
      <circle cx="62" cy="76" r="6" fill="#1B3A4B" />
      <circle cx="98" cy="76" r="6" fill="#1B3A4B" />
      <circle cx="64" cy="74" r="2" fill="#fff" />
      <circle cx="100" cy="74" r="2" fill="#fff" />
      <ellipse cx="48" cy="90" rx="8" ry="5" fill="#FF9B7A" opacity="0.7" />
      <ellipse cx="112" cy="90" rx="8" ry="5" fill="#FF9B7A" opacity="0.7" />
      <path d={mouth} fill="none" stroke="#1B3A4B" strokeWidth="4" strokeLinecap="round" />
      {mood === 'wave' && (
        <g className="mascot__arm">
          <path d="M128 90 Q148 70 142 48" fill="none" stroke="#FFE08A" strokeWidth="12" strokeLinecap="round" />
          <circle cx="142" cy="44" r="10" fill="#FFE08A" />
        </g>
      )}
      {mood === 'cheer' && (
        <>
          <path d="M36 54 L42 40 L48 54" fill="none" stroke="#FF7A59" strokeWidth="3" strokeLinecap="round" />
          <path d="M112 50 L120 36 L126 52" fill="none" stroke="#F5C84C" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      <defs>
        <radialGradient id="mascotShine" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#FFF6C8" />
          <stop offset="55%" stopColor="#FFE08A" />
          <stop offset="100%" stopColor="#F5C84C" />
        </radialGradient>
      </defs>
    </svg>
  )
}
