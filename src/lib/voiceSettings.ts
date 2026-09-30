export type VoiceProvider = 'google' | 'system'
export type YueGoogleVoice = 'yue-HK-Chirp3-HD-Kore' | 'yue-HK-Standard-A'
export type EnGoogleVoice =
  | 'en-US-Chirp3-HD-Kore'
  | 'en-US-Neural2-C'
  | 'en-US-Standard-C'
export type VoiceRate = 0.85 | 0.95 | 1.05

export type VoiceSettings = {
  provider: VoiceProvider
  yueVoice: YueGoogleVoice
  enVoice: EnGoogleVoice
  rate: VoiceRate
}

export const YUE_VOICE_OPTIONS: ReadonlyArray<{ value: YueGoogleVoice; label: string }> = [
  { value: 'yue-HK-Chirp3-HD-Kore', label: 'Chirp3 Kore（最自然）' },
  { value: 'yue-HK-Standard-A', label: 'Standard A（清楚穩定）' },
]

export const EN_VOICE_OPTIONS: ReadonlyArray<{ value: EnGoogleVoice; label: string }> = [
  { value: 'en-US-Chirp3-HD-Kore', label: 'Chirp3 Kore（最自然）' },
  { value: 'en-US-Neural2-C', label: 'Neural2 C（柔和）' },
  { value: 'en-US-Standard-C', label: 'Standard C（清楚穩定）' },
]

export const RATE_OPTIONS: ReadonlyArray<{ value: VoiceRate; label: string }> = [
  { value: 0.85, label: '慢速（跟讀）' },
  { value: 0.95, label: '自然（建議）' },
  { value: 1.05, label: '輕快' },
]

const STORAGE_KEY = 'zizi-voice-settings-v1'

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  provider: 'google',
  yueVoice: 'yue-HK-Chirp3-HD-Kore',
  enVoice: 'en-US-Chirp3-HD-Kore',
  rate: 0.95,
}

const YUE_VALUES = new Set(YUE_VOICE_OPTIONS.map((option) => option.value))
const EN_VALUES = new Set(EN_VOICE_OPTIONS.map((option) => option.value))
const RATE_VALUES = new Set(RATE_OPTIONS.map((option) => option.value))

export function getVoiceSettings(): VoiceSettings {
  if (typeof window === 'undefined') return DEFAULT_VOICE_SETTINGS
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Partial<VoiceSettings>
    return {
      provider: raw.provider === 'system' ? 'system' : 'google',
      yueVoice: YUE_VALUES.has(raw.yueVoice as YueGoogleVoice)
        ? (raw.yueVoice as YueGoogleVoice)
        : DEFAULT_VOICE_SETTINGS.yueVoice,
      enVoice: EN_VALUES.has(raw.enVoice as EnGoogleVoice)
        ? (raw.enVoice as EnGoogleVoice)
        : DEFAULT_VOICE_SETTINGS.enVoice,
      rate: RATE_VALUES.has(Number(raw.rate) as VoiceRate)
        ? (Number(raw.rate) as VoiceRate)
        : DEFAULT_VOICE_SETTINGS.rate,
    }
  } catch {
    return DEFAULT_VOICE_SETTINGS
  }
}

export function saveVoiceSettings(settings: VoiceSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    /* Private browsing can block persistent storage. */
  }
}
