import type { KidPicId } from '../data/content'

type Props = {
  id: KidPicId
  shadow?: boolean
  size?: number
  className?: string
}

/** Same ehon watercolour plates as the Simon / memory / party games. */
const ART: Record<KidPicId, string> = {
  stand: 'school-week/games/simon-idle.jpg',
  turn: 'school-week/games/simon-turn.jpg',
  sit: 'school-week/games/simon-sit.jpg',
  foot: 'school-week/games/simon-foot.jpg',
  banana: 'school-week/games/mem-banana.jpg',
  hat: 'school-week/games/mem-hat.jpg',
  umbrella: 'school-week/games/mem-umbrella.jpg',
  bamboo: 'school-week/games/mem-bamboo.jpg',
  carrot: 'school-week/games/mem-carrot.jpg',
  rabbit: 'school-week/games/mem-rabbit.jpg',
  panda: 'school-week/games/mem-panda.jpg',
  cake: 'school-week/games/party-cake.jpg',
  gift: 'school-week/games/party-gift.jpg',
  door: 'school-week/games/simon-door.jpg',
  apple: 'school-week/dbs/apple.jpg',
  cat: 'school-week/dbs/cat.jpg',
  teddy: 'school-week/dbs/teddy.jpg',
  'long-pencil': 'school-week/dbs/long-pencil.jpg',
  'short-crayon': 'school-week/dbs/short-crayon.jpg',
  'park-full': 'hints/hint-run-park.jpg',
  'park-empty': 'school-week/dbs/park-empty.jpg',
  star: 'school-week/dbs/star.png',
}

const SHADOW: Partial<Record<KidPicId, string>> = {
  apple: 'school-week/dbs/shadow-apple.jpg',
  teddy: 'school-week/dbs/shadow-teddy.jpg',
  banana: 'school-week/dbs/shadow-banana.jpg',
  umbrella: 'school-week/dbs/shadow-umbrella.jpg',
}

const WIDE: ReadonlySet<KidPicId> = new Set(['park-full', 'park-empty'])

function kidPicSrc(id: KidPicId, shadow = false) {
  const base = import.meta.env.BASE_URL || '/'
  const file = (shadow && SHADOW[id]) || ART[id]
  return `${base}${file}`
}

export function KidPic({ id, shadow = false, size = 180, className = '' }: Props) {
  const wide = WIDE.has(id)
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
