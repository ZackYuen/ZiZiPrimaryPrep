type SfxName = 'tap' | 'correct' | 'wrong' | 'star' | 'whoosh' | 'celebrate' | 'flip'

let ctx: AudioContext | null = null
let muted = false

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  return ctx
}

export function setSfxMuted(next: boolean) {
  muted = next
  try {
    localStorage.setItem('zizi-sfx-muted', next ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export function getSfxMuted(): boolean {
  try {
    return localStorage.getItem('zizi-sfx-muted') === '1'
  } catch {
    return false
  }
}

export function unlockAudio() {
  const c = getCtx()
  if (c?.state === 'suspended') void c.resume()
}

function tone(
  c: AudioContext,
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType = 'sine',
  gain = 0.08,
) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, start)
  g.gain.exponentialRampToValueAtTime(gain, start + 0.02)
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  o.connect(g)
  g.connect(c.destination)
  o.start(start)
  o.stop(start + dur + 0.02)
}

export function playSfx(name: SfxName) {
  if (muted || getSfxMuted()) return
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  const t = c.currentTime

  switch (name) {
    case 'tap':
      tone(c, 520, t, 0.06, 'triangle', 0.05)
      break
    case 'flip':
      tone(c, 380, t, 0.08, 'sine', 0.04)
      tone(c, 520, t + 0.05, 0.1, 'sine', 0.05)
      break
    case 'whoosh': {
      const o = c.createOscillator()
      const g = c.createGain()
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(420, t)
      o.frequency.exponentialRampToValueAtTime(140, t + 0.22)
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.04, t + 0.03)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
      o.connect(g)
      g.connect(c.destination)
      o.start(t)
      o.stop(t + 0.25)
      break
    }
    case 'correct':
      tone(c, 523.25, t, 0.12, 'sine', 0.07)
      tone(c, 659.25, t + 0.1, 0.14, 'sine', 0.07)
      tone(c, 783.99, t + 0.2, 0.18, 'triangle', 0.08)
      break
    case 'wrong':
      tone(c, 220, t, 0.16, 'triangle', 0.05)
      tone(c, 180, t + 0.1, 0.2, 'triangle', 0.04)
      break
    case 'star':
      tone(c, 880, t, 0.1, 'sine', 0.06)
      tone(c, 1320, t + 0.08, 0.16, 'sine', 0.07)
      tone(c, 1760, t + 0.16, 0.2, 'triangle', 0.05)
      break
    case 'celebrate':
      ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        tone(c, f, t + i * 0.09, 0.22, i % 2 ? 'triangle' : 'sine', 0.07)
      })
      break
  }
}

let ttsSource: AudioBufferSourceNode | null = null
let ttsAudio: HTMLAudioElement | null = null

export function stopTtsAudio() {
  if (ttsSource) {
    try {
      ttsSource.stop()
    } catch {
      /* already stopped */
    }
    ttsSource = null
  }
  if (ttsAudio) {
    try {
      ttsAudio.pause()
      ttsAudio.removeAttribute('src')
      ttsAudio.load()
    } catch {
      /* ignore */
    }
    ttsAudio = null
  }
}

/** Play Google TTS MP3. Uses the unlocked Web Audio context so iOS allows it after the tap. */
export async function playMp3Bytes(bytes: Uint8Array): Promise<void> {
  stopTtsAudio()
  const c = getCtx()
  if (c) {
    if (c.state === 'suspended') await c.resume()
    try {
      const copy = new ArrayBuffer(bytes.byteLength)
      new Uint8Array(copy).set(bytes)
      const buf = await c.decodeAudioData(copy)
      await new Promise<void>((resolve, reject) => {
        const src = c.createBufferSource()
        ttsSource = src
        src.buffer = buf
        src.connect(c.destination)
        src.onended = () => {
          if (ttsSource === src) ttsSource = null
          resolve()
        }
        try {
          src.start()
        } catch (err) {
          ttsSource = null
          reject(err)
        }
      })
      return
    } catch {
      /* fall through to HTMLAudioElement */
    }
  }
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  const url = URL.createObjectURL(new Blob([copy], { type: 'audio/mpeg' }))
  const audio = new Audio(url)
  ttsAudio = audio
  await new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(url)
      if (ttsAudio === audio) ttsAudio = null
      resolve()
    }
    audio.onerror = () => {
      URL.revokeObjectURL(url)
      if (ttsAudio === audio) ttsAudio = null
      reject(new Error('朗讀播放失敗'))
    }
    void audio.play().catch(reject)
  })
}

muted = getSfxMuted()
