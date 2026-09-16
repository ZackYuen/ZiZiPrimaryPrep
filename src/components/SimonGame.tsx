import { useEffect, useState } from 'react'
import { playSfx } from '../hooks/useSfx'
import type { SimonAction, SimonGame as SimonConfig } from '../data/content'
import { gameArt, SIMON_ART } from '../lib/gameArt'

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
  const file = SIMON_ART[pose] || SIMON_ART.idle
  return <img className="simon-kid" src={gameArt(file)} alt="" draggable={false} />
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
    onSolved()
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
