import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  checkMath,
  levels,
  type Activity,
  type DayId,
} from '../data/content'
import { useSpeech } from '../hooks/useSpeech'

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
  const [picked, setPicked] = useState<number | null>(null)
  const [mathInput, setMathInput] = useState('')
  const [mathResult, setMathResult] = useState<'ok' | 'no' | null>(null)
  const [order, setOrder] = useState<string[]>([])
  const [pool, setPool] = useState<string[]>([])
  const [checkedFields, setCheckedFields] = useState<Record<string, boolean>>({})
  const { speak, stop } = useSpeech()

  const item = items[index]
  const isLast = index >= items.length - 1
  const done = completed[item.id]
  const levelMeta = levels.find((l) => l.level === item.level)

  const resetInteraction = (activity: Activity) => {
    setShowSample(false)
    setJustStar(false)
    setPicked(null)
    setMathInput('')
    setMathResult(null)
    setCheckedFields({})
    if (activity.kind === 'reorder' && activity.fragments) {
      const shuffled = [...activity.fragments].sort(() => Math.random() - 0.5)
      setPool(shuffled)
      setOrder([])
    } else {
      setPool([])
      setOrder([])
    }
  }

  useEffect(() => {
    resetInteraction(item)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id])

  const reorderCorrect = useMemo(() => {
    if (item.kind !== 'reorder' || !item.correctOrder) return false
    return order.length === item.correctOrder.length && order.every((w, i) => w === item.correctOrder![i])
  }, [item, order])

  const goNext = () => {
    stop()
    if (isLast) onBack()
    else setIndex((i) => i + 1)
  }

  const awardAndMaybeNext = (autoNext = false) => {
    if (!done) {
      onMarkDone(item.id, moduleKey)
      setJustStar(true)
    }
    if (autoNext || celebrate || isLast) {
      setTimeout(goNext, done ? 0 : 450)
    }
  }

  const canProceed = (): boolean => {
    if (done) return true
    if (item.kind === 'choice') return picked !== null && !!item.choices?.[picked]?.correct
    if (item.kind === 'math') return mathResult === 'ok'
    if (item.kind === 'reorder') return reorderCorrect
    if (item.kind === 'prompt') {
      if (!item.fields?.length) return true
      return item.fields.every((f) => checkedFields[f])
    }
    // speak: allow after showing sample or anytime (encourage practice)
    return showSample || done
  }

  const handlePrimary = () => {
    if (item.kind === 'speak' && !showSample && !done) {
      setShowSample(true)
      return
    }
    if (!canProceed() && !done) return
    if (!done) awardAndMaybeNext(true)
    else goNext()
  }

  return (
    <section className="session" style={{ '--accent': accent } as CSSProperties}>
      <header className="session__top">
        <button
          type="button"
          className="ghost-btn"
          onClick={() => {
            stop()
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
      </header>

      <div className="session__card" key={item.id}>
        <div className="session__badges">
          <p className="session__cue">{item.cue}</p>
          {levelMeta && (
            <p className="session__level" style={{ background: levelMeta.color }}>
              Lv.{item.level} {levelMeta.name}
            </p>
          )}
        </div>

        <h2 className="session__q">{item.promptZh}</h2>
        {item.promptEn && <p className="session__q-en">{item.promptEn}</p>}

        <div className="session__actions">
          <button type="button" className="pill-btn" onClick={() => speak(item.promptZh, 'zh-HK')}>
            聽題目
          </button>
          {item.promptEn && (
            <button
              type="button"
              className="pill-btn pill-btn--soft"
              onClick={() => speak(item.promptEn!, 'en-US')}
            >
              Hear EN
            </button>
          )}
        </div>

        {item.kind === 'choice' && item.choices && (
          <div className="choice-list">
            {item.choices.map((c, i) => {
              const selected = picked === i
              const reveal = picked !== null
              const ok = c.correct
              return (
                <button
                  key={c.text}
                  type="button"
                  className={[
                    'choice-btn',
                    selected ? 'is-selected' : '',
                    reveal && ok ? 'is-correct' : '',
                    selected && !ok ? 'is-wrong' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => {
                    if (picked !== null && item.choices![picked].correct) return
                    setPicked(i)
                    if (c.correct && !done) {
                      onMarkDone(item.id, moduleKey)
                      setJustStar(true)
                    }
                  }}
                >
                  <span className="choice-btn__mark">{String.fromCharCode(65 + i)}</span>
                  <span>{c.text}</span>
                </button>
              )
            })}
          </div>
        )}

        {item.kind === 'math' && (
          <div className="math-box">
            <label className="math-box__label" htmlFor="math-answer">
              你的答案
            </label>
            <div className="math-box__row">
              <input
                id="math-answer"
                className="math-input"
                value={mathInput}
                onChange={(e) => {
                  setMathInput(e.target.value)
                  setMathResult(null)
                }}
                placeholder="輸入答案"
                inputMode="text"
                autoComplete="off"
              />
              <button
                type="button"
                className="pill-btn"
                onClick={() => {
                  const ok = checkMath(item, mathInput)
                  setMathResult(ok ? 'ok' : 'no')
                  if (ok && !done) {
                    onMarkDone(item.id, moduleKey)
                    setJustStar(true)
                  }
                }}
              >
                檢查
              </button>
            </div>
            {mathResult === 'ok' && <p className="math-feedback is-ok">答對啦！好努力！</p>}
            {mathResult === 'no' && (
              <p className="math-feedback is-no">唔緊要，再試一次！可以請家長一齊諗。</p>
            )}
          </div>
        )}

        {item.kind === 'reorder' && (
          <div className="reorder">
            <p className="reorder__hint">點選詞語組成句子</p>
            <div className="reorder__sentence">
              {order.length === 0 && <span className="reorder__placeholder">句子會出現在這裏</span>}
              {order.map((w, i) => (
                <button
                  key={`${w}-${i}`}
                  type="button"
                  className="chip chip--placed"
                  onClick={() => {
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
                onClick={() => awardAndMaybeNext(false)}
              >
                收下星星
              </button>
            )}
          </div>
        )}

        {item.kind === 'prompt' && (
          <div className="prompt-fields">
            <p className="reorder__hint">和家長一起完成，打勾就可以</p>
            {(item.fields ?? ['我已經試過']).map((f) => (
              <label key={f} className="check-row">
                <input
                  type="checkbox"
                  checked={!!checkedFields[f]}
                  onChange={(e) => setCheckedFields((prev) => ({ ...prev, [f]: e.target.checked }))}
                />
                <span>{f}</span>
              </label>
            ))}
          </div>
        )}

        {(item.kind === 'speak' || item.sampleZh || item.sampleEn || item.tip) && (
          <div className="session__coach">
            {item.kind === 'speak' && <p className="session__coach-label">先自己試答，再看參考</p>}
            {item.kind === 'speak' && !showSample ? (
              <button type="button" className="primary-btn" onClick={() => setShowSample(true)}>
                看參考答案
              </button>
            ) : (
              (showSample || item.kind !== 'speak') &&
              (item.sampleZh || item.sampleEn || item.tip) && (
                <div className="sample">
                  {item.sampleZh && <p className="sample__zh">{item.sampleZh}</p>}
                  {item.sampleEn && item.sampleEn !== item.sampleZh && (
                    <p className="sample__en">{item.sampleEn}</p>
                  )}
                  {item.tip && <p className="sample__tip">小提示：{item.tip}</p>}
                  {(item.sampleZh || item.sampleEn) && (
                    <div className="session__actions">
                      {item.sampleZh && (
                        <button
                          type="button"
                          className="pill-btn"
                          onClick={() => speak(item.sampleZh!, 'zh-HK')}
                        >
                          聽參考
                        </button>
                      )}
                      {item.sampleEn && (
                        <button
                          type="button"
                          className="pill-btn pill-btn--soft"
                          onClick={() => speak(item.sampleEn!, 'en-US')}
                        >
                          Listen EN
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>

      <footer className="session__footer">
        <button
          type="button"
          className="ghost-btn"
          disabled={index === 0}
          onClick={() => {
            stop()
            setIndex((i) => Math.max(0, i - 1))
          }}
        >
          上一題
        </button>
        <button
          type="button"
          className="primary-btn primary-btn--wide"
          disabled={!done && !canProceed() && item.kind !== 'speak'}
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
