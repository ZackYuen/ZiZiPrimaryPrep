import type { SceneId } from '../data/content'

type Props = {
  scene: SceneId
  className?: string
}

export function SceneArt({ scene, className = '' }: Props) {
  return (
    <div className={`scene-art scene-art--${scene} ${className}`} aria-hidden>
      <svg viewBox="0 0 320 180" className="scene-art__svg">
        {scene === 'sleep' && <SleepScene />}
        {scene === 'run-park' && <RunParkScene />}
        {scene === 'classroom-read' && <ClassroomScene />}
        {scene === 'drink' && <DrinkScene />}
        {scene === 'eat' && <EatScene />}
        {scene === 'read-book' && <ReadScene />}
        {scene === 'share-cookie' && <ShareScene />}
        {scene === 'broken-vase' && <VaseScene />}
        {scene === 'playground' && <PlaygroundScene />}
        {scene === 'intro' && <IntroScene />}
      </svg>
    </div>
  )
}

function Sky({ night = false }: { night?: boolean }) {
  return (
    <>
      <rect width="320" height="180" fill={night ? '#1B3A4B' : '#B8E4F5'} />
      {!night && <circle cx="270" cy="40" r="22" fill="#F5C84C" className="scene-sun" />}
      {night && (
        <>
          <circle cx="260" cy="36" r="18" fill="#F5E6A8" />
          <circle cx="268" cy="32" r="18" fill="#1B3A4B" />
          <circle cx="40" cy="30" r="2" fill="#fff" />
          <circle cx="70" cy="50" r="1.5" fill="#fff" />
          <circle cx="110" cy="24" r="2" fill="#fff" />
        </>
      )}
    </>
  )
}

function SleepScene() {
  return (
    <g>
      <Sky night />
      <rect x="0" y="120" width="320" height="60" fill="#3D5F72" />
      <rect x="40" y="90" width="160" height="70" rx="12" fill="#7EC8E3" />
      <rect x="50" y="100" width="100" height="40" rx="10" fill="#FFF8EF" />
      <circle cx="80" cy="95" r="16" fill="#FFE08A" className="scene-bob" />
      <path d="M64 95 Q80 88 96 95" fill="none" stroke="#1B3A4B" strokeWidth="2" />
      <rect x="220" y="40" width="70" height="55" rx="6" fill="#5EB5D8" opacity="0.5" />
      <path d="M20 150 Q80 130 140 150 T260 150" fill="none" stroke="#6BCB8B" strokeWidth="4" opacity="0.4" />
    </g>
  )
}

function RunParkScene() {
  return (
    <g>
      <Sky />
      <ellipse cx="160" cy="150" rx="180" ry="40" fill="#6BCB8B" />
      <circle cx="50" cy="120" r="28" fill="#2F8A4E" />
      <rect x="46" y="120" width="8" height="30" fill="#8B5A2B" />
      <g className="scene-run">
        <circle cx="170" cy="100" r="16" fill="#FFE08A" />
        <path d="M170 116 L170 145" stroke="#FF7A59" strokeWidth="8" strokeLinecap="round" />
        <path d="M170 125 L150 140" stroke="#FF7A59" strokeWidth="6" strokeLinecap="round" />
        <path d="M170 125 L192 138" stroke="#FF7A59" strokeWidth="6" strokeLinecap="round" />
        <path d="M170 145 L158 165" stroke="#1B3A4B" strokeWidth="6" strokeLinecap="round" />
        <path d="M170 145 L186 165" stroke="#1B3A4B" strokeWidth="6" strokeLinecap="round" />
      </g>
      <circle cx="250" cy="130" r="10" fill="#F5C84C" className="scene-bob" />
    </g>
  )
}

function ClassroomScene() {
  return (
    <g>
      <rect width="320" height="180" fill="#FFF1D6" />
      <rect x="20" y="30" width="80" height="50" rx="6" fill="#7EC8E3" />
      <rect x="120" y="30" width="80" height="50" rx="6" fill="#7EC8E3" />
      <rect x="220" y="30" width="80" height="50" rx="6" fill="#7EC8E3" />
      <rect x="40" y="100" width="70" height="45" rx="6" fill="#E8C49A" />
      <rect x="130" y="100" width="70" height="45" rx="6" fill="#E8C49A" />
      <rect x="220" y="100" width="70" height="45" rx="6" fill="#E8C49A" />
      {[75, 165, 255].map((x) => (
        <g key={x}>
          <circle cx={x} cy="95" r="12" fill="#FFE08A" />
          <rect x={x - 14} y="118" width="20" height="14" rx="2" fill="#5EB5D8" className="scene-bob" />
        </g>
      ))}
    </g>
  )
}

function DrinkScene() {
  return (
    <g>
      <Sky />
      <rect x="0" y="130" width="320" height="50" fill="#E8D5B5" />
      <circle cx="150" cy="90" r="28" fill="#FFE08A" />
      <rect x="130" y="118" width="40" height="40" rx="8" fill="#5EB5D8" />
      <rect x="175" y="100" width="18" height="36" rx="4" fill="#7EC8E3" className="scene-bob" />
      <path d="M184 100 Q184 88 184 100" stroke="#B8E4F5" strokeWidth="3" className="scene-bob" />
    </g>
  )
}

function EatScene() {
  return (
    <g>
      <Sky />
      <ellipse cx="160" cy="150" rx="120" ry="28" fill="#E8D5B5" />
      <circle cx="150" cy="85" r="26" fill="#FFE08A" />
      <rect x="128" y="112" width="44" height="38" rx="8" fill="#FF9B7A" />
      <ellipse cx="200" cy="125" rx="28" ry="12" fill="#FFF8EF" />
      <path d="M185 125 Q200 118 215 125" stroke="#E8A820" strokeWidth="3" fill="none" />
      <circle cx="168" cy="100" r="4" fill="#1B3A4B" className="scene-bob" />
    </g>
  )
}

function ReadScene() {
  return (
    <g>
      <rect width="320" height="180" fill="#E7F6EE" />
      <rect x="40" y="40" width="100" height="70" rx="8" fill="#FFF8EF" />
      <circle cx="160" cy="90" r="26" fill="#FFE08A" />
      <path d="M130 120 L160 150 L190 120 Z" fill="#FF7A59" />
      <rect x="148" y="118" width="28" height="20" rx="3" fill="#5EB5D8" className="scene-bob" />
      <line x1="152" y1="124" x2="172" y2="124" stroke="#fff" strokeWidth="2" />
      <line x1="152" y1="130" x2="168" y2="130" stroke="#fff" strokeWidth="2" />
    </g>
  )
}

function ShareScene() {
  return (
    <g>
      <Sky />
      <ellipse cx="160" cy="155" rx="140" ry="30" fill="#6BCB8B" />
      <circle cx="110" cy="100" r="22" fill="#FFE08A" />
      <circle cx="210" cy="105" r="20" fill="#FFE08A" />
      <circle cx="155" cy="120" r="14" fill="#E8A820" className="scene-bob" />
      <path d="M148 118 Q155 110 162 118" fill="#C47A20" />
      <path d="M96 108 Q110 118 124 108" fill="none" stroke="#1B3A4B" strokeWidth="3" />
      <path d="M198 112 Q210 122 222 112" fill="none" stroke="#1B3A4B" strokeWidth="3" />
    </g>
  )
}

function VaseScene() {
  return (
    <g>
      <rect width="320" height="180" fill="#FFF1D6" />
      <rect x="0" y="140" width="320" height="40" fill="#E8D5B5" />
      <path d="M200 70 Q220 70 220 110 Q220 140 200 140 Q180 140 180 110 Q180 70 200 70" fill="#7EC8E3" />
      <circle cx="200" cy="60" r="10" fill="#FF7A59" />
      <circle cx="188" cy="55" r="8" fill="#F5C84C" />
      <g className="scene-bob">
        <circle cx="90" cy="100" r="20" fill="#FFE08A" />
        <circle cx="120" cy="130" r="10" fill="#5EB5D8" />
      </g>
      <path d="M210 120 L230 145" stroke="#1B3A4B" strokeWidth="2" strokeDasharray="4 3" />
      <path d="M190 125 L170 150" stroke="#1B3A4B" strokeWidth="2" strokeDasharray="4 3" />
    </g>
  )
}

function PlaygroundScene() {
  return (
    <g>
      <Sky />
      <ellipse cx="160" cy="155" rx="170" ry="35" fill="#6BCB8B" />
      <path d="M60 140 L60 80 L120 140 Z" fill="#5EB5D8" />
      <line x1="200" y1="70" x2="200" y2="140" stroke="#8B5A2B" strokeWidth="6" />
      <line x1="160" y1="70" x2="240" y2="70" stroke="#8B5A2B" strokeWidth="6" />
      <rect x="155" y="100" width="20" height="16" rx="4" fill="#FF7A59" className="scene-bob" />
      <circle cx="165" cy="92" r="10" fill="#FFE08A" className="scene-bob" />
    </g>
  )
}

function IntroScene() {
  return (
    <g>
      <Sky />
      <ellipse cx="160" cy="150" rx="150" ry="32" fill="#6BCB8B" />
      <rect x="40" y="70" width="90" height="70" rx="10" fill="#FFF8EF" />
      <rect x="55" y="85" width="60" height="8" rx="2" fill="#7EC8E3" />
      <rect x="55" y="100" width="45" height="8" rx="2" fill="#F5C84C" />
      <circle cx="210" cy="95" r="28" fill="#FFE08A" className="scene-bob" />
      <path d="M195 100 Q210 112 225 100" fill="none" stroke="#1B3A4B" strokeWidth="3" />
      <path d="M210 123 L210 155" stroke="#FF7A59" strokeWidth="10" strokeLinecap="round" />
    </g>
  )
}
