/** Lazy Whisper tiny for Safari when Web Speech cannot produce text. */

export type WhisperProgress = {
  status: string
  progress?: number
}

type Transcriber = (
  audio: Float32Array | string,
  options?: Record<string, unknown>,
) => Promise<{ text?: string } | string>

let transcriberPromise: Promise<Transcriber> | null = null

async function getTranscriber(onProgress?: (p: WhisperProgress) => void): Promise<Transcriber> {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const { pipeline, env } = await import('@xenova/transformers')
      // Use remote Hub models; cache in browser
      env.allowLocalModels = false
      env.useBrowserCache = true

      const pipe = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
        progress_callback: (data: WhisperProgress) => {
          onProgress?.(data)
        },
      })
      return pipe as unknown as Transcriber
    })().catch((err) => {
      transcriberPromise = null
      throw err
    })
  }
  return transcriberPromise
}

async function blobToFloat32(blob: Blob, targetRate = 16000): Promise<Float32Array> {
  const buffer = await blob.arrayBuffer()
  const ctx = new AudioContext()
  try {
    const decoded = await ctx.decodeAudioData(buffer.slice(0))
    const channel = decoded.getChannelData(0)
    if (decoded.sampleRate === targetRate) {
      return new Float32Array(channel)
    }
    // Simple downsample / upsample
    const ratio = decoded.sampleRate / targetRate
    const newLen = Math.max(1, Math.round(channel.length / ratio))
    const out = new Float32Array(newLen)
    for (let i = 0; i < newLen; i++) {
      out[i] = channel[Math.min(channel.length - 1, Math.floor(i * ratio))] ?? 0
    }
    return out
  } finally {
    await ctx.close().catch(() => undefined)
  }
}

/**
 * Transcribe a recorded audio blob (Safari MediaRecorder mp4/webm) to text.
 * First call downloads ~40–80MB model (cached afterwards).
 */
export async function transcribeWithWhisper(
  blob: Blob,
  lang: 'zh' | 'en',
  onProgress?: (message: string) => void,
): Promise<string> {
  if (blob.size < 800) return ''

  onProgress?.('準備轉字模型…')
  const transcriber = await getTranscriber((p) => {
    if (typeof p.progress === 'number' && p.progress > 0 && p.progress < 1) {
      onProgress?.(`下載轉字模型 ${Math.round(p.progress * 100)}%…`)
    } else if (p.status) {
      onProgress?.(`模型：${p.status}`)
    }
  })

  onProgress?.('解碼錄音…')
  const audio = await blobToFloat32(blob)

  onProgress?.('轉文字中…')
  const result = await transcriber(audio, {
    language: lang === 'en' ? 'english' : 'chinese',
    task: 'transcribe',
    // Short kid answers — avoid huge chunking overhead
    chunk_length_s: 20,
  })

  if (typeof result === 'string') return result.trim()
  return (result?.text ?? '').trim()
}
