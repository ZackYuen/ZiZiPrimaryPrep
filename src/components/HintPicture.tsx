import type { HintVisualId } from '../lib/teachHint'

type Props = {
  visual: HintVisualId
  size?: number
  className?: string
}

/**
 * Concrete picture clues a 5-year-old can recognise (people, school, toys),
 * never abstract letter tiles.
 */
export function HintPicture({ visual, size = 260, className = '' }: Props) {
  return (
    <svg
      className={`hint-pic ${className}`}
      width={size}
      height={Math.round(size * 0.78)}
      viewBox="0 0 260 200"
      aria-hidden
    >
      <rect width="260" height="200" rx="24" fill="#FFF6E4" />
      <ellipse cx="130" cy="186" rx="90" ry="10" fill="#1B3A4B14" />
      {draw(visual)}
    </svg>
  )
}

function draw(visual: HintVisualId) {
  switch (visual) {
    case 'me':
    case 'intro':
      return introScene()
    case 'family':
      return (
        <>
          {person(70, 118, { scale: 0.78, body: '#5EB5D8' })}
          {person(130, 108, { scale: 1, wave: true, badge: 'Seth' })}
          {person(190, 118, { scale: 0.78, body: '#FF9B7A' })}
          <LabelText x={130} y={188} text="家人" />
        </>
      )
    case 'school':
      return schoolScene()
    case 'teacher':
      return (
        <>
          {person(86, 120, { scale: 0.8, hat: 'teacher', body: '#1B6B8A' })}
          {person(168, 128, { scale: 0.95, wave: true })}
          <rect x="28" y="36" width="70" height="48" rx="6" fill="#fff" stroke="#1B3A4B" strokeWidth="3" />
          <line x1="40" y1="52" x2="86" y2="52" stroke="#1B3A4B" strokeWidth="3" />
          <line x1="40" y1="64" x2="78" y2="64" stroke="#1B3A4B" strokeWidth="3" />
          <LabelText x={130} y={188} text="老師" />
        </>
      )
    case 'park':
    case 'run':
      return (
        <>
          <ellipse cx="130" cy="168" rx="100" ry="16" fill="#6BCB8B" />
          <circle cx="48" cy="48" r="20" fill="#F5C84C" />
          <polygon points="28,168 44,96 60,168" fill="#2F8A4E" />
          {person(150, 118, { wave: true, run: true })}
          <LabelText x={130} y={192} text="公園" />
        </>
      )
    case 'eat':
      return (
        <>
          {person(80, 88, { scale: 0.75 })}
          <ellipse cx="160" cy="128" rx="58" ry="18" fill="#fff" stroke="#1B3A4B" strokeWidth="3" />
          <circle cx="140" cy="114" r="14" fill="#FF7A59" />
          <circle cx="172" cy="110" r="12" fill="#6BCB8B" />
          <rect x="128" y="118" width="8" height="28" rx="2" fill="#8A5A2B" />
          <LabelText x={130} y={188} text="食飯" />
        </>
      )
    case 'drink':
      return (
        <>
          {person(88, 100, { scale: 0.8 })}
          <path d="M150 70 h40 l-8 70 h-24 z" fill="#7EC8E3" stroke="#1B3A4B" strokeWidth="3" />
          <ellipse cx="170" cy="70" rx="20" ry="8" fill="#fff" stroke="#1B3A4B" strokeWidth="3" />
          <path d="M186 78 q18 12 8 28" fill="none" stroke="#7EC8E3" strokeWidth="4" />
          <LabelText x={130} y={188} text="飲水" />
        </>
      )
    case 'sleep':
      return (
        <>
          <rect x="36" y="108" width="188" height="44" rx="12" fill="#7EC8E3" />
          <rect x="48" y="96" width="70" height="18" rx="8" fill="#fff" />
          {person(90, 96, { scale: 0.7, sleep: true })}
          <text x="186" y="72" fontSize="22" fontWeight="800" fill="#1B6B8A">
            zzz
          </text>
          <LabelText x={130} y={188} text="瞓覺" />
        </>
      )
    case 'book':
    case 'write':
      return (
        <>
          {person(64, 120, { scale: 0.75 })}
          <path d="M110 58 h54 v78 H118 a8 8 0 0 1-8-8 V58z" fill="#fff" stroke="#1B3A4B" strokeWidth="3" />
          <path d="M164 58 h54 v70 a8 8 0 0 1-8 8 h-46 V58z" fill="#FFE08A" stroke="#1B3A4B" strokeWidth="3" />
          <line x1="122" y1="78" x2="154" y2="78" stroke="#1B3A4B" strokeWidth="3" />
          <line x1="122" y1="94" x2="148" y2="94" stroke="#1B3A4B" strokeWidth="3" />
          <LabelText x={130} y={188} text="書" />
        </>
      )
    case 'share':
      return (
        <>
          {person(70, 120, { scale: 0.85, body: '#7EC8E3' })}
          {person(190, 120, { scale: 0.85, body: '#FF9B7A', wave: true })}
          <circle cx="130" cy="92" r="18" fill="#E8A84A" stroke="#1B3A4B" strokeWidth="3" />
          <circle cx="130" cy="86" r="4" fill="#8A5A2B" />
          <LabelText x={130} y={188} text="分享" />
        </>
      )
    case 'vase':
      return (
        <>
          {person(58, 124, { scale: 0.7 })}
          <path d="M124 40 h28 v20 h20 v62 a32 32 0 0 1-68 0 V60 h20z" fill="#7EC8E3" stroke="#1B3A4B" strokeWidth="3" />
          <path d="M88 150 L188 78" stroke="#FF7A59" strokeWidth="7" strokeLinecap="round" />
          <LabelText x={130} y={188} text="花樽打破" />
        </>
      )
    case 'happy':
      return (
        <>
          {face(130, 96, 'happy', 1.15)}
          {person(130, 150, { scale: 0.55, wave: true })}
          <LabelText x={130} y={188} text="開心" />
        </>
      )
    case 'sad':
      return (
        <>
          {face(130, 90, 'sad', 1.15)}
          <rect x="96" y="132" width="28" height="22" rx="4" fill="#7EC8E3" />
          <LabelText x={130} y={188} text="傷心" />
        </>
      )
    case 'angry':
      return (
        <>
          {face(130, 90, 'angry', 1.15)}
          <LabelText x={130} y={188} text="嬲" />
        </>
      )
    case 'feelings':
      return (
        <>
          {face(58, 88, 'happy', 0.7)}
          {face(130, 78, 'sad', 0.7)}
          {face(202, 88, 'angry', 0.7)}
          <LabelText x={58} y={148} text="開心" />
          <LabelText x={130} y={148} text="傷心" />
          <LabelText x={202} y={148} text="嬲" />
        </>
      )
    case 'zoo':
      return zooScene()
    case 'job':
    case 'policeman':
      return (
        <>
          {person(130, 118, { scale: 1.05, hat: 'police', body: '#2B4C7E' })}
          <LabelText x={130} y={188} text="警察" />
        </>
      )
    case 'uniform':
      return (
        <>
          {person(130, 112, { scale: 1.05, hat: 'police', body: '#2B4C7E' })}
          <rect x="88" y="108" width="84" height="28" rx="6" fill="#3D6BB3" />
          <LabelText x={130} y={188} text="藍色制服" />
        </>
      )
    case 'football':
      return (
        <>
          <ellipse cx="130" cy="168" rx="100" ry="14" fill="#6BCB8B" />
          {person(86, 120, { scale: 0.85, body: '#2B4C7E', hat: 'police' })}
          {person(168, 124, { scale: 0.9, wave: true })}
          <circle cx="130" cy="148" r="14" fill="#fff" stroke="#1B3A4B" strokeWidth="3" />
          <LabelText x={130} y={192} text="週末踢波" />
        </>
      )
    case 'clock':
      return (
        <>
          <circle cx="130" cy="88" r="58" fill="#fff" stroke="#1B3A4B" strokeWidth="5" />
          <line x1="130" y1="88" x2="130" y2="48" stroke="#1B3A4B" strokeWidth="7" strokeLinecap="round" />
          <line x1="130" y1="88" x2="172" y2="88" stroke="#FF7A59" strokeWidth="5" strokeLinecap="round" />
          <circle cx="130" cy="88" r="6" fill="#1B3A4B" />
          <LabelText x={88} y={168} text="短針＝點" />
          <LabelText x={176} y={168} text="長針＝分" />
        </>
      )
    case 'coins':
      return (
        <>
          <circle cx="88" cy="100" r="34" fill="#D4A24C" stroke="#8A6A12" strokeWidth="3" />
          <text x="88" y="108" textAnchor="middle" fontSize="16" fontWeight="800" fill="#5A3510">
            $10
          </text>
          <circle cx="148" cy="92" r="28" fill="#C0C6CC" stroke="#1B3A4B" strokeWidth="3" />
          <text x="148" y="98" textAnchor="middle" fontSize="14" fontWeight="800" fill="#1B3A4B">
            $2
          </text>
          <circle cx="186" cy="118" r="20" fill="#D4A24C" stroke="#8A6A12" strokeWidth="3" />
          <LabelText x={130} y={178} text="錢幣" />
        </>
      )
    case 'like-blue':
      return (
        <>
          <circle cx="52" cy="48" r="22" fill="#F5C84C" />
          <path d="M0 78 Q80 58 140 78 T260 78 V200 H0z" fill="#7EC8E3" />
          {person(86, 124, { scale: 0.85 })}
          <rect x="150" y="88" width="70" height="54" rx="8" fill="#fff" stroke="#1B3A4B" strokeWidth="3" />
          <path d="M162 128 Q184 96 214 118" fill="none" stroke="#1B6B8A" strokeWidth="4" />
          <rect x="198" y="70" width="10" height="36" rx="3" fill="#8A5A2B" />
          <circle cx="203" cy="68" r="8" fill="#5EB5D8" />
          <LabelText x={130} y={188} text="藍色 · 畫畫" />
        </>
      )
    case 'talk':
      return (
        <>
          {person(92, 118, { wave: true })}
          <path
            d="M148 44 h92 v40 h-22 l-16 16 v-16 h-54z"
            fill="#fff"
            stroke="#1B3A4B"
            strokeWidth="3"
          />
          <text x="194" y="70" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1B3A4B">
            你好
          </text>
          <LabelText x={130} y={188} text="講一句" />
        </>
      )
    case 'sort':
      return (
        <>
          {face(78, 88, 'happy', 0.85)}
          {face(182, 88, 'sad', 0.85)}
          <text x="78" y="158" textAnchor="middle" fontSize="32" fill="#1F6B3A" fontWeight="800">
            ＋
          </text>
          <text x="182" y="158" textAnchor="middle" fontSize="32" fill="#A0452A" fontWeight="800">
            －
          </text>
        </>
      )
    case 'reorder':
      return (
        <>
          {person(48, 120, { scale: 0.7 })}
          <rect x="88" y="70" width="48" height="36" rx="12" fill="#fff" stroke="#1B3A4B" strokeWidth="3" />
          <text x="112" y="94" textAnchor="middle" fontSize="14" fontWeight="800">
            我
          </text>
          <rect x="142" y="70" width="48" height="36" rx="12" fill="#FFE08A" stroke="#1B3A4B" strokeWidth="3" />
          <text x="166" y="94" textAnchor="middle" fontSize="14" fontWeight="800">
            鍾意
          </text>
          <rect x="196" y="70" width="48" height="36" rx="12" fill="#7EC8E3" stroke="#1B3A4B" strokeWidth="3" />
          <text x="220" y="94" textAnchor="middle" fontSize="14" fontWeight="800">
            跑
          </text>
          <path d="M112 128 l16 16 16-16" fill="none" stroke="#FF7A59" strokeWidth="5" />
          <LabelText x={160} y={178} text="拖字排句" />
        </>
      )
    case 'move':
      return (
        <>
          {person(100, 118, { wave: true })}
          <path
            d="M168 70 l36 -24 M168 70 l36 24"
            fill="none"
            stroke="#FF7A59"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <LabelText x={130} y={188} text="做動作" />
        </>
      )
    case 'weekend':
      return (
        <>
          <rect x="48" y="36" width="164" height="118" rx="14" fill="#fff" stroke="#1B3A4B" strokeWidth="3" />
          <rect x="48" y="36" width="164" height="32" fill="#FF7A59" />
          <text x="130" y="58" textAnchor="middle" fontSize="16" fontWeight="800" fill="#fff">
            日曆
          </text>
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2, 3, 4, 5, 6].map((c) => (
              <circle
                key={`${r}-${c}`}
                cx={70 + c * 20}
                cy={86 + r * 16}
                r="5"
                fill={c >= 5 ? '#F5C84C' : '#7EC8E3'}
              />
            )),
          )}
        </>
      )
    case 'plus':
    case 'minus':
    case 'mix':
      return (
        <>
          {person(56, 120, { scale: 0.7 })}
          <circle cx="130" cy="88" r="18" fill="#FF7A59" />
          <circle cx="168" cy="88" r="18" fill="#F5C84C" />
          <circle cx="206" cy="88" r="18" fill="#7EC8E3" />
          <text x="168" y="148" textAnchor="middle" fontSize="28" fontWeight="800" fill="#1B3A4B">
            {visual === 'minus' ? '－' : '＋'}
          </text>
          <LabelText x={168} y={178} text="數一數" />
        </>
      )
    default:
      return introScene()
  }
}

function introScene() {
  return (
    <>
      {person(70, 118, { wave: true, badge: 'Seth' })}
      <g transform="translate(128 46)">
        <rect width="56" height="64" rx="12" fill="#FFE08A" stroke="#1B3A4B" strokeWidth="3" />
        <text x="28" y="42" textAnchor="middle" fontSize="28" fontWeight="800" fill="#1B3A4B">
          5
        </text>
        <text x="28" y="58" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1B3A4B">
          歲
        </text>
      </g>
      <g transform="translate(188 58)">
        <polygon points="0,28 32,-4 64,28" fill="#FF7A59" />
        <rect x="8" y="28" width="48" height="36" fill="#7EC8E3" stroke="#1B3A4B" strokeWidth="3" />
        <rect x="26" y="44" width="12" height="20" fill="#8A5A2B" />
      </g>
      <LabelText x={70} y={188} text="名" />
      <LabelText x={156} y={188} text="5歲" />
      <LabelText x={220} y={188} text="學校" />
    </>
  )
}

function schoolScene() {
  return (
    <>
      <polygon points="40,70 130,22 220,70" fill="#FF7A59" />
      <rect x="52" y="70" width="156" height="86" fill="#7EC8E3" stroke="#1B3A4B" strokeWidth="3" />
      <rect x="118" y="108" width="28" height="48" fill="#8A5A2B" />
      <rect x="70" y="88" width="28" height="22" fill="#FFE08A" />
      <rect x="162" y="88" width="28" height="22" fill="#FFE08A" />
      {person(42, 150, { scale: 0.55, wave: true })}
      <LabelText x={130} y={192} text="幼稚園" />
    </>
  )
}

function zooScene() {
  return (
    <>
      <ellipse cx="86" cy="128" rx="44" ry="26" fill="#A0A0A8" />
      <circle cx="58" cy="104" r="16" fill="#A0A0A8" />
      <circle cx="52" cy="100" r="4" fill="#1B3A4B" />
      <circle cx="188" cy="118" r="30" fill="#C47A48" />
      <circle cx="176" cy="108" r="5" fill="#1B3A4B" />
      <circle cx="204" cy="108" r="5" fill="#1B3A4B" />
      {person(130, 150, { scale: 0.5, wave: true })}
      <LabelText x={86} y={178} text="大象" />
      <LabelText x={188} y={178} text="馬騮" />
    </>
  )
}

function person(
  x: number,
  y: number,
  opts: {
    scale?: number
    wave?: boolean
    run?: boolean
    sleep?: boolean
    badge?: string
    body?: string
    hat?: 'police' | 'teacher'
  } = {},
) {
  const s = opts.scale ?? 1
  const body = opts.body || '#7EC8E3'
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) translate(-40 -70)`}>
      {opts.hat === 'police' && <ellipse cx="40" cy="8" rx="22" ry="8" fill="#1B3A4B" />}
      {opts.hat === 'teacher' && <rect x="18" y="2" width="44" height="10" rx="3" fill="#1B6B8A" />}
      <circle cx="40" cy="28" r="18" fill="#FFE08A" />
      <path d="M24 20 Q28 8 40 10 Q52 8 56 20" fill="#1B3A4B" />
      <circle cx="34" cy="26" r="2.4" fill="#1B3A4B" />
      <circle cx="46" cy="26" r="2.4" fill="#1B3A4B" />
      <path
        d={opts.sleep ? 'M34 36 Q40 34 46 36' : 'M34 36 Q40 42 46 36'}
        fill="none"
        stroke="#1B3A4B"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <rect x="24" y="46" width="32" height="34" rx="12" fill={body} />
      <path d="M26 80 L22 102" stroke="#FFE08A" strokeWidth="7" strokeLinecap="round" />
      <path
        d={opts.run ? 'M54 80 L70 96' : 'M54 80 L58 102'}
        stroke="#FFE08A"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {opts.wave ? (
        <path d="M56 54 Q78 28 70 16" fill="none" stroke="#FFE08A" strokeWidth="8" strokeLinecap="round" />
      ) : (
        <path d="M56 54 L66 78" fill="none" stroke="#FFE08A" strokeWidth="8" strokeLinecap="round" />
      )}
      {opts.badge && (
        <g transform="translate(52 40)">
          <rect width="44" height="18" rx="6" fill="#fff" stroke="#1B3A4B" strokeWidth="2" />
          <text x="22" y="13" textAnchor="middle" fontSize="10" fontWeight="800" fill="#1B3A4B">
            {opts.badge}
          </text>
        </g>
      )}
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
      {mood === 'angry' && (
        <>
          <path d="M24 28 L34 32" stroke="#1B3A4B" strokeWidth="3" />
          <path d="M56 28 L46 32" stroke="#1B3A4B" strokeWidth="3" />
        </>
      )}
      <circle cx="30" cy="34" r="3" fill="#1B3A4B" />
      <circle cx="50" cy="34" r="3" fill="#1B3A4B" />
      <path d={mouth} fill="none" stroke="#1B3A4B" strokeWidth="3" strokeLinecap="round" />
    </g>
  )
}

function LabelText({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontSize="13" fontWeight="800" fill="#1B3A4B">
      {text}
    </text>
  )
}
