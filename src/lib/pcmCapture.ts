/** Capture mic audio as 16-bit PCM for Google Cloud Speech-to-Text. */

export type PcmCaptureSession = {
  stop: () => Promise<{ pcm: Int16Array; sampleRate: number }>
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
