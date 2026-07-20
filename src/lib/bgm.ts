/**
 * Soft procedural BGM for kids — adapts by place (home/day/vocab/mock),
 * day number, star progress, and session mood (practice/listen/cheer/think/celebrate).
 * Uses Web Audio (no MP3 assets). Respects the shared SFX mute flag.
 */

import { getSfxMuted } from '../hooks/useSfx'

export type BgmPlace = 'home' | 'day' | 'vocab' | 'mock' | 'parent'
export type BgmMood = 'practice' | 'listen' | 'cheer' | 'think' | 'celebrate' | 'wave'

export type BgmScene = {
  place: BgmPlace
  /** 1–6 for day sessions; 0 otherwise */
  day: number
  stars: number
  mood: BgmMood
}

type Theme = {
  scale: number[]
  bpm: number
  padGain: number
  melodyGain: number
  sparkle: boolean
}

const A4 = 440

function midiToHz(midi: number): number {
  return A4 * Math.pow(2, (midi - 69) / 12)
}

/** Gentle kid-friendly themes per place / day */
function themeFor(scene: BgmScene): Theme {
  // Pentatonic / major-ish MIDI note sets (relative patterns)
  const byDay: Record<number, number[]> = {
    1: [60, 62, 64, 67, 69, 72], // C warm welcome
    2: [62, 64, 66, 69, 71, 74], // D brighter pictures
    3: [64, 66, 68, 71, 73, 76], // E playful reorder
    4: [57, 60, 62, 64, 67, 69], // A soft emotions
    5: [65, 67, 69, 72, 74, 77], // F family warm
    6: [60, 64, 67, 69, 72, 76], // C review fuller
  }

  let scale = byDay[scene.day] || [60, 62, 64, 67, 69, 72]
  let bpm = 72
  let padGain = 0.028
  let melodyGain = 0.035
  let sparkle = false

  if (scene.place === 'home') {
    scale = [60, 62, 64, 67, 69, 72]
    bpm = 64
    padGain = 0.032
    melodyGain = 0.028
  } else if (scene.place === 'vocab') {
    scale = [67, 69, 71, 74, 76, 79]
    bpm = 88
    padGain = 0.018
    melodyGain = 0.04
  } else if (scene.place === 'mock') {
    scale = [55, 59, 62, 64, 67, 71]
    bpm = 70
    padGain = 0.03
    melodyGain = 0.038
    sparkle = true
  } else if (scene.place === 'parent') {
    scale = [57, 60, 64, 67]
    bpm = 54
    padGain = 0.02
    melodyGain = 0.012
  }

  // Progress: more energy / layers with stars
  if (scene.stars >= 8) {
    bpm += 4
    melodyGain += 0.006
  }
  if (scene.stars >= 20) {
    bpm += 4
    padGain += 0.006
    sparkle = true
  }
  if (scene.stars >= 40) {
    bpm += 2
    melodyGain += 0.008
  }

  // Mood modifiers
  switch (scene.mood) {
    case 'listen':
      padGain *= 0.35
      melodyGain *= 0.25
      bpm = Math.max(50, bpm - 8)
      break
    case 'cheer':
      bpm += 10
      melodyGain *= 1.35
      sparkle = true
      break
    case 'think':
      bpm = Math.max(48, bpm - 12)
      melodyGain *= 0.55
      padGain *= 0.75
      scale = scale.map((n) => n - 2)
      break
    case 'celebrate':
      bpm += 16
      padGain *= 1.2
      melodyGain *= 1.5
      sparkle = true
      break
    case 'wave':
      bpm = Math.max(60, bpm - 4)
      break
    default:
      break
  }

  return { scale, bpm, padGain, melodyGain, sparkle }
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let running = false
let stepTimer: number | null = null
let step = 0
let scene: BgmScene = { place: 'home', day: 0, stars: 0, mood: 'wave' }
let duckUntil = 0
let listeners: Array<() => void> = []

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.0001
    master.connect(ctx.destination)
  }
  return ctx
}

function notify() {
  for (let i = 0; i < listeners.length; i++) {
    try {
      listeners[i]()
    } catch {
      /* ignore */
    }
  }
}

function targetMasterGain(): number {
  if (getSfxMuted()) return 0.0001
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  if (now < duckUntil) return 0.008
  const t = themeFor(scene)
  // Keep under SFX / TTS — soft bed only
  return Math.min(0.085, 0.035 + t.padGain * 1.2 + t.melodyGain * 0.4)
}

function rampMaster(to: number, sec = 0.45) {
  const c = getCtx()
  if (!c || !master) return
  const g = master.gain
  const now = c.currentTime
  try {
    g.cancelScheduledValues(now)
    g.setValueAtTime(Math.max(0.0001, g.value), now)
    g.exponentialRampToValueAtTime(Math.max(0.0001, to), now + sec)
  } catch {
    g.value = to
  }
}

function playNote(
  freq: number,
  when: number,
  dur: number,
  type: OscillatorType,
  gain: number,
) {
  const c = getCtx()
  if (!c || !master || gain < 0.001) return
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(gain, when + 0.03)
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
  o.connect(g)
  g.connect(master)
  o.start(when)
  o.stop(when + dur + 0.03)
}

function tick() {
  if (!running) return
  if (getSfxMuted()) {
    rampMaster(0.0001, 0.2)
    return
  }

  const c = getCtx()
  if (!c || !master) return
  if (c.state === 'suspended') return

  rampMaster(targetMasterGain(), 0.35)

  const theme = themeFor(scene)
  const beat = 60 / theme.bpm
  const t0 = c.currentTime + 0.02
  const scale = theme.scale
  const i = step % scale.length
  const bass = scale[0] - 12
  const mid = scale[i % scale.length]
  const high = scale[(i + 2) % scale.length] + 12

  // Soft pad chord every 4 steps
  if (step % 4 === 0) {
    playNote(midiToHz(bass), t0, beat * 3.2, 'sine', theme.padGain)
    playNote(midiToHz(scale[2] || mid), t0 + 0.01, beat * 3, 'triangle', theme.padGain * 0.7)
  }

  // Melody arpeggio
  playNote(midiToHz(mid), t0, beat * 0.85, 'triangle', theme.melodyGain)
  if (step % 2 === 1) {
    playNote(midiToHz(high), t0 + beat * 0.45, beat * 0.5, 'sine', theme.melodyGain * 0.55)
  }

  // Progress / celebrate sparkles
  if (theme.sparkle && step % 3 === 0) {
    playNote(midiToHz(high + 7), t0 + beat * 0.2, beat * 0.25, 'sine', theme.melodyGain * 0.35)
  }

  // Cheer / celebrate flourish
  if (scene.mood === 'cheer' || scene.mood === 'celebrate') {
    playNote(midiToHz(mid + 12), t0 + beat * 0.15, beat * 0.4, 'triangle', theme.melodyGain * 0.45)
  }

  step += 1
  const delay = beat * 1000
  stepTimer = window.setTimeout(tick, delay)
}

export function subscribeBgm(fn: () => void): () => void {
  listeners.push(fn)
  return () => {
    listeners = listeners.filter((l) => l !== fn)
  }
}

export function getBgmScene(): BgmScene {
  return scene
}

export function isBgmRunning(): boolean {
  return running
}

/** Call from user gestures (nav / sound toggle) so iOS unlocks audio. */
export function ensureBgm(): void {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  if (!running && !getSfxMuted()) startBgm()
  else rampMaster(targetMasterGain(), 0.3)
}

export function startBgm(): void {
  if (getSfxMuted()) {
    running = false
    rampMaster(0.0001, 0.2)
    return
  }
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') void c.resume()
  if (running) {
    rampMaster(targetMasterGain(), 0.4)
    return
  }
  running = true
  step = 0
  rampMaster(targetMasterGain(), 0.8)
  if (stepTimer) window.clearTimeout(stepTimer)
  tick()
  notify()
}

export function stopBgm(): void {
  running = false
  if (stepTimer) {
    window.clearTimeout(stepTimer)
    stepTimer = null
  }
  rampMaster(0.0001, 0.4)
  notify()
}

export function setBgmScene(next: Partial<BgmScene>): void {
  scene = { ...scene, ...next }
  if (running) rampMaster(targetMasterGain(), 0.5)
  else if (!getSfxMuted()) {
    // Idle until first gesture; still remember scene.
  }
  notify()
}

export function setBgmMood(mood: BgmMood): void {
  setBgmScene({ mood })
}

/** Briefly duck under TTS / mic so speech stays clear. */
export function duckBgm(ms = 2200): void {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now()
  duckUntil = Math.max(duckUntil, now + ms)
  rampMaster(targetMasterGain(), 0.15)
  window.setTimeout(() => {
    if (!running) return
    rampMaster(targetMasterGain(), 0.5)
  }, ms + 50)
}

/** Keep BGM in sync when mute toggles. */
export function syncBgmMute(): void {
  if (getSfxMuted()) stopBgm()
  else {
    ensureBgm()
    startBgm()
  }
}
