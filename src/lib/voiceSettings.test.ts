import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import {
  DEFAULT_VOICE_SETTINGS,
  getVoiceSettings,
  LEGACY_DEFAULT_YUE_VOICE,
  resolveVoiceSettings,
  saveVoiceSettings,
  YUE_VOICE_OPTIONS,
} from './voiceSettings.ts'

const STORAGE_KEY = 'zizi-voice-settings-v1'

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    removeItem: (key: string) => {
      data.delete(key)
    },
    clear: () => {
      data.clear()
    },
    key: (index: number) => [...data.keys()][index] ?? null,
    get length() {
      return data.size
    },
  }
}

describe('Yue Google voice picker', () => {
  it('defaults to Chirp3 Leda and still lists Kore and Standard-A', () => {
    assert.equal(DEFAULT_VOICE_SETTINGS.yueVoice, 'yue-HK-Chirp3-HD-Leda')
    assert.equal(DEFAULT_VOICE_SETTINGS.enVoice, 'en-US-Chirp3-HD-Kore')
    assert.equal(DEFAULT_VOICE_SETTINGS.rate, 0.95)
    assert.deepEqual(
      YUE_VOICE_OPTIONS.map((option) => option.value),
      ['yue-HK-Chirp3-HD-Leda', 'yue-HK-Chirp3-HD-Kore', 'yue-HK-Standard-A'],
    )
  })
})

describe('resolveVoiceSettings Yue default migration', () => {
  it('uses Leda when nothing is saved', () => {
    const { settings, migratedLegacyYueDefault } = resolveVoiceSettings({})
    assert.equal(settings.yueVoice, 'yue-HK-Chirp3-HD-Leda')
    assert.equal(migratedLegacyYueDefault, false)
  })

  it('migrates a saved old default Kore to Leda once', () => {
    const { settings, migratedLegacyYueDefault } = resolveVoiceSettings({
      provider: 'google',
      yueVoice: LEGACY_DEFAULT_YUE_VOICE,
      enVoice: 'en-US-Neural2-C',
      rate: 0.85,
    })
    assert.equal(settings.yueVoice, 'yue-HK-Chirp3-HD-Leda')
    assert.equal(settings.enVoice, 'en-US-Neural2-C')
    assert.equal(settings.rate, 0.85)
    assert.equal(migratedLegacyYueDefault, true)
  })

  it('keeps a deliberately chosen Standard-A voice', () => {
    const { settings, migratedLegacyYueDefault } = resolveVoiceSettings({
      yueVoice: 'yue-HK-Standard-A',
    })
    assert.equal(settings.yueVoice, 'yue-HK-Standard-A')
    assert.equal(migratedLegacyYueDefault, false)
  })

  it('does not overwrite Kore after the one-time migration flag is set', () => {
    const { settings, migratedLegacyYueDefault } = resolveVoiceSettings({
      yueVoice: 'yue-HK-Chirp3-HD-Kore',
      yueDefaultMigratedToLeda: true,
    })
    assert.equal(settings.yueVoice, 'yue-HK-Chirp3-HD-Kore')
    assert.equal(migratedLegacyYueDefault, false)
  })
})

describe('getVoiceSettings persistence', () => {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')

  afterEach(() => {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  })

  it('writes Leda once for a stored Kore default, then keeps a later Kore choice', () => {
    const storage = memoryStorage()
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })

    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        provider: 'google',
        yueVoice: 'yue-HK-Chirp3-HD-Kore',
        enVoice: 'en-US-Chirp3-HD-Kore',
        rate: 0.95,
      }),
    )

    assert.equal(getVoiceSettings().yueVoice, 'yue-HK-Chirp3-HD-Leda')
    const migrated = JSON.parse(storage.getItem(STORAGE_KEY) || '{}') as {
      yueVoice?: string
      yueDefaultMigratedToLeda?: boolean
    }
    assert.equal(migrated.yueVoice, 'yue-HK-Chirp3-HD-Leda')
    assert.equal(migrated.yueDefaultMigratedToLeda, true)

    saveVoiceSettings({
      provider: 'google',
      yueVoice: 'yue-HK-Chirp3-HD-Kore',
      enVoice: 'en-US-Chirp3-HD-Kore',
      rate: 0.95,
    })
    assert.equal(getVoiceSettings().yueVoice, 'yue-HK-Chirp3-HD-Kore')
  })
})
