import { useState } from 'react'
import { playSfx } from '../hooks/useSfx'
import type { PlaceCell } from '../data/content'
import { KidPic } from './KidPic'

type Props = {
  target: PlaceCell
  locked?: boolean
  reveal?: boolean
  onSolved: () => void
  onWrong?: () => void
}

const CELLS: { id: PlaceCell; aria: string }[] = [
  { id: 'tl', aria: '上面左邊' },
  { id: 'tr', aria: '上面右邊' },
  { id: 'bl', aria: '下面左邊' },
  { id: 'br', aria: '下面右邊' },
]

export function PlaceGrid({ target, locked, reveal, onSolved, onWrong }: Props) {
  const [picked, setPicked] = useState<PlaceCell | null>(null)
  const [wrong, setWrong] = useState<PlaceCell[]>([])
  const [shake, setShake] = useState(false)
  const solved = picked === target || !!reveal

  const show = reveal ? target : picked

  return (
    <div className={`place-grid ${shake ? 'is-shake' : ''}`}>
      <p className="reorder__hint">聽完，撳一格</p>
      <div className="place-grid__box" role="group" aria-label="四格盒">
        {CELLS.map((cell) => {
          const here = show === cell.id
          const triedWrong = wrong.includes(cell.id)
          return (
            <button
              key={cell.id}
              type="button"
              className={[
                'place-grid__cell',
                here && solved ? 'is-correct' : '',
                here && !solved ? 'is-picked' : '',
                triedWrong ? 'is-wrong' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={locked || solved || triedWrong}
              aria-label={cell.aria}
              onClick={() => {
                if (locked || solved || triedWrong) return
                if (cell.id === target) {
                  setPicked(cell.id)
                  playSfx('correct')
                  onSolved()
                  return
                }
                playSfx('wrong')
                setWrong((prev) => (prev.includes(cell.id) ? prev : [...prev, cell.id]))
                setShake(true)
                window.setTimeout(() => setShake(false), 380)
                onWrong?.()
              }}
            >
              {here ? <KidPic id="token" size={88} /> : <span className="place-grid__dot" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
