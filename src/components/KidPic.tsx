import type { KidPicId } from '../data/content'

type Props = {
  id: KidPicId
  shadow?: boolean
  size?: number
  className?: string
}

const INK = '#1B3A4B'
const CREAM = '#FFF6E4'

export function KidPic({ id, shadow = false, size = 180, className = '' }: Props) {
  return (
    <svg
      className={`kid-pic ${shadow ? 'kid-pic--shadow' : ''} ${className}`.trim()}
      width={size}
      height={Math.round(size * 0.82)}
      viewBox="0 0 220 180"
      aria-hidden
    >
      <rect width="220" height="180" rx="22" fill={shadow ? '#E8E4D8' : CREAM} />
      <ellipse cx="110" cy="166" rx="62" ry="8" fill="#1B3A4B14" />
      <g
        fill={shadow ? INK : undefined}
        stroke={shadow ? INK : undefined}
        style={shadow ? { filter: 'brightness(0)' } : undefined}
      >
        {draw(id)}
      </g>
    </svg>
  )
}

function kid(x: number, y: number, opts: { pose?: 'stand' | 'turn' | 'sit' | 'step'; shirt?: string } = {}) {
  const pose = opts.pose ?? 'stand'
  const shirt = opts.shirt ?? '#5EB5D8'
  const face = (
    <>
      <circle cx={x} cy={y - 28} r="16" fill="#FFD8B0" stroke={INK} strokeWidth="3" />
      <circle cx={x - 5} cy={y - 30} r="2" fill={INK} />
      <circle cx={x + 5} cy={y - 30} r="2" fill={INK} />
      <path d={`M${x - 4} ${y - 22} q4 4 8 0`} fill="none" stroke={INK} strokeWidth="2" />
    </>
  )
  if (pose === 'sit') {
    return (
      <>
        {face}
        <rect x={x - 16} y={y - 12} width="32" height="28" rx="10" fill={shirt} stroke={INK} strokeWidth="3" />
        <path d={`M${x - 16} ${y + 8} q-10 16 -4 22`} fill="none" stroke={shirt} strokeWidth="8" strokeLinecap="round" />
        <path d={`M${x + 16} ${y + 8} q10 16 4 22`} fill="none" stroke={shirt} strokeWidth="8" strokeLinecap="round" />
        <path d={`M${x - 18} ${y + 2} h-14`} stroke="#FFD8B0" strokeWidth="7" strokeLinecap="round" />
        <path d={`M${x + 18} ${y + 2} h14`} stroke="#FFD8B0" strokeWidth="7" strokeLinecap="round" />
      </>
    )
  }
  if (pose === 'turn') {
    return (
      <>
        <circle cx={x} cy={y - 28} r="16" fill="#FFD8B0" stroke={INK} strokeWidth="3" />
        <circle cx={x + 4} cy={y - 30} r="2" fill={INK} />
        <path d={`M${x + 1} ${y - 22} q4 3 7 0`} fill="none" stroke={INK} strokeWidth="2" />
        <rect x={x - 12} y={y - 12} width="24" height="36" rx="10" fill={shirt} stroke={INK} strokeWidth="3" />
        <path d={`M${x} ${y} q22 -18 28 8`} fill="none" stroke="#FFD8B0" strokeWidth="7" strokeLinecap="round" />
        <path d={`M${x - 8} ${y + 24} v16`} stroke="#3D6BB3" strokeWidth="8" strokeLinecap="round" />
        <path d={`M${x + 8} ${y + 24} v16`} stroke="#3D6BB3" strokeWidth="8" strokeLinecap="round" />
        <path d={`M${x - 36} ${y - 8} q18 -22 36 -6`} fill="none" stroke="#F5C84C" strokeWidth="4" strokeDasharray="4 5" />
      </>
    )
  }
  if (pose === 'step') {
    return (
      <>
        {face}
        <rect x={x - 16} y={y - 12} width="32" height="34" rx="10" fill={shirt} stroke={INK} strokeWidth="3" />
        <path d={`M${x + 16} ${y - 2} l18 -8`} stroke="#FFD8B0" strokeWidth="7" strokeLinecap="round" />
        <path d={`M${x - 16} ${y} l-10 8`} stroke="#FFD8B0" strokeWidth="7" strokeLinecap="round" />
        <path d={`M${x - 8} ${y + 22} v14`} stroke="#3D6BB3" strokeWidth="8" strokeLinecap="round" />
        <path d={`M${x + 10} ${y + 20} l16 10`} stroke="#3D6BB3" strokeWidth="8" strokeLinecap="round" />
      </>
    )
  }
  return (
    <>
      {face}
      <rect x={x - 16} y={y - 12} width="32" height="36" rx="10" fill={shirt} stroke={INK} strokeWidth="3" />
      <path d={`M${x - 16} ${y} h-16`} stroke="#FFD8B0" strokeWidth="7" strokeLinecap="round" />
      <path d={`M${x + 16} ${y} h16`} stroke="#FFD8B0" strokeWidth="7" strokeLinecap="round" />
      <path d={`M${x - 8} ${y + 24} v16`} stroke="#3D6BB3" strokeWidth="8" strokeLinecap="round" />
      <path d={`M${x + 8} ${y + 24} v16`} stroke="#3D6BB3" strokeWidth="8" strokeLinecap="round" />
    </>
  )
}

function apple(x: number, y: number, fill = '#E85D75') {
  return (
    <>
      <circle cx={x} cy={y} r="22" fill={fill} stroke={INK} strokeWidth="3" />
      <path d={`M${x} ${y - 20} q6 -16 16 -10`} fill="none" stroke="#2F8A4E" strokeWidth="4" />
      <ellipse cx={x + 8} cy={y - 8} rx="5" ry="8" fill="#fff8" />
    </>
  )
}

function banana(x: number, y: number) {
  return (
    <path
      d={`M${x - 28} ${y + 10} q20 -40 56 -8 q-28 6 -40 18 z`}
      fill="#F5C84C"
      stroke={INK}
      strokeWidth="3"
    />
  )
}

function orange(x: number, y: number) {
  return (
    <>
      <circle cx={x} cy={y} r="22" fill="#F4A24A" stroke={INK} strokeWidth="3" />
      <circle cx={x} cy={y} r="8" fill="none" stroke="#E07A2F" strokeWidth="2" />
      <path d={`M${x} ${y - 22} q8 -10 14 -4`} fill="none" stroke="#2F8A4E" strokeWidth="4" />
    </>
  )
}

function ball(x: number, y: number, fill = '#7EC8E3') {
  return (
    <>
      <circle cx={x} cy={y} r="22" fill={fill} stroke={INK} strokeWidth="3" />
      <path d={`M${x - 16} ${y} h32`} stroke="#fff" strokeWidth="3" />
      <path d={`M${x} ${y - 16} v32`} stroke="#fff" strokeWidth="3" />
    </>
  )
}

function cat(x: number, y: number) {
  return (
    <>
      <ellipse cx={x} cy={y + 8} rx="28" ry="20" fill="#E8B84A" stroke={INK} strokeWidth="3" />
      <circle cx={x + 18} cy={y - 10} r="16" fill="#E8B84A" stroke={INK} strokeWidth="3" />
      <polygon points={`${x + 8},${y - 20} ${x + 12},${y - 34} ${x + 20},${y - 18}`} fill="#E8B84A" stroke={INK} strokeWidth="3" />
      <polygon points={`${x + 20},${y - 18} ${x + 30},${y - 34} ${x + 32},${y - 16}`} fill="#E8B84A" stroke={INK} strokeWidth="3" />
      <circle cx={x + 14} cy={y - 12} r="2" fill={INK} />
      <circle cx={x + 24} cy={y - 12} r="2" fill={INK} />
      <path d={`M${x + 16} ${y - 5} h8`} stroke={INK} strokeWidth="2" />
    </>
  )
}

function teddy(x: number, y: number) {
  return (
    <>
      <circle cx={x - 18} cy={y - 18} r="10" fill="#C48A4A" stroke={INK} strokeWidth="3" />
      <circle cx={x + 18} cy={y - 18} r="10" fill="#C48A4A" stroke={INK} strokeWidth="3" />
      <circle cx={x} cy={y - 8} r="20" fill="#D4A05A" stroke={INK} strokeWidth="3" />
      <ellipse cx={x} cy={y + 22} rx="22" ry="20" fill="#D4A05A" stroke={INK} strokeWidth="3" />
      <circle cx={x - 6} cy={y - 10} r="2" fill={INK} />
      <circle cx={x + 6} cy={y - 10} r="2" fill={INK} />
      <ellipse cx={x} cy={y - 2} rx="5" ry="4" fill="#8A5A2B" />
    </>
  )
}

function car(x: number, y: number) {
  return (
    <>
      <rect x={x - 36} y={y - 4} width="72" height="28" rx="10" fill="#E85D75" stroke={INK} strokeWidth="3" />
      <path d={`M${x - 16} ${y - 4} l10 -18 h20 l10 18`} fill="#7EC8E3" stroke={INK} strokeWidth="3" />
      <circle cx={x - 20} cy={y + 24} r="10" fill="#1B3A4B" />
      <circle cx={x + 20} cy={y + 24} r="10" fill="#1B3A4B" />
      <circle cx={x - 20} cy={y + 24} r="4" fill="#fff" />
      <circle cx={x + 20} cy={y + 24} r="4" fill="#fff" />
    </>
  )
}

function umbrella(x: number, y: number, fill = '#5EB5D8') {
  return (
    <>
      <path d={`M${x - 36} ${y} q36 -40 72 0`} fill={fill} stroke={INK} strokeWidth="3" />
      <path d={`M${x} ${y} v36`} fill="none" stroke={INK} strokeWidth="4" />
      <path d={`M${x} ${y + 36} q10 8 16 0`} fill="none" stroke="#E85D75" strokeWidth="4" />
    </>
  )
}

function cup(x: number, y: number, fill = '#E85D75') {
  return (
    <>
      <path d={`M${x - 18} ${y - 16} h36 l-6 44 h-24 z`} fill={fill} stroke={INK} strokeWidth="3" />
      <ellipse cx={x} cy={y - 16} rx="18" ry="6" fill="#fff" stroke={INK} strokeWidth="3" />
      <path d={`M${x + 18} ${y - 4} q16 6 4 22`} fill="none" stroke={fill} strokeWidth="5" />
    </>
  )
}

function bag(x: number, y: number, fill = '#3D6BB3') {
  return (
    <>
      <rect x={x - 22} y={y - 8} width="44" height="40" rx="8" fill={fill} stroke={INK} strokeWidth="3" />
      <path d={`M${x - 12} ${y - 8} v-16 q12 -10 24 0 v16`} fill="none" stroke={INK} strokeWidth="4" />
    </>
  )
}

function star(x: number, y: number, fill = '#F5C84C') {
  return (
    <polygon
      points={`${x},${y - 24} ${x + 8},${y - 6} ${x + 26},${y - 6} ${x + 12},${y + 6} ${x + 16},${y + 24} ${x},${y + 14} ${x - 16},${y + 24} ${x - 12},${y + 6} ${x - 26},${y - 6} ${x - 8},${y - 6}`}
      fill={fill}
      stroke={INK}
      strokeWidth="3"
    />
  )
}

function ribbon(x: number, y: number, long: boolean, fill = '#E85D75') {
  const w = long ? 88 : 36
  return <rect x={x - w / 2} y={y - 10} width={w} height="20" rx="10" fill={fill} stroke={INK} strokeWidth="3" />
}

function pencil(x: number, y: number, long: boolean) {
  const w = long ? 96 : 42
  return (
    <>
      <rect x={x - w / 2} y={y - 8} width={w - 14} height="16" rx="4" fill="#F5C84C" stroke={INK} strokeWidth="3" />
      <polygon
        points={`${x + w / 2 - 14},${y - 8} ${x + w / 2},${y} ${x + w / 2 - 14},${y + 8}`}
        fill="#FFD8B0"
        stroke={INK}
        strokeWidth="3"
      />
    </>
  )
}

function parkScene(missingBall: boolean) {
  return (
    <>
      <ellipse cx="110" cy="150" rx="86" ry="14" fill="#6BCB8B" />
      <circle cx="36" cy="40" r="16" fill="#F5C84C" />
      <polygon points="168,150 184,78 200,150" fill="#2F8A4E" />
      {kid(78, 108, { pose: 'stand', shirt: '#7EC8E3' })}
      {missingBall ? null : ball(132, 128, '#E85D75')}
      {cat(176, 128)}
    </>
  )
}

function draw(id: KidPicId) {
  switch (id) {
    case 'stand':
      return kid(110, 100, { pose: 'stand' })
    case 'turn':
      return kid(110, 100, { pose: 'turn', shirt: '#FF9B7A' })
    case 'sit':
      return kid(110, 96, { pose: 'sit', shirt: '#6BCB8B' })
    case 'step':
      return kid(110, 100, { pose: 'step', shirt: '#F5C84C' })
    case 'red-cup':
      return cup(110, 96, '#E85D75')
    case 'blue-bag':
      return bag(110, 96, '#3D6BB3')
    case 'yellow-star':
      return star(110, 96)
    case 'red-apple':
      return apple(110, 100, '#E85D75')
    case 'blue-ball':
      return ball(110, 100, '#3D6BB3')
    case 'long-ribbon':
      return ribbon(110, 100, true)
    case 'short-ribbon':
      return ribbon(110, 100, false, '#7EC8E3')
    case 'long-pencil':
      return pencil(110, 100, true)
    case 'short-crayon':
      return pencil(110, 100, false)
    case 'apple':
    case 'story-apple':
      return apple(110, 100)
    case 'banana':
      return banana(110, 108)
    case 'orange':
      return orange(110, 100)
    case 'car':
      return car(110, 96)
    case 'teddy':
      return teddy(110, 88)
    case 'ball':
      return ball(110, 100, '#E85D75')
    case 'cat':
    case 'story-dog':
      return cat(110, 100)
    case 'umbrella':
    case 'story-umbrella':
      return umbrella(110, 88)
    case 'park-full':
      return parkScene(false)
    case 'park-no-ball':
      return parkScene(true)
    case 'story-boy':
      return kid(110, 100, { pose: 'stand', shirt: '#7EC8E3' })
    case 'story-rain':
      return (
        <>
          <circle cx="48" cy="40" r="14" fill="#A9C4D4" />
          {Array.from({ length: 6 }, (_, i) => (
            <line
              key={i}
              x1={70 + i * 18}
              y1="36"
              x2={62 + i * 18}
              y2="70"
              stroke="#5EB5D8"
              strokeWidth="4"
              strokeLinecap="round"
            />
          ))}
          {kid(110, 112, { pose: 'stand', shirt: '#FF9B7A' })}
        </>
      )
    case 'story-cake':
      return (
        <>
          <rect x="70" y="88" width="80" height="40" rx="8" fill="#FFD8B0" stroke={INK} strokeWidth="3" />
          <rect x="78" y="68" width="64" height="24" rx="8" fill="#E85D75" stroke={INK} strokeWidth="3" />
          <rect x="104" y="48" width="8" height="20" fill="#F5C84C" />
          <circle cx="108" cy="46" r="5" fill="#FF7A59" />
        </>
      )
    case 'token':
      return star(110, 96, '#F5C84C')
    default:
      return kid(110, 100)
  }
}
