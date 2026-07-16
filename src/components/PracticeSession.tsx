import { useEffect, useMemo, useState, type CSSProperties, type DragEvent } from 'react'
import {
  checkMath,
  levels,
  type Activity,
  type ActivityKind,
  type DayId,
} from '../data/content'
import { useSpeech } from '../hooks/useSpeech'
import { playSfx, unlockAudio } from '../hooks/useSfx'
import { SceneArt } from './SceneArt'
import { Confetti } from './Confetti'
import { Mascot } from './Mascot'
import { SoundToggle } from './SoundToggle'

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
  speak: '大聲講',
  choice: '點選答案',
  math: '打數字',
  reorder: '排詞語',
  prompt: '同家長一齊',
  sort: '拖／點分類',
}

const MATH_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '/'] as const

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
  const [order, setOrder] = useState<string[]>([])
  const [pool, setPool] = useState<string[]>([])
  const [checkedFields, setCheckedFields] = useState<Record<string, boolean>>({})
  const [sortSelected, setSortSelected] = useState<string | null>(null)
  const [sortPlacement, setSortPlacement] = useState<Record<string, string>>({})
  const [sortChecked, setSortChecked] = useState(false)
  const [dragWord, setDragWord] = useState<string | null>(null)
  const { speak, stop } = useSpeech()

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
    setCheckedFields({})
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

  useEffect(() => {
    if (reorderCorrect && !done) {
      playSfx('correct')
    }
  }, [reorderCorrect, done])

  const goNext = () => {
    stop()
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
    if (item.kind === 'math') return mathResult === 'ok'
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
    if (item.kind === 'choice' || item.kind === 'math') {
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

  const submitMath = () => {
    if (mathResult === 'ok') return
    unlockAudio()
    const ok = checkMath(item, mathInput)
    if (ok) {
      setMathResult('ok')
      setCoachMsg('答對啦！好努力！')
      playSfx('correct')
      if (!done) {
        onMarkDone(item.id, moduleKey)
        setJustStar(true)
      }
    } else {
      setMathResult('no')
      playSfx('wrong')
      registerWrong(item.tip)
    }
  }

  const appendMathKey = (key: string) => {
    if (mathResult === 'ok') return
    playSfx('tap')
    setMathResult(null)
    setMathInput((prev) => `${prev}${key}`)
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
            playSfx('tap')
            onBack()
          }}
        >
          ← 返回
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
            >
              聽題目
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
              >
                Hear EN
              </button>
            )}
          </div>

          {item.kind === 'speak' && (
            <div className="speak-box">
              <p className="speak-box__guide">
                唔使打字！大聲講俾爸爸媽媽聽，講完按下面掣。
              </p>
              {!done ? (
                <button
                  type="button"
                  className="primary-btn primary-btn--wide"
                  onClick={() => {
                    unlockAudio()
                    playSfx('correct')
                    onMarkDone(item.id, moduleKey)
                    setJustStar(true)
                  }}
                >
                  我講完啦 ★
                </button>
              ) : (
                <p className="math-feedback is-ok">講得好！已經有星星啦</p>
              )}
              <div className="session__actions">
                <button
                  type="button"
                  className="pill-btn pill-btn--soft"
                  onClick={() => {
                    playSfx('flip')
                    setShowSample((v) => !v)
                  }}
                >
                  {showSample ? '收起參考' : '家長：睇／聽參考'}
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
                          speak(item.sampleZh!, 'zh-HK')
                        }}
                      >
                        聽參考
                      </button>
                    )}
                    {item.sampleEn && (
                      <button
                        type="button"
                        className="pill-btn pill-btn--soft"
                        onClick={() => {
                          playSfx('tap')
                          speak(item.sampleEn!, 'en-US')
                        }}
                      >
                        Listen EN
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {item.kind === 'choice' && item.choices && (
            <div className="choice-list">
              <p className="reorder__hint">用手指點正確答案（唔使打字）</p>
              {item.choices.map((c, i) => {
                const selected = picked === i
                const triedWrong = wrongPicks.includes(i)
                const showCorrect = (solvedChoice || revealAnswer) && c.correct
                const locked = solvedChoice || revealAnswer
                return (
                  <button
                    key={c.text}
                    type="button"
                    className={[
                      'choice-btn',
                      selected && c.correct ? 'is-selected' : '',
                      showCorrect ? 'is-correct' : '',
                      triedWrong && !c.correct ? 'is-wrong' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
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
                >
                  睇睇答案
                </button>
              )}
            </div>
          )}

          {item.kind === 'math' && (
            <div className="math-box">
              <p className="math-box__label">只用大數字鍵（唔使打中文／英文）</p>
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
                >
                  檢查
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
                >
                  睇睇答案
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
                  ? `已選「${sortSelected}」——拖去或再點圓圈放入`
                  : '拖詞語入圓圈，或者先點詞再點圓圈'}
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
                    <span className="sort-bucket__title">{bucket}</span>
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
                >
                  檢查分類
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
                  >
                    睇睇答案
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
              <p className="reorder__hint">點選詞語組成句子（唔使打字）</p>
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
                >
                  收下星星
                </button>
              )}
            </div>
          )}

          {item.kind === 'prompt' && (
            <div className="prompt-fields">
              <p className="reorder__hint">和家長一起做動作／傾偈，打勾就可以（唔使打字）</p>
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
            playSfx('whoosh')
            setIndex((i) => Math.max(0, i - 1))
          }}
        >
          上一題
        </button>
        <button
          type="button"
          className="primary-btn primary-btn--wide"
          disabled={!done && !canProceed()}
          onClick={handlePrimary}
        >
          {done ? (isLast ? '完成！回主頁' : '下一題') : isLast ? '完成今日' : '下一題'}
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
