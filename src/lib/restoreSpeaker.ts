/** iOS leftover PlayAndRecord / voice-call routing after getUserMedia or Web Speech. */

let micSessionOpen = false

function isAppleWebKit(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  if (/Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR|CriOS|FxiOS/i.test(ua)) return true
  return typeof navigator.vendor === 'string' && navigator.vendor.includes('Apple')
}

export function markMicSession(): void {
  micSessionOpen = true
}

export function micSessionWasUsed(): boolean {
  return micSessionOpen
}

export function clearMicSessionFlag(): void {
  micSessionOpen = false
}

/** Tiny silent WAV so HTMLAudio can kick iOS back to the loudspeaker. */
export function silentWavBytes(durationMs = 80): Uint8Array {
  const sampleRate = 8000
  const samples = Math.max(1, Math.round((sampleRate * durationMs) / 1000))
  const dataSize = samples * 2
  const buf = new ArrayBuffer(44 + dataSize)
  const v = new DataView(buf)
  const ascii = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(offset + i, s.charCodeAt(i))
  }
  ascii(0, 'RIFF')
  v.setUint32(4, 36 + dataSize, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true)
  v.setUint32(28, sampleRate * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  ascii(36, 'data')
  v.setUint32(40, dataSize, true)
  return new Uint8Array(buf)
}

function playHtmlSilence(): Promise<void> {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return Promise.resolve()
  const bytes = silentWavBytes(60)
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  const url = URL.createObjectURL(new Blob([copy], { type: 'audio/wav' }))
  const audio = new Audio(url)
  audio.setAttribute('playsinline', 'true')
  audio.muted = false
  audio.volume = 0.01
  return new Promise((resolve) => {
    const done = () => {
      URL.revokeObjectURL(url)
      resolve()
    }
    audio.onended = done
    audio.onerror = done
    void audio.play().then(() => {
      window.setTimeout(done, 90)
    }).catch(done)
  })
}

/**
 * After dictation/recording: stop leaving iOS in the earpiece (聽筒) route
 * so TTS / 聽題 play on the loudspeaker (揚聲器) again.
 */
export async function restoreSpeakerPlayback(): Promise<void> {
  if (typeof window === 'undefined') return
  if (!micSessionOpen) return
  micSessionOpen = false
  if (isAppleWebKit()) await playHtmlSilence()
}

export function restoreSpeakerPlaybackSoon(): void {
  void restoreSpeakerPlayback()
}
