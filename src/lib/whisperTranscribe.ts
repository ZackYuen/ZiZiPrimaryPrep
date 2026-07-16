/** Lazy Whisper for Safari when Web Speech cannot produce text. */

export type WhisperProgress = {
  status: string
  progress?: number
}

type Transcriber = (
  audio: Float32Array | string,
  options?: Record<string, unknown>,
) => Promise<{ text?: string } | string>

const CANTONESE_MODEL = 'onnx-community/whisper-small-cantonese-ONNX'
const ENGLISH_MODEL = 'Xenova/whisper-tiny'

/** Bias decoder toward spoken Cantonese / Traditional Chinese kid answers */
const YUE_PROMPT =
  '廣東話口述。我叫袁碩孜，五歲，讀藍田靈糧幼稚園。我鍾意食蘋果同踢足球。'

const cache = new Map<string, Promise<Transcriber>>()

async function getTranscriber(
  modelId: string,
  onProgress?: (p: WhisperProgress) => void,
): Promise<Transcriber> {
  let pending = cache.get(modelId)
  if (!pending) {
    pending = (async () => {
      const { pipeline, env } = await import('@xenova/transformers')
      env.allowLocalModels = false
      env.useBrowserCache = true

      const pipe = await pipeline('automatic-speech-recognition', modelId, {
        quantized: true,
        progress_callback: (data: WhisperProgress) => {
          onProgress?.(data)
        },
      })
      return pipe as unknown as Transcriber
    })().catch((err) => {
      cache.delete(modelId)
      throw err
    })
    cache.set(modelId, pending)
  }
  return pending
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
 * Transcribe a recorded audio blob.
 * Cantonese uses a Yue-finetuned Whisper (not generic Mandarin chinese).
 * First Cantonese download is larger (~200–400MB, Wi‑Fi strongly recommended).
 */
export async function transcribeWithWhisper(
  blob: Blob,
  lang: 'zh' | 'en',
  onProgress?: (message: string) => void,
): Promise<string> {
  if (blob.size < 800) return ''

  const cantonese = lang !== 'en'
  const modelId = cantonese ? CANTONESE_MODEL : ENGLISH_MODEL

  onProgress?.(cantonese ? '準備廣東話轉字模型…' : '準備英文轉字模型…')
  const transcriber = await getTranscriber(modelId, (p) => {
    if (typeof p.progress === 'number' && p.progress > 0 && p.progress < 1) {
      onProgress?.(
        cantonese
          ? `下載廣東話模型 ${Math.round(p.progress * 100)}%（較大，請用 Wi‑Fi）…`
          : `下載轉字模型 ${Math.round(p.progress * 100)}%…`,
      )
    } else if (p.status) {
      onProgress?.(`模型：${p.status}`)
    }
  })

  onProgress?.('解碼錄音…')
  const audio = await blobToFloat32(blob)

  onProgress?.(cantonese ? '廣東話轉文字中…' : '轉文字中…')
  const result = await transcriber(audio, {
    // Cantonese fine-tune still uses zh decoder ids (not yue) per model authors
    language: cantonese ? 'chinese' : 'english',
    task: 'transcribe',
    chunk_length_s: 20,
    ...(cantonese ? { initial_prompt: YUE_PROMPT } : {}),
  })

  if (typeof result === 'string') return result.trim()
  return (result?.text ?? '').trim()
}
