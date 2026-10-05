import type { KidPicId } from '../data/content'
import { kidPicSrc, WIDE_KID_PICS } from '../lib/kidPicArt'

type Props = {
  id: KidPicId
  shadow?: boolean
  size?: number
  className?: string
}

export function KidPic({ id, shadow = false, size = 180, className = '' }: Props) {
  const wide = WIDE_KID_PICS.has(id)
  return (
    <img
      className={['kid-pic', wide ? 'kid-pic--wide' : '', shadow ? 'kid-pic--shadow' : '', className]
        .filter(Boolean)
        .join(' ')}
      src={kidPicSrc(id, shadow)}
      alt=""
      width={size}
      height={wide ? Math.round(size * 0.75) : size}
      draggable={false}
      aria-hidden
    />
  )
}

/** Up to five copies of one plate, laid out so a five-year-old can count them. */
export function KidCount({ id, n, plate = false }: { id: KidPicId; n: number; plate?: boolean }) {
  return (
    <span className={`kid-count kid-count--${n}${plate ? ' kid-count--plate' : ''}`} aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <img key={i} className="kid-count__item" src={kidPicSrc(id)} alt="" draggable={false} />
      ))}
    </span>
  )
}

/** One square of a 3×3 cut of a square plate. */
export function KidPiece({ id, col, row }: { id: KidPicId; col: number; row: number }) {
  return (
    <span
      className="kid-piece"
      style={{
        backgroundImage: `url(${kidPicSrc(id)})`,
        backgroundPosition: `${col * 50}% ${row * 50}%`,
      }}
      aria-hidden
    />
  )
}
