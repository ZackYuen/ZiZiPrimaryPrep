import { useState } from 'react'
import type { CoinValue } from '../data/content'
import { playSfx } from '../hooks/useSfx'

type Props = {
  owner: string
  coins: CoinValue[]
}

const COIN_LABEL: Record<CoinValue, string> = {
  10: '$10',
  5: '$5',
  2: '$2',
  1: '$1',
  0.5: '50¢',
  0.2: '20¢',
  0.1: '10¢',
}

function coinClass(v: CoinValue): string {
  if (v >= 1) return v === 10 ? 'hk-coin--ten' : v === 2 ? 'hk-coin--two' : 'hk-coin--silver'
  return v === 0.2 ? 'hk-coin--twenty' : 'hk-coin--gold'
}

export function CoinPurse({ owner, coins }: Props) {
  const [tapped, setTapped] = useState<Record<number, boolean>>({})

  return (
    <div className="coin-purse">
      <div className="coin-purse__bag" aria-label={`${owner}的錢包`}>
        <div className="coin-purse__coins">
          {coins.map((v, i) => (
            <button
              key={`${v}-${i}`}
              type="button"
              className={`hk-coin ${coinClass(v)} ${tapped[i] ? 'is-tapped' : ''}`}
              onClick={() => {
                playSfx('tap')
                setTapped((prev) => ({ ...prev, [i]: !prev[i] }))
              }}
              aria-pressed={!!tapped[i]}
            >
              <span className="hk-coin__value">{COIN_LABEL[v]}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="coin-purse__owner">{owner}的錢包</p>
      <p className="coin-purse__hint">可以點硬幣做記號，方便數</p>
    </div>
  )
}
