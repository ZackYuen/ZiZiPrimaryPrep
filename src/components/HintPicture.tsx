import type { HintVisualId } from '../lib/teachHint'

type Props = {
  visual: HintVisualId
  size?: number
  className?: string
}

/** Simple picture clues a 5-year-old can read without words. */
export function HintPicture({ visual, size = 220, className = '' }: Props) {
  return (
    <svg
      className={`hint-pic ${className}`}
      width={size}
      height={Math.round(size * 0.72)}
      viewBox="0 0 220 158"
      aria-hidden
    >
      <rect width="220" height="158" rx="22" fill="#FFF6E4" />
      {draw(visual)}
    </svg>
  )
}

function draw(visual: HintVisualId) {
  switch (visual) {
    case 'me':
      return kid(110, 88, true)
    case 'family':
      return (
        <>
          {kid(70, 96, false, 0.78)}
          {kid(110, 84, true)}
          {kid(150, 96, false, 0.78)}
        </>
      )
    case 'school':
      return (
        <>
          <rect x="50" y="48" width="120" height="78" rx="8" fill="#7EC8E3" />
          <polygon points="40,52 110,18 180,52" fill="#FF7A59" />
          <rect x="98" y="86" width="24" height="40" fill="#8A5A2B" />
          <rect x="64" y="64" width="22" height="18" fill="#FFE08A" />
          <rect x="134" y="64" width="22" height="18" fill="#FFE08A" />
        </>
      )
    case 'teacher':
      return (
        <>
          {kid(80, 96, false, 0.75)}
          {kid(140, 80, true)}
          <rect x="40" y="40" width="36" height="28" rx="4" fill="#fff" stroke="#1B3A4B" strokeWidth="3" />
        </>
      )
    case 'park':
    case 'run':
      return (
        <>
          <ellipse cx="110" cy="130" rx="80" ry="14" fill="#6BCB8B" />
          <circle cx="48" cy="52" r="16" fill="#F5C84C" />
          {kid(120, 88, true)}
          <polygon points="30,120 42,70 54,120" fill="#2F8A4E" />
        </>
      )
    case 'eat':
      return (
        <>
          <ellipse cx="110" cy="108" rx="54" ry="16" fill="#fff" stroke="#1B3A4B" strokeWidth="3" />
          <circle cx="92" cy="96" r="10" fill="#FF7A59" />
          <circle cx="120" cy="94" r="12" fill="#6BCB8B" />
          {kid(110, 58, true, 0.7)}
        </>
      )
    case 'drink':
      return (
        <>
          <path d="M90 70 h40 l-6 60 h-28 z" fill="#7EC8E3" stroke="#1B3A4B" strokeWidth="3" />
          {kid(110, 48, true, 0.62)}
        </>
      )
    case 'sleep':
      return (
        <>
          <rect x="40" y="88" width="140" height="36" rx="10" fill="#7EC8E3" />
          {kid(90, 78, true, 0.7)}
          <text x="150" y="52" fontSize="22" fill="#1B6B8A" fontWeight="700">
            zzz
          </text>
        </>
      )
    case 'book':
    case 'write':
      return (
        <>
          <path d="M50 50 h50 v70 H58 a8 8 0 0 1-8-8 V50z" fill="#fff" stroke="#1B3A4B" strokeWidth="3" />
          <path d="M120 50 h50 v62 a8 8 0 0 1-8 8 h-42 V50z" fill="#FFE08A" stroke="#1B3A4B" strokeWidth="3" />
        </>
      )
    case 'share':
      return (
        <>
          {kid(70, 90, false, 0.8)}
          {kid(150, 90, true, 0.8)}
          <circle cx="110" cy="70" r="14" fill="#E8A84A" />
        </>
      )
    case 'vase':
      return (
        <>
          <path d="M100 40 h20 v18 h16 v54 a26 26 0 0 1-52 0 V58 h16z" fill="#7EC8E3" />
          <path d="M70 130 L150 78" stroke="#FF7A59" strokeWidth="6" />
        </>
      )
    case 'happy':
      return face(110, 80, 'happy')
    case 'sad':
      return face(110, 80, 'sad')
    case 'angry':
      return face(110, 80, 'angry')
    case 'feelings':
      return (
        <>
          {face(60, 86, 'happy', 0.55)}
          {face(110, 70, 'sad', 0.55)}
          {face(160, 86, 'angry', 0.55)}
        </>
      )
    case 'zoo':
      return (
        <>
          <ellipse cx="80" cy="100" rx="36" ry="22" fill="#A0A0A8" />
          <circle cx="58" cy="78" r="12" fill="#A0A0A8" />
          <circle cx="150" cy="96" r="24" fill="#C47A48" />
          <circle cx="138" cy="88" r="6" fill="#1B3A4B" />
        </>
      )
    case 'job':
      return (
        <>
          {kid(110, 86, true)}
          <rect x="86" y="40" width="48" height="16" rx="4" fill="#1B6B8A" />
        </>
      )
    case 'clock':
      return (
        <>
          <circle cx="110" cy="80" r="48" fill="#fff" stroke="#1B3A4B" strokeWidth="4" />
          <line x1="110" y1="80" x2="110" y2="52" stroke="#1B3A4B" strokeWidth="5" />
          <line x1="110" y1="80" x2="140" y2="80" stroke="#FF7A59" strokeWidth="4" />
        </>
      )
    case 'coins':
      return (
        <>
          <circle cx="78" cy="88" r="28" fill="#D4A24C" />
          <circle cx="120" cy="80" r="24" fill="#C0C6CC" />
          <circle cx="150" cy="100" r="18" fill="#D4A24C" />
        </>
      )
    case 'english':
      return (
        <>
          <rect x="48" y="48" width="52" height="52" rx="12" fill="#7EC8E3" />
          <text x="74" y="84" textAnchor="middle" fontSize="32" fontWeight="800" fill="#1B3A4B">
            A
          </text>
          <rect x="120" y="48" width="52" height="52" rx="12" fill="#FFE08A" />
          <text x="146" y="84" textAnchor="middle" fontSize="28" fontWeight="800" fill="#1B3A4B">
            B
          </text>
        </>
      )
    case 'talk':
      return (
        <>
          {kid(80, 90, true)}
          <path d="M130 50 h60 v36 h-18 l-12 14 v-14 h-30z" fill="#fff" stroke="#1B3A4B" strokeWidth="3" />
        </>
      )
    case 'sort':
      return (
        <>
          {face(70, 80, 'happy', 0.7)}
          {face(150, 80, 'sad', 0.7)}
          <text x="70" y="140" textAnchor="middle" fontSize="28" fill="#1F6B3A" fontWeight="800">
            ＋
          </text>
          <text x="150" y="140" textAnchor="middle" fontSize="28" fill="#A0452A" fontWeight="800">
            －
          </text>
        </>
      )
    case 'reorder':
      return (
        <>
          <rect x="30" y="58" width="48" height="36" rx="12" fill="#fff" stroke="#1B3A4B" strokeWidth="3" />
          <rect x="86" y="58" width="48" height="36" rx="12" fill="#FFE08A" stroke="#1B3A4B" strokeWidth="3" />
          <rect x="142" y="58" width="48" height="36" rx="12" fill="#7EC8E3" stroke="#1B3A4B" strokeWidth="3" />
          <path d="M54 110 l20 18 20-18" fill="none" stroke="#FF7A59" strokeWidth="5" />
        </>
      )
    case 'move':
      return (
        <>
          {kid(90, 86, true)}
          <path d="M140 70 l28 -22 M140 70 l28 22" fill="none" stroke="#FF7A59" strokeWidth="6" strokeLinecap="round" />
        </>
      )
    case 'weekend':
      return (
        <>
          <rect x="40" y="36" width="140" height="96" rx="12" fill="#fff" stroke="#1B3A4B" strokeWidth="3" />
          <rect x="40" y="36" width="140" height="28" fill="#FF7A59" />
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3, 4, 5, 6].map((c) => (
              <circle key={`${r}-${c}`} cx={58 + c * 18} cy={82 + r * 14} r="4" fill="#7EC8E3" />
            )),
          )}
        </>
      )
    case 'plus':
      return (
        <>
          {tenish(48, 70, 4)}
          <text x="110" y="96" textAnchor="middle" fontSize="36" fontWeight="800" fill="#1B6B8A">
            ＋
          </text>
          {tenish(140, 70, 3)}
        </>
      )
    case 'minus':
      return (
        <>
          {tenish(48, 70, 6)}
          <text x="110" y="96" textAnchor="middle" fontSize="36" fontWeight="800" fill="#A0452A">
            －
          </text>
          {tenish(140, 70, 2)}
        </>
      )
    case 'mix':
      return (
        <>
          {tenish(70, 60, 5)}
          {tenish(130, 90, 4)}
        </>
      )
    default:
      return (
        <>
          {kid(110, 88, true)}
          <circle cx="48" cy="48" r="14" fill="#F5C84C" />
        </>
      )
  }
}

function kid(x: number, y: number, wave: boolean, s = 1) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) translate(-40 -40)`}>
      <circle cx="40" cy="28" r="18" fill="#FFE08A" />
      <rect x="26" y="46" width="28" height="30" rx="10" fill="#7EC8E3" />
      <circle cx="34" cy="26" r="2.2" fill="#1B3A4B" />
      <circle cx="46" cy="26" r="2.2" fill="#1B3A4B" />
      {wave && <path d="M54 50 Q72 28 64 18" fill="none" stroke="#FFE08A" strokeWidth="7" strokeLinecap="round" />}
    </g>
  )
}

function face(x: number, y: number, mood: 'happy' | 'sad' | 'angry', s = 1) {
  const mouth =
    mood === 'happy' ? 'M28 44 Q40 56 52 44' : mood === 'sad' ? 'M28 52 Q40 40 52 52' : 'M28 48 L52 48'
  const fill = mood === 'happy' ? '#FFE08A' : mood === 'sad' ? '#7EC8E3' : '#FF9B7A'
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) translate(-40 -40)`}>
      <circle cx="40" cy="40" r="28" fill={fill} stroke="#1B3A4B" strokeWidth="3" />
      <circle cx="30" cy="34" r="3" fill="#1B3A4B" />
      <circle cx="50" cy="34" r="3" fill="#1B3A4B" />
      <path d={mouth} fill="none" stroke="#1B3A4B" strokeWidth="3" strokeLinecap="round" />
    </g>
  )
}

function tenish(x: number, y: number, n: number) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={(i % 5) * 12} cy={Math.floor(i / 5) * 14} r="5" fill="#FF7A59" />
      ))}
    </g>
  )
}
