/** Capture mic audio as 16-bit PCM for Google Cloud Speech-to-Text. */

export type PcmCaptureSession = {
  stop: () => Promise<{ pcm: Int16Array; sampleRate: number }>
}

/** One spoken stretch plus how long the speaker paused before it. */
export type PcmUtterance = {
  pcm: Int16Array
  /** Silence before this utterance (seconds). 0 for the first. */
  pauseBeforeSec: number
}

/** Linear-interpolation downsample — cleaner than block averaging for speech. */
function downsample(input: Float32Array, inRate: number, outRate: number): Float32Array {
  if (inRate === outRate) return input
  const ratio = inRate / outRate
  const outLen = Math.max(1, Math.floor(input.length / ratio))
  const out = new Float32Array(outLen)
  for (let i = 0; i < outLen; i++) {
    const src = i * ratio
    const i0 = Math.floor(src)
    const i1 = Math.min(input.length - 1, i0 + 1)
    const t = src - i0
    out[i] = input[i0] * (1 - t) + input[i1] * t
  }
  return out
}

function floatTo16BitPcm(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return out
}

/**
 * Split 16-bit mono PCM on silence so pauses can become punctuation.
 * Short pause → comma; longer pause → full stop (applied by caller).
 */
export function splitPcmByPauses(
  pcm: Int16Array,
  sampleRate: number,
  opts?: {
    /** Window size for energy (ms). */
    frameMs?: number
    /** Min silence to split (ms). */
    minPauseMs?: number
    /** Min speech island to keep (ms). */
    minSpeechMs?: number
    /** Max utterances (avoids too many API calls). */
    maxUtterances?: number
  },
): PcmUtterance[] {
  if (pcm.length < sampleRate * 0.2) {
    return [{ pcm, pauseBeforeSec: 0 }]
  }

  const frameMs = opts?.frameMs ?? 20
  const minPauseMs = opts?.minPauseMs ?? 320
  const minSpeechMs = opts?.minSpeechMs ?? 180
  const maxUtterances = opts?.maxUtterances ?? 8

  const frame = Math.max(1, Math.round((sampleRate * frameMs) / 1000))
  const energies: number[] = []
  for (let i = 0; i < pcm.length; i += frame) {
    const end = Math.min(pcm.length, i + frame)
    let sum = 0
    for (let j = i; j < end; j++) {
      const v = pcm[j] / 32768
      sum += v * v
    }
    energies.push(Math.sqrt(sum / Math.max(1, end - i)))
  }

  // Adaptive threshold from louder frames (ignore near-silence).
  const sorted = [...energies].sort((a, b) => a - b)
  const p20 = sorted[Math.floor(sorted.length * 0.2)] ?? 0
  const p80 = sorted[Math.floor(sorted.length * 0.8)] ?? 0
  const peak = sorted[sorted.length - 1] ?? 0
  const floor = Math.max(0.008, p20 * 1.4, peak * 0.04)
  const thresh = Math.min(Math.max(floor, (p20 + p80) * 0.22), peak * 0.25 || floor)

  const speech = energies.map((e) => e >= thresh)

  // Smooth brief blips (≤1 frame).
  for (let i = 1; i < speech.length - 1; i++) {
    if (speech[i] && !speech[i - 1] && !speech[i + 1]) speech[i] = false
    if (!speech[i] && speech[i - 1] && speech[i + 1]) speech[i] = true
  }

  type Island = { startFrame: number; endFrame: number }
  const islands: Island[] = []
  let i = 0
  while (i < speech.length) {
    while (i < speech.length && !speech[i]) i++
    if (i >= speech.length) break
    const start = i
    while (i < speech.length && speech[i]) i++
    islands.push({ startFrame: start, endFrame: i })
  }

  const minSpeechFrames = Math.max(1, Math.round(minSpeechMs / frameMs))
  const minPauseFrames = Math.max(1, Math.round(minPauseMs / frameMs))
  const kept = islands.filter((isl) => isl.endFrame - isl.startFrame >= minSpeechFrames)

  if (kept.length <= 1) {
    return [{ pcm, pauseBeforeSec: 0 }]
  }

  // Merge islands separated by a short pause (not long enough for punctuation).
  const merged: Island[] = [{ ...kept[0] }]
  for (let k = 1; k < kept.length; k++) {
    const prev = merged[merged.length - 1]
    const gap = kept[k].startFrame - prev.endFrame
    if (gap < minPauseFrames) {
      prev.endFrame = kept[k].endFrame
    } else {
      merged.push({ ...kept[k] })
    }
  }

  if (merged.length <= 1) {
    return [{ pcm, pauseBeforeSec: 0 }]
  }

  // Cap utterance count by merging shortest gaps first if needed.
  while (merged.length > maxUtterances) {
    let best = 1
    let bestGap = Infinity
    for (let k = 1; k < merged.length; k++) {
      const gap = merged[k].startFrame - merged[k - 1].endFrame
      if (gap < bestGap) {
        bestGap = gap
        best = k
      }
    }
    merged[best - 1].endFrame = merged[best].endFrame
    merged.splice(best, 1)
  }

  const pad = Math.round(sampleRate * 0.04) // 40ms pad
  const out: PcmUtterance[] = []
  for (let k = 0; k < merged.length; k++) {
    const start = Math.max(0, merged[k].startFrame * frame - pad)
    const end = Math.min(pcm.length, merged[k].endFrame * frame + pad)
    const slice = pcm.subarray(start, end)
    const pauseBeforeSec =
      k === 0 ? 0 : ((merged[k].startFrame - merged[k - 1].endFrame) * frameMs) / 1000
    out.push({ pcm: new Int16Array(slice), pauseBeforeSec })
  }
  return out.length ? out : [{ pcm, pauseBeforeSec: 0 }]
}

/**
 * Must be called from a user gesture on iOS so getUserMedia + AudioContext unlock.
 */
export async function startPcmCapture(): Promise<PcmCaptureSession> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('呢部電話唔支援錄音。')
  }

  // Prefer clean voice for STT: light AGC, avoid heavy noise gates that smear
  // Cantonese tones. Echo cancel still helps on speakerphone.
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: false,
      autoGainControl: true,
      channelCount: 1,
    },
    video: false,
  })

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AudioCtx()
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }

  const source = ctx.createMediaStreamSource(stream)
  const processor = ctx.createScriptProcessor(4096, 1, 1)
  const chunks: Float32Array[] = []
  let total = 0

  processor.onaudioprocess = (ev) => {
    const input = ev.inputBuffer.getChannelData(0)
    const copy = new Float32Array(input.length)
    copy.set(input)
    chunks.push(copy)
    total += copy.length
  }

  // ScriptProcessor needs a destination to run.
  const mute = ctx.createGain()
  mute.gain.value = 0
  source.connect(processor)
  processor.connect(mute)
  mute.connect(ctx.destination)

  return {
    stop: async () => {
      processor.onaudioprocess = null
      try {
        processor.disconnect()
      } catch {
        /* ignore */
      }
      try {
        source.disconnect()
      } catch {
        /* ignore */
      }
      stream.getTracks().forEach((t) => t.stop())
      const inRate = ctx.sampleRate
      await ctx.close().catch(() => undefined)

      const merged = new Float32Array(total)
      let offset = 0
      for (const c of chunks) {
        merged.set(c, offset)
        offset += c.length
      }
      const targetRate = 16000
      const down = downsample(merged, inRate, targetRate)
      return { pcm: floatTo16BitPcm(down), sampleRate: targetRate }
    },
  }
}

export function pcmToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}
