import { useEffect, useMemo, useState, type CSSProperties, type DragEvent } from 'react'
import {
  checkClock,
  checkMath,
  checkMoney,
  levels,
  type Activity,
  type ActivityKind,
  type DayId,
} from '../data/content'
import { looksEnglish, useSpeech } from '../hooks/useSpeech'
import { useSpeechRecognition, type ListenLang } from '../hooks/useSpeechRecognition'
import { softSpeakFeedback } from '../lib/softSpeakFeedback'
import { KID } from '../lib/kidLabels'
import { playSfx, unlockAudio } from '../hooks/useSfx'
import { SceneArt } from './SceneArt'
import { Confetti } from './Confetti'
import { Mascot } from './Mascot'
import { SoundToggle } from './SoundToggle'
import { AnalogClock } from './AnalogClock'
import { CoinPurse } from './CoinPurse'
import { JuneCalendar } from './JuneCalendar'

type Props = {
  title: string
  accent: string
  items: Activity[]
  moduleKey: DayId | 'mock' | 'vocab'
  completed: Record<string, boolean>
  onMarkDone: (itemId: string, moduleKey: DayId | 'mock' | 'vocab') => void
  onBack: () => void
  celebrate?: boolean
}

const METHOD_LABEL: Record<ActivityKind, string> = {
  speak: '▶ 講',
  choice: '○ 揀',
  math: '123',
  reorder: '↔ 排',
  prompt: '✓ 做',
  sort: '＋－',
  clock: '◎ 鐘',
  money: '$',
}

const MATH_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '/'] as const
const CLOCK_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ':', '0', '00'] as const
const MONEY_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✓'] as const

function bucketTitle(bucket: string): string {
  if (bucket === '正面的') return '＋'
  if (bucket === '負面的') return '－'
  return bucket
}

function placeIntoBucket(
  text: string,
  bucket: string,
  setSortPlacement: (fn: (prev: Record<string, string>) => Record<string, string>) => void,
  setSortSelected: (v: string | null) => void,
  setSortChecked: (v: boolean) => void,
  setCoachMsg: (v: string | null) => void,
) {
  unlockAudio()
  playSfx('tap')
  setSortPlacement((prev) => ({ ...prev, [text]: bucket }))
  setSortSelected(null)
  setSortChecked(false)
  setCoachMsg(null)
}

export function PracticeSession({
  title,
  accent,
  items,
  moduleKey,
  completed,
  onMarkDone,
  onBack,
  celebrate = false,
}: Props) {
  const [index, setIndex] = useState(0)
  const [showSample, setShowSample] = useState(false)
  const [justStar, setJustStar] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)
  const [wrongPicks, setWrongPicks] = useState<number[]>([])
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [revealAnswer, setRevealAnswer] = useState(false)
  const [coachMsg, setCoachMsg] = useState<string | null>(null)
  const [mathInput, setMathInput] = useState('')
  const [mathResult, setMathResult] = useState<'ok' | 'no' | null>(null)
  const [moneyYuan, setMoneyYuan] = useState('')
  const [moneyJiao, setMoneyJiao] = useState('')
  const [moneyField, setMoneyField] = useState<'yuan' | 'jiao'>('yuan')
  const [order, setOrder] = useState<string[]>([])
  const [pool, setPool] = useState<string[]>([])
  const [checkedFields, setCheckedFields] = useState<Record<string, boolean>>({})
  const [sortSelected, setSortSelected] = useState<string | null>(null)
  const [sortPlacement, setSortPlacement] = useState<Record<string, string>>({})
  const [sortChecked, setSortChecked] = useState(false)
  const [dragWord, setDragWord] = useState<string | null>(null)
  const { speak, speakQueue, stop, voiceStatus } = useSpeech()
  const {
    supported: listenSupported,
    listening,
    transcript: listenTranscript,
    interim: listenInterim,
    error: listenError,
    elapsedSec,
    sttAlive,
    heardSpeech,
    activeLang,
    requestedLang,
    langConfirmed,
    lastErrorCode,
    statusHint,
    engine,
    busy: listenBusy,
    start: startListening,
    stop: stopListening,
    reset: resetListening,
  } = useSpeechRecognition()
  const [listenLang, setListenLang] = useState<ListenLang>('zh-HK')

  const item = items[index]
  const isLast = index >= items.length - 1
  const done = completed[item.id]
  const levelMeta = levels.find((l) => l.level === item.level)
  const solvedChoice = picked !== null && !!item.choices?.[picked]?.correct

  const sortCorrect = useMemo(() => {
    if (item.kind !== 'sort' || !item.sortItems?.length) return false
    return item.sortItems.every((s) => sortPlacement[s.text] === s.bucket)
  }, [item, sortPlacement])

  const sortComplete = useMemo(() => {
    if (item.kind !== 'sort' || !item.sortItems?.length) return false
    return item.sortItems.every((s) => !!sortPlacement[s.text])
  }, [item, sortPlacement])

  const mascotMood =
    justStar || mathResult === 'ok' || solvedChoice || (sortChecked && sortCorrect)
      ? 'cheer'
      : mathResult === 'no' || wrongAttempts > 0 || (sortChecked && !sortCorrect)
        ? 'think'
        : 'happy'

  const resetInteraction = (_activity: Activity) => {
    setShowSample(false)
    setJustStar(false)
    setPicked(null)
    setWrongPicks([])
    setWrongAttempts(0)
    setRevealAnswer(false)
    setCoachMsg(null)
    setMathInput('')
    setMathResult(null)
    setMoneyYuan('')
    setMoneyJiao('')
    setMoneyField('yuan')
    setCheckedFields({})
    stopListening()
    resetListening()
    setListenLang(_activity.promptEn && (!_activity.sampleZh || _activity.sampleZh === _activity.sampleEn) ? 'en-US' : 'zh-HK')
    setSortSelected(null)
    setSortPlacement({})
    setSortChecked(false)
    setDragWord(null)
    if (_activity.kind === 'reorder' && _activity.fragments) {
      const shuffled = [..._activity.fragments].sort(() => Math.random() - 0.5)
      setPool(shuffled)
      setOrder([])
    } else if (_activity.kind === 'sort' && _activity.sortItems) {
      const shuffled = [..._activity.sortItems.map((s) => s.text)].sort(() => Math.random() - 0.5)
      setPool(shuffled)
      setOrder([])
    } else {
      setPool([])
      setOrder([])
    }
  }

  useEffect(() => {
    playSfx('whoosh')
    resetInteraction(item)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  useEffect(() => {
    if (justStar) {
      playSfx('star')
      setShowConfetti(true)
    }
  }, [justStar])

  const reorderCorrect = useMemo(() => {
    if (item.kind !== 'reorder' || !item.correctOrder) return false
    return order.length === item.correctOrder.length && order.every((w, i) => w === item.correctOrder![i])
  }, [item, order])

  const speakFeedback = useMemo(() => {
    const heard = `${listenTranscript} ${listenInterim}`.trim()
    if (item.kind !== 'speak' || !heard) return null
    const sample =
      listenLang === 'en-US'
        ? item.sampleEn || item.sampleZh
        : item.sampleZh || item.sampleEn
    return softSpeakFeedback(heard, sample, listenLang === 'en-US' ? 'en' : 'zh')
  }, [item, listenTranscript, listenInterim, listenLang])

  useEffect(() => {
    if (reorderCorrect && !done) {
      playSfx('correct')
    }
  }, [reorderCorrect, done])

  const goNext = () => {
    stop()
    stopListening()
    playSfx('whoosh')
    if (isLast) {
      if (celebrate) playSfx('celebrate')
      onBack()
    } else setIndex((i) => i + 1)
  }

  const awardAndMaybeNext = (autoNext = false) => {
    if (!done) {
      onMarkDone(item.id, moduleKey)
      setJustStar(true)
    }
    if (autoNext || celebrate || isLast) {
      setTimeout(goNext, done ? 0 : 550)
    }
  }

  const isSolved = (): boolean => {
    if (item.kind === 'choice') return solvedChoice
    if (item.kind === 'math' || item.kind === 'clock' || item.kind === 'money') {
      return mathResult === 'ok'
    }
    if (item.kind === 'reorder') return reorderCorrect
    if (item.kind === 'sort') return sortChecked && sortCorrect
    if (item.kind === 'prompt') {
      if (!item.fields?.length) return true
      return item.fields.every((f) => checkedFields[f])
    }
    // speak: star when parent/kid taps「我講完啦」(marks done)
    return done
  }

  const canProceed = (): boolean => {
    if (done) return true
    if (item.kind === 'speak') return false
    if (item.kind === 'choice' || item.kind === 'math' || item.kind === 'clock' || item.kind === 'money') {
      return isSolved() || revealAnswer
    }
    if (item.kind === 'reorder') return reorderCorrect
    if (item.kind === 'sort') return (sortChecked && sortCorrect) || revealAnswer
    if (item.kind === 'prompt') return isSolved()
    return false
  }

  const registerWrong = (extraTip?: string) => {
    setWrongAttempts((n) => {
      const next = n + 1
      if (next === 1) {
        setCoachMsg('唔緊要，再試一次！你可以嘅！')
      } else if (next === 2) {
        setCoachMsg(extraTip || item.tip || '再諗一諗。需要可以請爸爸媽媽一齊傾。')
      } else {
        setCoachMsg('想睇答案都得——勇敢嘗試已經好叻！')
      }
      return next
    })
  }

  const markMathOk = () => {
    setMathResult('ok')
    setCoachMsg('答對啦！好努力！')
    playSfx('correct')
    if (!done) {
      onMarkDone(item.id, moduleKey)
      setJustStar(true)
    }
  }

  const submitMath = () => {
    if (mathResult === 'ok') return
    unlockAudio()
    const ok = checkMath(item, mathInput)
    if (ok) markMathOk()
    else {
      setMathResult('no')
      playSfx('wrong')
      registerWrong(item.tip)
    }
  }

  const submitClock = () => {
    if (mathResult === 'ok') return
    unlockAudio()
    const ok = checkClock(item, mathInput)
    if (ok) markMathOk()
    else {
      setMathResult('no')
      playSfx('wrong')
      registerWrong(item.tip)
    }
  }

  const submitMoney = () => {
    if (mathResult === 'ok') return
    unlockAudio()
    const ok = checkMoney(item, moneyYuan, moneyJiao)
    if (ok) markMathOk()
    else {
      setMathResult('no')
      playSfx('wrong')
      registerWrong(item.tip)
    }
  }

  const appendMathKey = (key: string) => {
    if (mathResult === 'ok') return
    playSfx('tap')
    setMathResult(null)
    if (key === '00') setMathInput((prev) => `${prev}00`)
    else setMathInput((prev) => `${prev}${key}`)
  }

  const appendMoneyKey = (key: string) => {
    if (mathResult === 'ok') return
    if (key === '✓') {
      submitMoney()
      return
    }
    playSfx('tap')
    setMathResult(null)
    if (key === '⌫') {
      if (moneyField === 'yuan') setMoneyYuan((p) => p.slice(0, -1))
      else setMoneyJiao((p) => p.slice(0, -1))
      return
    }
    if (moneyField === 'yuan') setMoneyYuan((p) => `${p}${key}`)
    else setMoneyJiao((p) => `${p}${key}`)
  }

  const handlePrimary = () => {
    unlockAudio()
    playSfx('tap')
    if (!canProceed() && !done) return
    if (!done && isSolved()) awardAndMaybeNext(true)
    else goNext()
  }

  const onDragStartWord = (text: string) => (e: DragEvent) => {
    setDragWord(text)
    setSortSelected(text)
    e.dataTransfer.setData('text/plain', text)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDropBucket = (bucket: string) => (e: DragEvent) => {
    e.preventDefault()
    if (sortChecked && sortCorrect) return
    const text = e.dataTransfer.getData('text/plain') || dragWord || sortSelected
    if (!text) return
    placeIntoBucket(text, bucket, setSortPlacement, setSortSelected, setSortChecked, setCoachMsg)
    setDragWord(null)
  }

  return (
    <section className="session" style={{ '--accent': accent } as CSSProperties}>
      <Confetti show={showConfetti} onDone={() => setShowConfetti(false)} />

      <header className="session__top">
        <button
          type="button"
          className="ghost-btn"
          onClick={() => {
            stop()
            stopListening()
            playSfx('tap')
            onBack()
          }}
          aria-label="返回"
        >
          {KID.back}
        </button>
        <div className="session__progress">
          <span className="session__title">{title}</span>
          <span>
            {index + 1} / {items.length}
          </span>
          <div className="session__track">
            <div style={{ width: `${((index + 1) / items.length) * 100}%` }} />
          </div>
        </div>
        <SoundToggle />
      </header>

      <div className="session__layout">
        <div className="session__buddy" aria-hidden>
          <Mascot mood={mascotMood} size={120} />
        </div>

        <div className="session__card" key={item.id}>
          <div className="session__badges">
            <p className={`session__method session__method--${item.kind}`}>{METHOD_LABEL[item.kind]}</p>
            {(item.section || item.cue) && (
              <p className="session__cue">{item.section || item.cue}</p>
            )}
            {levelMeta && (
              <p className="session__level" style={{ background: levelMeta.color }}>
                Lv.{item.level} {levelMeta.name}
              </p>
            )}
          </div>

          {item.scene && <SceneArt scene={item.scene} alt={item.promptZh} />}
          {item.clock && <AnalogClock hour={item.clock.hour} minute={item.clock.minute} />}
          {item.coins && item.purseOwner && <CoinPurse owner={item.purseOwner} coins={item.coins} />}
          {item.calendarDay != null && <JuneCalendar highlightDay={item.calendarDay} />}

          <h2 className="session__q">{item.promptZh}</h2>
          {item.promptEn && <p className="session__q-en">{item.promptEn}</p>}

          <div className="session__actions">
            <button
              type="button"
              className="pill-btn"
              onClick={() => {
                unlockAudio()
                playSfx('tap')
                speak(item.promptZh, 'zh-HK')
              }}
              aria-label="聽題目"
            >
              {KID.listen}
            </button>
            {item.promptEn && (
              <button
                type="button"
                className="pill-btn pill-btn--soft"
                onClick={() => {
                  unlockAudio()
                  playSfx('tap')
                  speak(item.promptEn!, 'en-US')
                }}
                aria-label="Hear English"
              >
                {KID.listenEn}
              </button>
            )}
          </div>

          {item.kind === 'speak' && (
            <div className="speak-box">
              <p className="speak-box__guide">
                ▶ 講俾爸爸媽媽聽 · ★ 就得（電話聽只係練習）
              </p>

              {listenSupported && (
                <div className={`listen-panel ${listening ? 'is-listening' : ''}`}>
                  <div className="session__actions">
                    <button
                      type="button"
                      className={`pill-btn ${listenLang === 'zh-HK' ? '' : 'pill-btn--soft'}`}
                      disabled={listening}
                      onClick={() => {
                        playSfx('tap')
                        setListenLang('zh-HK')
                      }}
                      aria-label="廣東話"
                    >
                      {KID.cantonese}
                    </button>
                    <button
                      type="button"
                      className={`pill-btn ${listenLang === 'en-US' ? '' : 'pill-btn--soft'}`}
                      disabled={listening}
                      onClick={() => {
                        playSfx('tap')
                        setListenLang('en-US')
                      }}
                      aria-label="English"
                    >
                      {KID.english}
                    </button>
                  </div>
                  {!listening && !listenBusy ? (
                    <button
                      type="button"
                      className="primary-btn primary-btn--wide"
                      onClick={() => {
                        // Start STT first so rec.start() stays in the user-gesture stack
                        stop()
                        startListening(listenLang)
                        unlockAudio()
                        playSfx('tap')
                      }}
                      aria-label="開始聽你講"
                    >
                      {KID.mic}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="primary-btn primary-btn--wide listen-panel__stop"
                      disabled={listenBusy && !listening}
                      onClick={() => {
                        if (listenBusy && !listening) return
                        stopListening()
                        playSfx('tap')
                      }}
                      aria-label={listenBusy && !listening ? '轉文字中' : '停止聽'}
                    >
                      {listenBusy && !listening
                        ? `… ${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, '0')}`
                        : `${KID.micStop} ${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, '0')}`}
                    </button>
                  )}
                  <div className="listen-panel__transcript" aria-live="polite">
                    {listening && (
                      <p className="listen-panel__live">
                        ● {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, '0')}
                        {sttAlive
                          ? heardSpeech
                            ? ' · 聽到聲'
                            : ' · 聽寫中'
                          : engine === 'safari'
                            ? ' · 連接聽寫'
                            : ' · 啟動中'}
                        <span className="listen-panel__lang">
                          {' '}
                          · {engine === 'safari' ? 'Safari' : 'Chrome'} ·{' '}
                          {langConfirmed
                            ? `引擎 ${activeLang}`
                            : `要求 ${requestedLang}（未確認）`}
                          {lastErrorCode ? ` · ${lastErrorCode}` : ''}
                        </span>
                      </p>
                    )}
                    {statusHint ? <p className="listen-panel__hint">{statusHint}</p> : null}
                    {listening && !langConfirmed && engine === 'safari' ? (
                      <p className="listen-panel__hint">
                        畫面上嘅語言碼只係「要求」Safari 用邊種聽寫；未見到「引擎 xxx」前，其實未真正用到
                        zh-HK。
                      </p>
                    ) : null}
                    {engine === 'safari' && !listening && !listenTranscript ? (
                      <p className="listen-panel__hint">
                        麥克風允許之後，仲要：設定→一般→鍵盤→聽寫→下載「廣東話」。鍵盤「粵」同 Notes
                        聽寫得，網頁都可能仍無字——無字就用 ★。
                      </p>
                    ) : null}
                    {(listenTranscript || listenInterim) ? (
                      <p className="listen-panel__text">
                        {listenTranscript}
                        {listenInterim ? (
                          <span className="listen-panel__interim"> {listenInterim}</span>
                        ) : null}
                      </p>
                    ) : (
                      <p className="listen-panel__placeholder">
                        {listening
                          ? engine === 'safari'
                            ? '請用廣東話大聲講…（保持到撳 ■）'
                            : '請大聲講… 字會顯示喺呢度'
                          : listenBusy
                            ? '轉文字中，請稍等…'
                            : engine === 'safari'
                              ? '撳 ● 開始（要聽寫「廣東話」）'
                              : '撳 ● 開始講（要用網絡）'}
                      </p>
                    )}
                  </div>
                  {listenError && <p className="listen-panel__error">{listenError}</p>}
                  {speakFeedback && (
                    <div className="listen-panel__feedback">
                      <p>{speakFeedback.message}</p>
                      {speakFeedback.matched.length > 0 && (
                        <div className="listen-panel__chips">
                          {speakFeedback.matched.map((k) => (
                            <span key={k} className="listen-chip listen-chip--ok">
                              {k}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="listen-panel__note">
                    {engine === 'safari'
                      ? '● 保持到 ■ · 麥克風允許仍可能無字（網頁聽寫限制）· ★ 由爸爸媽媽按'
                      : '● 要網絡 · 講完撳 ■ · ★ 由爸爸媽媽按'}
                  </p>
                </div>
              )}

              {!listenSupported && (
                <p className="speak-box__guide">呢部瀏覽器未支援語音辨識，改由爸爸媽媽聽就得。</p>
              )}

              {!done ? (
                <button
                  type="button"
                  className="primary-btn primary-btn--wide"
                  onClick={() => {
                    unlockAudio()
                    stopListening()
                    playSfx('correct')
                    onMarkDone(item.id, moduleKey)
                    setJustStar(true)
                  }}
                  aria-label="我講完啦"
                >
                  {KID.starOk}
                </button>
              ) : (
                <p className="math-feedback is-ok">★</p>
              )}
              <div className="session__actions">
                <button
                  type="button"
                  className="pill-btn pill-btn--soft"
                  onClick={() => {
                    playSfx('flip')
                    setShowSample((v) => !v)
                  }}
                  aria-label={showSample ? '收起參考' : '家長睇參考'}
                >
                  {showSample ? `${KID.parentHint} ×` : `${KID.parentHint} ?`}
                </button>
              </div>
              {showSample && (item.sampleZh || item.sampleEn || item.tip) && (
                <div className="sample">
                  {item.sampleZh && <p className="sample__zh">{item.sampleZh}</p>}
                  {item.sampleEn && item.sampleEn !== item.sampleZh && (
                    <p className="sample__en">{item.sampleEn}</p>
                  )}
                  {item.tip && <p className="sample__tip">小提示：{item.tip}</p>}
                  <div className="session__actions">
                    {item.sampleZh && (
                      <button
                        type="button"
                        className="pill-btn"
                        onClick={() => {
                          playSfx('tap')
                          stopListening()
                          speak(item.sampleZh!, 'zh-HK')
                        }}
                        aria-label="聽參考"
                      >
                        {KID.listen}
                      </button>
                    )}
                    {item.sampleEn && (
                      <button
                        type="button"
                        className="pill-btn pill-btn--soft"
                        onClick={() => {
                          playSfx('tap')
                          stopListening()
                          speak(item.sampleEn!, 'en-US')
                        }}
                        aria-label="Listen English sample"
                      >
                        {KID.listenEn}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {item.kind === 'choice' && item.choices && (
            <div className="choice-list">
              <p className="reorder__hint">▶ 聽 · 再撳揀</p>
              <div className="session__actions">
                <button
                  type="button"
                  className="pill-btn"
                  onClick={() => {
                    unlockAudio()
                    playSfx('tap')
                    const lang = item.choices!.every((c) => looksEnglish(c.text)) ? 'en-US' : 'zh-HK'
                    const lines = item.choices!.map(
                      (c, i) => `${String.fromCharCode(65 + i)}. ${c.text}`,
                    )
                    speakQueue(lines, lang)
                  }}
                  aria-label="讀晒選項"
                >
                  {KID.listenAll}
                </button>
              </div>
              {voiceStatus.tip && (
                <p className="choice-voice-tip">粵語提示：{voiceStatus.tip}</p>
              )}
              {item.choices.map((c, i) => {
                const selected = picked === i
                const triedWrong = wrongPicks.includes(i)
                const showCorrect = (solvedChoice || revealAnswer) && c.correct
                const locked = solvedChoice || revealAnswer
                const choiceLang = looksEnglish(c.text) ? 'en-US' : 'zh-HK'
                return (
                  <div
                    key={c.text}
                    className={[
                      'choice-row',
                      selected && c.correct ? 'is-selected' : '',
                      showCorrect ? 'is-correct' : '',
                      triedWrong && !c.correct ? 'is-wrong' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    <button
                      type="button"
                      className="choice-btn"
                      disabled={locked || triedWrong}
                      onClick={() => {
                        unlockAudio()
                        if (locked || triedWrong) return
                        if (c.correct) {
                          setPicked(i)
                          setCoachMsg('答對啦！你好努力！')
                          playSfx('correct')
                          if (!done) {
                            onMarkDone(item.id, moduleKey)
                            setJustStar(true)
                          }
                        } else {
                          playSfx('wrong')
                          setWrongPicks((prev) => (prev.includes(i) ? prev : [...prev, i]))
                          registerWrong()
                          setPicked(null)
                        }
                      }}
                    >
                      <span className="choice-btn__mark">{String.fromCharCode(65 + i)}</span>
                      <span>{c.text}</span>
                    </button>
                    <button
                      type="button"
                      className="choice-hear"
                      aria-label={`聽選項 ${String.fromCharCode(65 + i)}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        unlockAudio()
                        playSfx('tap')
                        speak(c.text, choiceLang)
                      }}
                    >
                      {KID.listen}
                    </button>
                  </div>
                )
              })}
              {coachMsg && <p className={`math-feedback ${solvedChoice ? 'is-ok' : 'is-no'}`}>{coachMsg}</p>}
              {!solvedChoice && !revealAnswer && wrongAttempts >= 2 && (
                <button
                  type="button"
                  className="pill-btn pill-btn--soft"
                  onClick={() => {
                    playSfx('flip')
                    setRevealAnswer(true)
                    setCoachMsg('答案喺綠色嗰個。下次再試都得！')
                    const correctIdx = item.choices!.findIndex((x) => x.correct)
                    if (correctIdx >= 0) setPicked(correctIdx)
                  }}
                  aria-label="睇睇答案"
                >
                  {KID.peek}
                </button>
              )}
            </div>
          )}

          {item.kind === 'clock' && (
            <div className="math-box">
              <p className="math-box__label">睇鐘 · 撳數字（7:30）</p>
              <div className="math-display" aria-live="polite">
                {mathInput || <span className="math-display__placeholder">__:__</span>}
              </div>
              <div className="numpad" role="group" aria-label="時間鍵盤">
                {CLOCK_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="numpad__key"
                    disabled={mathResult === 'ok'}
                    onClick={() => appendMathKey(key)}
                  >
                    {key}
                  </button>
                ))}
                <button
                  type="button"
                  className="numpad__key numpad__key--wide"
                  disabled={mathResult === 'ok' || !mathInput}
                  onClick={() => {
                    playSfx('tap')
                    setMathResult(null)
                    setMathInput((prev) => prev.slice(0, -1))
                  }}
                >
                  ⌫
                </button>
                <button
                  type="button"
                  className="numpad__key numpad__key--wide numpad__key--go"
                  disabled={mathResult === 'ok' || !mathInput}
                  onClick={submitClock}
                  aria-label="檢查"
                >
                  {KID.check}
                </button>
              </div>
              {(coachMsg || mathResult === 'ok') && (
                <p className={`math-feedback ${mathResult === 'ok' ? 'is-ok' : 'is-no'}`}>
                  {mathResult === 'ok' ? '答對啦！好努力！' : coachMsg}
                </p>
              )}
              {mathResult !== 'ok' && !revealAnswer && wrongAttempts >= 2 && (
                <button
                  type="button"
                  className="pill-btn pill-btn--soft"
                  style={{ marginTop: '0.55rem' }}
                  onClick={() => {
                    playSfx('flip')
                    setRevealAnswer(true)
                    setCoachMsg(`參考答案：${item.answer ?? ''}${item.tip ? `（${item.tip}）` : ''}`)
                  }}
                  aria-label="睇睇答案"
                >
                  {KID.peek}
                </button>
              )}
              {revealAnswer && mathResult !== 'ok' && item.answer && (
                <p className="sample__tip">參考答案：{item.answer}</p>
              )}
            </div>
          )}

          {item.kind === 'money' && (
            <div className="math-box">
              <p className="math-box__label">先撳 $ 或 ¢，再用數字</p>
              <div className="money-fields">
                <button
                  type="button"
                  className={`money-field ${moneyField === 'yuan' ? 'is-active' : ''}`}
                  onClick={() => {
                    playSfx('tap')
                    setMoneyField('yuan')
                  }}
                >
                  <span className="money-field__value">{moneyYuan || '—'}</span>
                  <span className="money-field__unit" aria-label="元">$</span>
                </button>
                <button
                  type="button"
                  className={`money-field ${moneyField === 'jiao' ? 'is-active' : ''}`}
                  onClick={() => {
                    playSfx('tap')
                    setMoneyField('jiao')
                  }}
                >
                  <span className="money-field__value">{moneyJiao || '—'}</span>
                  <span className="money-field__unit" aria-label="角">¢</span>
                </button>
              </div>
              <div className="numpad" role="group" aria-label="元角鍵盤">
                {MONEY_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={[
                      'numpad__key',
                      key === '✓' ? 'numpad__key--go' : '',
                      key === '⌫' || key === '✓' ? 'numpad__key--wide' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    disabled={
                      mathResult === 'ok' ||
                      (key === '✓' && (!moneyYuan || !moneyJiao)) ||
                      (key === '⌫' && !(moneyField === 'yuan' ? moneyYuan : moneyJiao))
                    }
                    onClick={() => appendMoneyKey(key)}
                  >
                    {key}
                  </button>
                ))}
              </div>
              {(coachMsg || mathResult === 'ok') && (
                <p className={`math-feedback ${mathResult === 'ok' ? 'is-ok' : 'is-no'}`}>
                  {mathResult === 'ok' ? '答對啦！好努力！' : coachMsg}
                </p>
              )}
              {mathResult !== 'ok' && !revealAnswer && wrongAttempts >= 2 && (
                <button
                  type="button"
                  className="pill-btn pill-btn--soft"
                  style={{ marginTop: '0.55rem' }}
                  onClick={() => {
                    playSfx('flip')
                    setRevealAnswer(true)
                    setMoneyYuan(item.moneyYuan ?? '')
                    setMoneyJiao(item.moneyJiao ?? '')
                    setCoachMsg(
                      `參考答案：${item.moneyYuan} 元 ${item.moneyJiao} 角${item.tip ? `（${item.tip}）` : ''}`,
                    )
                  }}
                  aria-label="睇睇答案"
                >
                  {KID.peek}
                </button>
              )}
              {revealAnswer && mathResult !== 'ok' && (
                <p className="sample__tip">
                  參考答案：{item.moneyYuan} 元 {item.moneyJiao} 角
                </p>
              )}
            </div>
          )}

          {item.kind === 'math' && (
            <div className="math-box">
              <p className="math-box__label">撳數字</p>
              <div className="math-display" aria-live="polite">
                {mathInput || <span className="math-display__placeholder">答案會顯示喺度</span>}
              </div>
              <div className="numpad" role="group" aria-label="數字鍵盤">
                {MATH_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="numpad__key"
                    disabled={mathResult === 'ok'}
                    onClick={() => appendMathKey(key)}
                  >
                    {key}
                  </button>
                ))}
                <button
                  type="button"
                  className="numpad__key numpad__key--wide"
                  disabled={mathResult === 'ok' || !mathInput}
                  onClick={() => {
                    playSfx('tap')
                    setMathResult(null)
                    setMathInput((prev) => prev.slice(0, -1))
                  }}
                >
                  ⌫
                </button>
                <button
                  type="button"
                  className="numpad__key numpad__key--wide numpad__key--go"
                  disabled={mathResult === 'ok' || !mathInput}
                  onClick={submitMath}
                  aria-label="檢查"
                >
                  {KID.check}
                </button>
              </div>
              {(coachMsg || mathResult === 'ok') && (
                <p className={`math-feedback ${mathResult === 'ok' ? 'is-ok' : 'is-no'}`}>
                  {mathResult === 'ok' ? '答對啦！好努力！' : coachMsg}
                </p>
              )}
              {mathResult !== 'ok' && !revealAnswer && wrongAttempts >= 2 && (
                <button
                  type="button"
                  className="pill-btn pill-btn--soft"
                  style={{ marginTop: '0.55rem' }}
                  onClick={() => {
                    playSfx('flip')
                    setRevealAnswer(true)
                    setCoachMsg(`參考答案：${item.answer ?? ''}${item.tip ? `（${item.tip}）` : ''}`)
                  }}
                  aria-label="睇睇答案"
                >
                  {KID.peek}
                </button>
              )}
              {revealAnswer && mathResult !== 'ok' && item.answer && (
                <p className="sample__tip">參考答案：{item.answer}</p>
              )}
            </div>
          )}

          {item.kind === 'sort' && item.sortItems && item.buckets && (
            <div className="sort-box">
              <p className="reorder__hint">
                {sortSelected
                  ? `已揀「${sortSelected}」→ 再撳 ＋ 或 －`
                  : '拖去 ＋ / － ，或者先撳詞再撳圓圈'}
              </p>
              <div className="sort-buckets">
                {item.buckets.map((bucket) => (
                  <button
                    key={bucket}
                    type="button"
                    className={`sort-bucket ${sortSelected || dragWord ? 'is-ready' : ''}`}
                    onClick={() => {
                      if (!sortSelected || (sortChecked && sortCorrect)) return
                      placeIntoBucket(
                        sortSelected,
                        bucket,
                        setSortPlacement,
                        setSortSelected,
                        setSortChecked,
                        setCoachMsg,
                      )
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDropBucket(bucket)}
                  >
                    <span className="sort-bucket__title" title={bucket}>
                      {bucketTitle(bucket)}
                    </span>
                    <div className="sort-bucket__items">
                      {item.sortItems!
                        .filter((s) => sortPlacement[s.text] === bucket)
                        .map((s) => {
                          const wrongHere = sortChecked && !revealAnswer && s.bucket !== bucket
                          const showOk =
                            (sortChecked && sortCorrect) || revealAnswer
                              ? s.bucket === bucket
                              : false
                          return (
                            <button
                              key={s.text}
                              type="button"
                              draggable={!(sortChecked && sortCorrect)}
                              className={[
                                'chip chip--placed',
                                wrongHere ? 'is-sort-wrong' : '',
                                showOk ? 'is-sort-ok' : '',
                              ]
                                .filter(Boolean)
                                .join(' ')}
                              onDragStart={onDragStartWord(s.text)}
                              onClick={(e) => {
                                e.stopPropagation()
                                if (sortChecked && sortCorrect) return
                                playSfx('tap')
                                setSortPlacement((prev) => {
                                  const next = { ...prev }
                                  delete next[s.text]
                                  return next
                                })
                                setSortChecked(false)
                              }}
                            >
                              {s.text}
                            </button>
                          )
                        })}
                    </div>
                  </button>
                ))}
              </div>
              <div className="reorder__pool">
                {pool
                  .filter((text) => !sortPlacement[text])
                  .map((text) => (
                    <button
                      key={text}
                      type="button"
                      draggable={!(sortChecked && sortCorrect)}
                      className={`chip ${sortSelected === text ? 'chip--active' : ''}`}
                      onDragStart={onDragStartWord(text)}
                      onClick={() => {
                        if (sortChecked && sortCorrect) return
                        playSfx('tap')
                        setSortSelected((cur) => (cur === text ? null : text))
                      }}
                    >
                      {text}
                    </button>
                  ))}
              </div>
              <div className="session__actions">
                <button
                  type="button"
                  className="pill-btn"
                  disabled={!sortComplete || (sortChecked && sortCorrect)}
                  onClick={() => {
                    unlockAudio()
                    setSortChecked(true)
                    if (sortCorrect) {
                      playSfx('correct')
                      setCoachMsg('全部分對啦！好叻！')
                      if (!done) {
                        onMarkDone(item.id, moduleKey)
                        setJustStar(true)
                      }
                    } else {
                      playSfx('wrong')
                      registerWrong(item.tip)
                    }
                  }}
                  aria-label="檢查分類"
                >
                  {KID.check}
                </button>
                {!sortCorrect && !revealAnswer && wrongAttempts >= 2 && (
                  <button
                    type="button"
                    className="pill-btn pill-btn--soft"
                    onClick={() => {
                      playSfx('flip')
                      setRevealAnswer(true)
                      const fixed: Record<string, string> = {}
                      item.sortItems!.forEach((s) => {
                        fixed[s.text] = s.bucket
                      })
                      setSortPlacement(fixed)
                      setSortChecked(true)
                      setCoachMsg(item.tip || '已顯示正確分類。')
                    }}
                    aria-label="睇睇答案"
                  >
                    {KID.peek}
                  </button>
                )}
              </div>
              {coachMsg && (
                <p className={`math-feedback ${sortCorrect ? 'is-ok' : 'is-no'}`}>{coachMsg}</p>
              )}
            </div>
          )}

          {item.kind === 'reorder' && (
            <div className="reorder">
              <p className="reorder__hint">撳詞組成句子</p>
              <div className="reorder__sentence">
                {order.length === 0 && <span className="reorder__placeholder">句子會出現在這裡</span>}
                {order.map((w, i) => (
                  <button
                    key={`${w}-${i}`}
                    type="button"
                    className="chip chip--placed"
                    onClick={() => {
                      playSfx('tap')
                      setOrder((prev) => prev.filter((_, idx) => idx !== i))
                      setPool((prev) => [...prev, w])
                    }}
                  >
                    {w}
                  </button>
                ))}
              </div>
              <div className="reorder__pool">
                {pool.map((w, i) => (
                  <button
                    key={`${w}-p-${i}`}
                    type="button"
                    className="chip"
                    onClick={() => {
                      playSfx('tap')
                      setPool((prev) => prev.filter((_, idx) => idx !== i))
                      setOrder((prev) => [...prev, w])
                    }}
                  >
                    {w}
                  </button>
                ))}
              </div>
              {order.length > 0 && (
                <p className={`math-feedback ${reorderCorrect ? 'is-ok' : ''}`}>
                  {reorderCorrect ? '句子正確！好叻！' : '繼續調一調順序吧'}
                </p>
              )}
              {reorderCorrect && !done && (
                <button
                  type="button"
                  className="primary-btn"
                  style={{ marginTop: '0.75rem' }}
                  onClick={() => {
                    playSfx('tap')
                    awardAndMaybeNext(false)
                  }}
                  aria-label="收下星星"
                >
                  {KID.starOk}
                </button>
              )}
            </div>
          )}

          {item.kind === 'prompt' && (
            <div className="prompt-fields">
              <p className="reorder__hint">同爸爸媽媽一齊 · 撳 ✓</p>
              {(item.fields ?? ['我已經試過']).map((f) => (
                <label key={f} className="check-row">
                  <input
                    type="checkbox"
                    checked={!!checkedFields[f]}
                    onChange={(e) => {
                      playSfx(e.target.checked ? 'tap' : 'flip')
                      setCheckedFields((prev) => ({ ...prev, [f]: e.target.checked }))
                    }}
                  />
                  <span>{f}</span>
                </label>
              ))}
            </div>
          )}

          {item.kind !== 'speak' &&
            (item.sampleZh || item.sampleEn || item.tip) &&
            (showSample || item.kind === 'prompt') && (
              <div className="session__coach">
                <div className="sample">
                  {item.sampleZh && <p className="sample__zh">{item.sampleZh}</p>}
                  {item.sampleEn && item.sampleEn !== item.sampleZh && (
                    <p className="sample__en">{item.sampleEn}</p>
                  )}
                  {item.tip && <p className="sample__tip">小提示：{item.tip}</p>}
                </div>
              </div>
            )}
        </div>
      </div>

      <footer className="session__footer">
        <button
          type="button"
          className="ghost-btn"
          disabled={index === 0}
          onClick={() => {
            stop()
            stopListening()
            playSfx('whoosh')
            setIndex((i) => Math.max(0, i - 1))
          }}
          aria-label="上一題"
        >
          {KID.prev}
        </button>
        <button
          type="button"
          className="primary-btn primary-btn--wide"
          disabled={!done && !canProceed()}
          onClick={handlePrimary}
          aria-label={done ? (isLast ? '完成回主頁' : '下一題') : isLast ? '完成今日' : '下一題'}
        >
          {done ? (isLast ? KID.doneHome : KID.next) : isLast ? KID.doneToday : KID.next}
        </button>
      </footer>

      {justStar && (
        <div className="star-burst" aria-live="polite">
          +1 ★
        </div>
      )}
    </section>
  )
}
