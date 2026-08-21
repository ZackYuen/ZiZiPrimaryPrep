import { useState } from 'react'
import { hasGoogleTtsKey } from '../lib/googleTts'
import {
  DEFAULT_VOICE_SETTINGS,
  EN_VOICE_OPTIONS,
  getVoiceSettings,
  RATE_OPTIONS,
  saveVoiceSettings,
  YUE_VOICE_OPTIONS,
  type EnGoogleVoice,
  type VoiceProvider,
  type VoiceRate,
  type VoiceSettings,
  type YueGoogleVoice,
} from '../lib/voiceSettings'
import { playSfx, unlockAudio } from '../hooks/useSfx'
import { useSpeech } from '../hooks/useSpeech'

const YUE_TEST = '碩孜你好！我哋今日一齊練習，準備好就開始啦。'
const EN_TEST = 'Hello, my name is Seth. I am five years old, and I love drawing.'

export function VoiceSettingsPanel() {
  const [settings, setSettings] = useState<VoiceSettings>(() => getVoiceSettings())
  const { speak, stop } = useSpeech()
  const googleReady = hasGoogleTtsKey()

  const update = (patch: Partial<VoiceSettings>) => {
    stop()
    const next = { ...settings, ...patch }
    setSettings(next)
    saveVoiceSettings(next)
    playSfx('tap')
  }

  const test = (lang: 'zh-HK' | 'en-US') => {
    unlockAudio()
    playSfx('tap')
    speak(lang === 'zh-HK' ? YUE_TEST : EN_TEST, lang)
  }

  return (
    <section className="voice-settings" aria-labelledby="voice-settings-title">
      <div className="voice-settings__heading">
        <div>
          <h3 id="voice-settings-title">朗讀聲音設定</h3>
          <p>揀聲、速度，再即時試聽。設定會自動保存。</p>
        </div>
        <span className="voice-settings__badge">P</span>
      </div>

      <label className="voice-settings__field">
        <span>朗讀來源</span>
        <select
          value={settings.provider}
          onChange={(event) => update({ provider: event.target.value as VoiceProvider })}
        >
          <option value="google">Google 高質聲音（建議）</option>
          <option value="system">iPhone／瀏覽器系統聲音</option>
        </select>
      </label>

      {settings.provider === 'google' ? (
        <>
          <label className="voice-settings__field">
            <span>廣東話</span>
            <select
              value={settings.yueVoice}
              onChange={(event) => update({ yueVoice: event.target.value as YueGoogleVoice })}
            >
              {YUE_VOICE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="voice-settings__field">
            <span>English</span>
            <select
              value={settings.enVoice}
              onChange={(event) => update({ enVoice: event.target.value as EnGoogleVoice })}
            >
              {EN_VOICE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <p className="voice-settings__notice">
          會用 Safari 提供嘅系統聲音。Apple 通常只俾網頁用精簡聲音，未必係你喺設定揀嘅 Siri 聲音 2。
        </p>
      )}

      <label className="voice-settings__field">
        <span>速度</span>
        <select
          value={settings.rate}
          onChange={(event) => update({ rate: Number(event.target.value) as VoiceRate })}
        >
          {RATE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {settings.provider === 'google' && !googleReady && (
        <p className="voice-settings__warning">未設定 Google 語音金鑰，試聽會自動改用系統聲音。</p>
      )}

      <div className="voice-settings__tests">
        <button type="button" className="pill-btn" onClick={() => test('zh-HK')}>
          ▶ 試廣東話
        </button>
        <button type="button" className="pill-btn pill-btn--soft" onClick={() => test('en-US')}>
          ▶ Test English
        </button>
        <button
          type="button"
          className="voice-settings__reset"
          onClick={() => {
            update(DEFAULT_VOICE_SETTINGS)
          }}
        >
          回復建議設定
        </button>
      </div>
    </section>
  )
}
