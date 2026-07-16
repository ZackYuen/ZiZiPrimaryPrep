/** Lazy Whisper for Safari when Web Speech cannot produce text. */

export type WhisperProgress = {
  status: string
  progress?: number
}

type Transcriber = (
  audio: Float32Array | string,
  options?: Record<string, unknown>,
) => Promise<{ text?: string } | string>

/** Heavy Yue model — desktop only. On iPhone it OOMs (hang → tab reload /「返主頁」). */
const CANTONESE_HEAVY = 'onnx-community/whisper-small-cantonese-ONNX'
/** Light model safe on iPhone Safari */
const LIGHT_MODEL = 'Xenova/whisper-tiny'

const YUE_PROMPT =
  '以下係廣東話（粵語）口述，請用繁體中文寫低：我叫袁碩孜，五歲，讀藍田靈糧幼稚園。我鍾意食蘋果。'

const MAX_AUDIO_SEC = 10
const INFER_TIMEOUT_MS = 55_000

const cache = new Map<string, Promise<Transcriber>>()

function isIosPhone(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: number | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(label)), ms)
      }),
    ])
  } finally {
    if (timer) window.clearTimeout(timer)
  }
}

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
      // Keep WASM lighter on phones
      try {
        env.backends.onnx.wasm.numThreads = 1
      } catch {
        /* ignore */
      }

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
    let samples: Float32Array
    if (decoded.sampleRate === targetRate) {
      samples = new Float32Array(channel)
    } else {
      const ratio = decoded.sampleRate / targetRate
      const newLen = Math.max(1, Math.round(channel.length / ratio))
      samples = new Float32Array(newLen)
      for (let i = 0; i < newLen; i++) {
        samples[i] = channel[Math.min(channel.length - 1, Math.floor(i * ratio))] ?? 0
      }
    }
    // Cap length — long clips freeze / OOM Safari during decode
    const maxSamples = targetRate * MAX_AUDIO_SEC
    if (samples.length > maxSamples) {
      return samples.slice(0, maxSamples)
    }
    return samples
  } finally {
    await ctx.close().catch(() => undefined)
  }
}

async function runModel(
  modelId: string,
  audio: Float32Array,
  cantonese: boolean,
  onProgress?: (message: string) => void,
): Promise<string> {
  const heavy = modelId === CANTONESE_HEAVY
  onProgress?.(heavy ? '載入廣東話模型…' : '載入輕量轉字模型…')

  const transcriber = await getTranscriber(modelId, (p) => {
    if (typeof p.progress === 'number' && p.progress > 0 && p.progress < 1) {
      onProgress?.(
        heavy
          ? `下載廣東話模型 ${Math.round(p.progress * 100)}%…`
          : `下載轉字模型 ${Math.round(p.progress * 100)}%…`,
      )
    } else if (p.status === 'ready' || p.status === 'done') {
      onProgress?.('模型就緒，開始轉字…')
    } else if (p.status) {
      onProgress?.(`模型：${p.status}`)
    }
  })

  // Let Safari paint status before blocking WASM work
  await sleep(40)
  onProgress?.(cantonese ? '廣東話轉文字中（請勿離開）…' : '轉文字中（請勿離開）…')

  // Heartbeat so UI does not look frozen
  let ticks = 0
  const beat = window.setInterval(() => {
    ticks += 1
    onProgress?.(
      cantonese
        ? `廣東話轉文字中… ${ticks * 2}s（請稍等）`
        : `轉文字中… ${ticks * 2}s（請稍等）`,
    )
  }, 2000)

  try {
    const result = await withTimeout(
      transcriber(audio, {
        language: cantonese ? 'chinese' : 'english',
        task: 'transcribe',
        chunk_length_s: MAX_AUDIO_SEC,
        // Limit decode length — kids answers are short; reduces hang risk
        max_new_tokens: 96,
        ...(cantonese ? { initial_prompt: YUE_PROMPT } : {}),
      }),
      INFER_TIMEOUT_MS,
      '轉字逾時',
    )
    if (typeof result === 'string') return result.trim()
    return (result?.text ?? '').trim()
  } finally {
    window.clearInterval(beat)
  }
}

/**
 * Transcribe a recorded audio blob.
 * iPhone: always light model (heavy Yue model crashes Safari after download).
 * Desktop: try Yue-finetuned small, fall back to tiny on failure/timeout.
 */
export async function transcribeWithWhisper(
  blob: Blob,
  lang: 'zh' | 'en',
  onProgress?: (message: string) => void,
): Promise<string> {
  if (blob.size < 800) return ''

  const cantonese = lang !== 'en'
  onProgress?.('解碼錄音…')
  await sleep(20)
  const audio = await blobToFloat32(blob)

  if (audio.length < 1600) return ''

  // English / iPhone: light path only
  if (!cantonese || isIosPhone()) {
    if (cantonese && isIosPhone()) {
      onProgress?.('iPhone 用輕量轉字（避免當機）…')
    }
    return runModel(LIGHT_MODEL, audio, cantonese, onProgress)
  }

  // Desktop Safari: prefer Yue model, fall back if it hangs/fails
  try {
    return await runModel(CANTONESE_HEAVY, audio, true, onProgress)
  } catch {
    onProgress?.('粵語大模型失敗，改用輕量模式…')
    // Drop heavy from cache so we don't keep a bad promise
    cache.delete(CANTONESE_HEAVY)
    return runModel(LIGHT_MODEL, audio, true, onProgress)
  }
}
