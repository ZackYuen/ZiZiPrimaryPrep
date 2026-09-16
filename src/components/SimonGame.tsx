import { useEffect, useState } from 'react'
import { playSfx } from '../hooks/useSfx'
import type { SimonAction, SimonGame as SimonConfig } from '../data/content'

type Props = {
  config: SimonConfig
  locked?: boolean
  reveal?: boolean
  onSolved: () => void
  onWrong?: () => void
  onSpeak?: (text: string, lang: 'en-US' | 'zh-HK') => void
}

const ACTION_LABEL: Record<SimonAction, string> = {
  head: '摸頭',
  clap: '拍手',
  foot: '單腳',
  turn: '轉圈',
  blue: '指藍',
  sit: '坐下',
  nose: '摸鼻',
  door: '指門',
}

function KidPose({ action, still }: { action: SimonAction | 'idle'; still?: boolean }) {
  const pose = still ? 'idle' : action
  return (
    <svg className="simon-kid" viewBox="0 0 180 170" aria-hidden>
      <ellipse cx="90" cy="158" rx="48" ry="8" fill="#d8c2a0" />
      {pose === 'sit' ? (
        <>
          <rect x="62" y="96" width="56" height="38" rx="16" fill="#f4c24a" />
          <circle cx="90" cy="58" r="26" fill="#f3d2b3" />
          <circle cx="80" cy="54" r="3" fill="#2c1810" />
          <circle cx="100" cy="54" r="3" fill="#2c1810" />
          <path d="M80 68 Q90 74 100 68" fill="none" stroke="#2c1810" strokeWidth="2.5" />
          <path d="M58 78 Q90 40 122 78" fill="#2c1810" />
          <path d="M48 108 Q70 118 90 112" fill="none" stroke="#f3d2b3" strokeWidth="10" strokeLinecap="round" />
          <path d="M132 108 Q110 118 90 112" fill="none" stroke="#f3d2b3" strokeWidth="10" strokeLinecap="round" />
        </>
      ) : (
        <>
          <rect x="68" y="78" width="44" height="54" rx="16" fill="#f4c24a" />
          <circle cx="90" cy="48" r="26" fill="#f3d2b3" />
          <circle cx="80" cy="44" r="3" fill="#2c1810" />
          <circle cx="100" cy="44" r="3" fill="#2c1810" />
          <path d="M80 58 Q90 64 100 58" fill="none" stroke="#2c1810" strokeWidth="2.5" />
          {pose === 'turn' ? (
            <path d="M64 38 Q90 8 116 38 Q90 28 64 38" fill="#2c1810" />
          ) : (
            <path d="M62 38 Q90 10 118 38" fill="#2c1810" />
          )}
          {pose === 'head' && (
            <>
              <path d="M58 86 Q48 40 78 28" fill="none" stroke="#f3d2b3" strokeWidth="10" strokeLinecap="round" />
              <path d="M122 86 Q132 40 102 28" fill="none" stroke="#f3d2b3" strokeWidth="10" strokeLinecap="round" />
            </>
          )}
          {pose === 'clap' && (
            <path d="M62 96 Q90 78 118 96" fill="none" stroke="#f3d2b3" strokeWidth="10" strokeLinecap="round" />
          )}
          {pose === 'foot' && (
            <>
              <path d="M78 130 L70 154" stroke="#c47a4a" strokeWidth="8" strokeLinecap="round" />
              <path d="M102 128 L126 112" stroke="#c47a4a" strokeWidth="8" strokeLinecap="round" />
              <path d="M54 96 L42 118" fill="none" stroke="#f3d2b3" strokeWidth="10" strokeLinecap="round" />
              <path d="M126 96 L138 118" fill="none" stroke="#f3d2b3" strokeWidth="10" strokeLinecap="round" />
            </>
          )}
          {pose === 'nose' && (
            <path d="M118 88 Q132 58 98 52" fill="none" stroke="#f3d2b3" strokeWidth="10" strokeLinecap="round" />
          )}
          {(pose === 'blue' || pose === 'door') && (
            <>
              <path d="M54 96 L40 118" fill="none" stroke="#f3d2b3" strokeWidth="10" strokeLinecap="round" />
              <path d="M126 90 L156 72" fill="none" stroke="#f3d2b3" strokeWidth="10" strokeLinecap="round" />
              {pose === 'blue' ? (
                <circle cx="166" cy="62" r="12" fill="#5B8DEF" stroke="#2c1810" strokeWidth="3" />
              ) : (
                <rect x="156" y="44" width="18" height="32" rx="3" fill="#c47a4a" stroke="#2c1810" strokeWidth="3" />
              )}
            </>
          )}
          {(pose === 'idle' || pose === 'turn') && (
            <>
              <path d="M58 92 L46 118" fill="none" stroke="#f3d2b3" strokeWidth="10" strokeLinecap="round" />
              <path d="M122 92 L134 118" fill="none" stroke="#f3d2b3" strokeWidth="10" strokeLinecap="round" />
            </>
          )}
          {pose !== 'foot' && (
            <>
              <path d="M78 130 L72 154" stroke="#c47a4a" strokeWidth="8" strokeLinecap="round" />
              <path d="M102 130 L108 154" stroke="#c47a4a" strokeWidth="8" strokeLinecap="round" />
            </>
          )}
        </>
      )}
    </svg>
  )
}

export function SimonGame({ config, locked, reveal, onSolved, onWrong, onSpeak }: Props) {
  const rounds = config.rounds ?? []
  const chain = config.chain ?? []
  const [round, setRound] = useState(0)
  const [chainStep, setChainStep] = useState(0)
  const [pose, setPose] = useState<SimonAction | 'idle'>('idle')
  const [still, setStill] = useState(false)
  const [shake, setShake] = useState(false)
  const [flash, setFlash] = useState<'do' | 'stay' | null>(null)
  const [wait, setWait] = useState(false)

  const current = rounds[round]

  useEffect(() => {
    if (config.mode !== 'listen' || !current || locked) return
    onSpeak?.(current.phrase, 'en-US')
    setPose('idle')
    setStill(false)
    setFlash(null)
    setWait(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round, config.mode])

  const bumpWrong = () => {
    playSfx('wrong')
    setShake(true)
    window.setTimeout(() => setShake(false), 420)
    onWrong?.()
  }

  const goNextListen = (didMove: boolean) => {
    if (!current || locked || wait) return
    const shouldMove = current.simon
    if (didMove !== shouldMove) {
      bumpWrong()
      setFlash(shouldMove ? 'do' : 'stay')
      return
    }
    playSfx('tap')
    setWait(true)
    setStill(!didMove)
    setPose(didMove ? current.action : 'idle')
    setFlash(didMove ? 'do' : 'stay')
    window.setTimeout(() => {
      if (round + 1 >= rounds.length) onSolved()
      else setRound((n) => n + 1)
    }, 650)
  }

  useEffect(() => {
    if (!reveal || locked) return
    if (config.mode === 'listen') onSolved()
    else onSolved()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal])

  if (config.mode === 'chain') {
    return (
      <div className={`simon-board ${shake ? 'is-shake' : ''}`}>
        <p className="reorder__hint">跟住次序撳：鼻 → 拍手 → 門</p>
        <div className="simon-stage">
          <KidPose action={chain[Math.max(0, chainStep - 1)] ?? 'idle'} />
        </div>
        <div className="simon-chain">
          {chain.map((action, i) => (
            <button
              key={`${action}-${i}`}
              type="button"
              className={`simon-act ${i < chainStep ? 'is-done' : ''} ${i === chainStep ? 'is-ready' : ''}`}
              disabled={locked}
              onClick={() => {
                if (action === chain[chainStep]) {
                  playSfx('tap')
                  setPose(action)
                  const next = chainStep + 1
                  setChainStep(next)
                  if (next >= chain.length) onSolved()
                } else bumpWrong()
              }}
            >
              <KidPose action={action} />
              <span>{ACTION_LABEL[action]}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`simon-board ${shake ? 'is-shake' : ''}`}>
      <p className="reorder__hint">
        {current ? `${round + 1} / ${rounds.length}` : ''} · 聽到 Simon says 先做
      </p>
      <div className="simon-stage">
        <KidPose action={pose} still={still} />
        {current && <p className="simon-phrase">{current.phrase}</p>}
      </div>
      <div className="simon-choices">
        <button
          type="button"
          className={`simon-choice simon-choice--do ${flash === 'do' ? 'is-ok' : ''}`}
          disabled={locked || wait}
          onClick={() => goNextListen(true)}
        >
          做
        </button>
        <button
          type="button"
          className={`simon-choice simon-choice--stay ${flash === 'stay' ? 'is-ok' : ''}`}
          disabled={locked || wait}
          onClick={() => goNextListen(false)}
        >
          企定
        </button>
      </div>
    </div>
  )
}
