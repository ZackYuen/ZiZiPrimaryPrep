import type { KidPicId } from '../data/content'

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
  penguin: 'school-week/games/mem-penguin.jpg',
  cake: 'school-week/games/party-cake.jpg',
  gift: 'school-week/games/party-gift.jpg',
  door: 'school-week/games/simon-door.jpg',
  'party-room': 'school-week/games/mem-ball.jpg',
  apple: 'school-week/dbs/apple.jpg',
  orange: 'school-week/dbs/orange.jpg',
  book: 'school-week/dbs/book.jpg',
  spoon: 'school-week/dbs/spoon.jpg',
  cat: 'school-week/dbs/cat.jpg',
  teddy: 'school-week/dbs/teddy.jpg',
  'long-pencil': 'school-week/dbs/long-pencil.jpg',
  'short-crayon': 'school-week/dbs/short-crayon.jpg',
  'park-full': 'hints/hint-run-park.jpg',
  'park-empty': 'school-week/dbs/park-empty.jpg',
  zoo: 'hints/hint-zoo.jpg',
  library: 'school-week/library.jpg',
  rain: 'school-week/umbrella.jpg',
  eat: 'hints/hint-eat.jpg',
  sleep: 'hints/hint-sleep.jpg',
  'mall-staff': 'school-week/dbs/sit-mall-staff.jpg',
  'mall-alone': 'school-week/dbs/sit-mall-alone.jpg',
  'mall-stranger': 'school-week/dbs/sit-mall-stranger.jpg',
  'fall-help': 'school-week/dbs/sit-fall-help.jpg',
  'fall-laugh': 'school-week/dbs/sit-fall-laugh.jpg',
  'fall-ignore': 'school-week/dbs/sit-fall-ignore.jpg',
  star: 'school-week/dbs/star.png',
}

const SHADOW: Partial<Record<KidPicId, string>> = {
  apple: 'school-week/dbs/shadow-apple.jpg',
  teddy: 'school-week/dbs/shadow-teddy.jpg',
  banana: 'school-week/dbs/shadow-banana.jpg',
  umbrella: 'school-week/dbs/shadow-umbrella.jpg',
}

/** 4:3 scene plates; everything else is a square still life. */
export const WIDE_KID_PICS: ReadonlySet<KidPicId> = new Set<KidPicId>([
  'park-full',
  'park-empty',
  'zoo',
  'library',
  'rain',
  'eat',
  'sleep',
  'mall-staff',
  'mall-alone',
  'mall-stranger',
  'fall-help',
  'fall-laugh',
  'fall-ignore',
])

export function kidPicSrc(id: KidPicId, shadow = false) {
  const base = import.meta.env.BASE_URL || '/'
  const file = (shadow && SHADOW[id]) || ART[id]
  return `${base}${file}`
}
