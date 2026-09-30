/** Shared mascot mood + kid-facing Cantonese lines (spoken HK, ~5yo). */

export type MascotMood = 'happy' | 'cheer' | 'think' | 'wave'

/** Why the mascot looks this way — used for auto speech, not interview coaching. */
export type MascotReason = 'start' | 'wait' | 'listen' | 'encourage' | 'cheer'

export const MASCOT_LINES = {
  tap: ['加油呀！', '你做得到㗎！', '好叻呀！', '我陪住你呀！', '繼續玩啦！'],
  cheer: ['得喇！好叻！', '完成啦！', '耶！得㗎啦！'],
  encourage: ['唔緊要，再試下！', '慢慢嚟～'],
  idle: ['我喺度陪你。', '慢慢睇～'],
} as const

export type MascotLineKind = keyof typeof MASCOT_LINES

let lastLine = ''

export function pickMascotLine(kind: MascotLineKind): string {
  const list: readonly string[] = MASCOT_LINES[kind]
  const start = Math.floor(Math.random() * list.length)
  const next = list[start] === lastLine ? list[(start + 1) % list.length] : list[start]
  lastLine = next
  return next
}

export function resolveMascotPresence(state: {
  cheering?: boolean
  encourage?: boolean
  listening?: boolean
  looking?: boolean
}): { mood: MascotMood; reason: MascotReason } {
  if (state.cheering) return { mood: 'cheer', reason: 'cheer' }
  if (state.encourage) return { mood: 'think', reason: 'encourage' }
  if (state.listening || state.looking) return { mood: 'think', reason: 'listen' }
  return { mood: 'wave', reason: 'wait' }
}
