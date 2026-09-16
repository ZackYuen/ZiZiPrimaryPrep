/** Japanese ehon watercolor sprites for school-week games. */

export function gameArt(file: string) {
  const base = import.meta.env.BASE_URL || '/'
  return `${base}school-week/games/${file.replace(/^\//, '')}`
}

export const SIMON_ART: Record<string, string> = {
  idle: 'simon-idle.jpg',
  head: 'simon-head.jpg',
  clap: 'simon-clap.jpg',
  foot: 'simon-foot.jpg',
  turn: 'simon-turn.jpg',
  blue: 'simon-blue.jpg',
  sit: 'simon-sit.jpg',
  nose: 'simon-nose.jpg',
  door: 'simon-door.jpg',
}

export const MEMORY_ART: Record<string, string> = {
  penguin: 'mem-penguin.jpg',
  elephant: 'mem-elephant.jpg',
  rabbit: 'mem-rabbit.jpg',
  lion: 'mem-lion.jpg',
  panda: 'mem-panda.jpg',
  monkey: 'mem-monkey.jpg',
  ball: 'mem-ball.jpg',
  umbrella: 'mem-umbrella.jpg',
  carrot: 'mem-carrot.jpg',
  hat: 'mem-hat.jpg',
  bamboo: 'mem-bamboo.jpg',
  banana: 'mem-banana.jpg',
}

export const BUILD_ART: Record<string, string> = {
  star: 'party-star.jpg',
  friend1: 'party-friend1.jpg',
  friend2: 'party-friend2.jpg',
  cake: 'party-cake.jpg',
  gift: 'party-gift.jpg',
  fun: 'party-fun.jpg',
  deck: 'bridge-deck.jpg',
  railL: 'bridge-rail.jpg',
  railR: 'bridge-rail.jpg',
  postL: 'bridge-post.jpg',
  postR: 'bridge-post.jpg',
}
