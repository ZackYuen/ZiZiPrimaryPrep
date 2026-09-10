import type { StoryScene } from '../data/storyInterview'

type Props = {
  scene: StoryScene
  alt: string
  className?: string
}

export function StoryFrameArt({ scene, alt, className = '' }: Props) {
  const outdoors = ['park-teddy', 'chase-butterfly', 'rain-leave'].includes(scene)
  return (
    <svg
      className={`story-frame-art ${className}`}
      viewBox="0 0 360 260"
      role="img"
      aria-label={alt}
    >
      <rect width="360" height="260" rx="28" fill={outdoors ? '#DDF3FF' : '#FFF5DF'} />
      {outdoors ? <ParkBackground rainy={scene === 'rain-leave'} /> : <RoomBackground />}
      {drawScene(scene)}
    </svg>
  )
}

function drawScene(scene: StoryScene) {
  switch (scene) {
    case 'park-teddy':
      return (
        <>
          <Bench />
          <Person x={118} y={165} holdingTeddy wave />
          <Butterfly x={282} y={72} />
        </>
      )
    case 'chase-butterfly':
      return (
        <>
          <Bench />
          <Teddy x={236} y={151} />
          <Person x={115} y={165} running />
          <Butterfly x={72} y={77} />
        </>
      )
    case 'rain-leave':
      return (
        <>
          <Bench />
          <Teddy x={236} y={151} />
          <Person x={100} y={168} running />
          <path d="M136 54 Q178 13 220 54Z" fill="#FF7A59" stroke="#1B3A4B" strokeWidth="4" />
          <path d="M178 52v93q0 13 13 13" fill="none" stroke="#1B3A4B" strokeWidth="5" strokeLinecap="round" />
        </>
      )
    case 'home-missing':
      return (
        <>
          <rect x="225" y="88" width="96" height="104" rx="8" fill="#7EC8E3" stroke="#1B3A4B" strokeWidth="5" />
          <circle cx="301" cy="140" r="5" fill="#F5C84C" />
          <Person x={130} y={170} worried />
          <g stroke="#B85C45" strokeWidth="5" strokeLinecap="round">
            <path d="M189 75l10-16" />
            <path d="M207 83l18-7" />
            <path d="M181 91l-2-19" />
          </g>
        </>
      )
    case 'indoor-ball':
      return (
        <>
          <Plant x={285} y={166} />
          <Person x={90} y={174} />
          <Person x={245} y={174} wave />
          <Ball x={171} y={142} />
        </>
      )
    case 'plant-hit':
      return (
        <>
          <Plant x={287} y={166} />
          <Person x={83} y={174} worried />
          <Person x={202} y={174} worried />
          <Ball x={258} y={123} motion />
        </>
      )
    case 'broken-pot':
      return (
        <>
          <Person x={98} y={174} worried />
          <Person x={250} y={174} worried />
          <g transform="translate(178 195)">
            <path d="M-37 12l19-32 17 29 19-32 23 35" fill="#D47B4A" stroke="#1B3A4B" strokeWidth="4" strokeLinejoin="round" />
            <path d="M0-21q-27-33-45-18M0-21q27-38 48-16M0-21v-40" fill="none" stroke="#2F8A4E" strokeWidth="7" strokeLinecap="round" />
          </g>
        </>
      )
    case 'teacher-arrives':
      return (
        <>
          <Person x={72} y={174} worried />
          <Person x={185} y={174} worried />
          <Person x={294} y={165} teacher />
          <g transform="translate(232 212) scale(.7)">
            <path d="M-37 12l19-32 17 29 19-32 23 35" fill="#D47B4A" stroke="#1B3A4B" strokeWidth="5" />
            <path d="M0-21v-40" stroke="#2F8A4E" strokeWidth="8" />
          </g>
        </>
      )
  }
}

function ParkBackground({ rainy = false }: { rainy?: boolean }) {
  return (
    <>
      <circle cx="55" cy="52" r="24" fill={rainy ? '#BEC9D2' : '#F5C84C'} />
      <path d="M0 190q72-35 150 0t210 0v70H0z" fill="#83D49B" />
      <rect x="308" y="106" width="10" height="94" rx="5" fill="#8A5A2B" />
      <circle cx="313" cy="94" r="37" fill="#4FAE70" />
      {rainy && (
        <g stroke="#5797B7" strokeWidth="4" strokeLinecap="round" opacity=".75">
          {[35, 77, 118, 248, 287, 329].map((x) => (
            <path key={x} d={`M${x} 25l-10 20`} />
          ))}
        </g>
      )}
    </>
  )
}

function RoomBackground() {
  return (
    <>
      <rect y="205" width="360" height="55" fill="#E8C797" />
      <rect x="235" y="28" width="92" height="75" rx="6" fill="#C9ECFF" stroke="#1B3A4B" strokeWidth="4" />
      <path d="M281 30v71M237 66h88" stroke="#fff" strokeWidth="5" />
      <rect x="25" y="38" width="120" height="64" rx="7" fill="#7CB98D" stroke="#1B3A4B" strokeWidth="4" />
      <path d="M43 59h64M43 78h82" stroke="#E8F5E9" strokeWidth="5" strokeLinecap="round" />
    </>
  )
}

function Person({
  x,
  y,
  worried = false,
  wave = false,
  running = false,
  holdingTeddy = false,
  teacher = false,
}: {
  x: number
  y: number
  worried?: boolean
  wave?: boolean
  running?: boolean
  holdingTeddy?: boolean
  teacher?: boolean
}) {
  const shirt = teacher ? '#845EC2' : '#4AAFD2'
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cy="-78" r="27" fill="#FFD4AE" stroke="#1B3A4B" strokeWidth="4" />
      <path d="M-26-88q25-37 52 0v-14q-26-24-52 1z" fill={teacher ? '#553B72' : '#45362E'} />
      <circle cx="-9" cy="-79" r="3.5" fill="#1B3A4B" />
      <circle cx="9" cy="-79" r="3.5" fill="#1B3A4B" />
      {worried ? (
        <path d="M-8-65q8-8 16 0" fill="none" stroke="#1B3A4B" strokeWidth="3" strokeLinecap="round" />
      ) : (
        <path d="M-9-67q9 9 18 0" fill="none" stroke="#1B3A4B" strokeWidth="3" strokeLinecap="round" />
      )}
      <rect x="-28" y="-50" width="56" height="61" rx="18" fill={shirt} stroke="#1B3A4B" strokeWidth="4" />
      <path
        d={wave ? 'M24-38q27-18 25-43' : running ? 'M24-35l29 15' : 'M25-36l18 38'}
        fill="none"
        stroke="#FFD4AE"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path d={running ? 'M-20 5l-25 34M18 6l27 19' : 'M-17 5l-7 40M17 5l7 40'} fill="none" stroke="#425B76" strokeWidth="13" strokeLinecap="round" />
      {teacher && (
        <path d="M-34-40l-20 35" fill="none" stroke="#FFD4AE" strokeWidth="12" strokeLinecap="round" />
      )}
      {holdingTeddy && <Teddy x={38} y={-6} scale={0.62} />}
    </g>
  )
}

function Teddy({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle cx="-15" cy="-32" r="11" fill="#B87943" stroke="#1B3A4B" strokeWidth="3" />
      <circle cx="15" cy="-32" r="11" fill="#B87943" stroke="#1B3A4B" strokeWidth="3" />
      <circle cy="-21" r="24" fill="#C98B52" stroke="#1B3A4B" strokeWidth="3" />
      <ellipse cy="19" rx="25" ry="29" fill="#C98B52" stroke="#1B3A4B" strokeWidth="3" />
      <circle cx="-8" cy="-24" r="3" fill="#1B3A4B" />
      <circle cx="8" cy="-24" r="3" fill="#1B3A4B" />
      <ellipse cy="-12" rx="7" ry="5" fill="#573722" />
    </g>
  )
}

function Bench() {
  return (
    <g>
      <rect x="202" y="130" width="103" height="17" rx="5" fill="#B87943" stroke="#1B3A4B" strokeWidth="4" />
      <rect x="202" y="156" width="103" height="17" rx="5" fill="#B87943" stroke="#1B3A4B" strokeWidth="4" />
      <path d="M216 171l-8 41M291 171l8 41" stroke="#1B3A4B" strokeWidth="6" />
    </g>
  )
}

function Butterfly({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="-10" cy="-5" rx="12" ry="18" fill="#FF9B7A" transform="rotate(-30)" />
      <ellipse cx="10" cy="-5" rx="12" ry="18" fill="#F5C84C" transform="rotate(30)" />
      <path d="M0-12v27" stroke="#1B3A4B" strokeWidth="4" strokeLinecap="round" />
    </g>
  )
}

function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 4q-39-45-55-22M0 4q39-48 57-23M0 4v-60" fill="none" stroke="#2F8A4E" strokeWidth="9" strokeLinecap="round" />
      <path d="M-30 0h60l-8 48h-44z" fill="#D47B4A" stroke="#1B3A4B" strokeWidth="4" />
    </g>
  )
}

function Ball({ x, y, motion = false }: { x: number; y: number; motion?: boolean }) {
  return (
    <g>
      {motion && <path d={`M${x - 58} ${y + 9}h39`} stroke="#7B8790" strokeWidth="5" strokeLinecap="round" />}
      <circle cx={x} cy={y} r="23" fill="#FF7A59" stroke="#1B3A4B" strokeWidth="4" />
      <path d={`M${x - 18} ${y - 5}q18 18 36 0M${x} ${y - 22}v44`} fill="none" stroke="#FFF" strokeWidth="4" />
    </g>
  )
}
