import { useState } from 'react'
import { vocabCategories } from '../data/content'
import { useSpeech } from '../hooks/useSpeech'

type Props = {
  completed: Record<string, boolean>
  onMarkDone: (itemId: string, moduleKey: 'vocab') => void
  onBack: () => void
}

export function VocabSession({ completed, onMarkDone, onBack }: Props) {
  const [catIndex, setCatIndex] = useState(0)
  const [itemIndex, setItemIndex] = useState(0)
  const { speak, stop } = useSpeech()

  const cat = vocabCategories[catIndex]
  const item = cat.items[itemIndex]
  const cardId = `vocab-${cat.id}-${itemIndex}`
  const done = completed[cardId]

  const next = () => {
    stop()
    if (!done) onMarkDone(cardId, 'vocab')
    if (itemIndex < cat.items.length - 1) {
      setItemIndex((i) => i + 1)
      return
    }
    if (catIndex < vocabCategories.length - 1) {
      setCatIndex((c) => c + 1)
      setItemIndex(0)
      return
    }
    onBack()
  }

  return (
    <section className="session">
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
          <span className="session__title">第一周字詞表</span>
          <span>
            {cat.title} · {itemIndex + 1}/{cat.items.length}
          </span>
        </div>
      </header>

      <div className="vocab-card" key={cardId}>
        <p className="vocab-card__cat">{cat.title}</p>
        <p className="vocab-card__zh">{item.zh}</p>
        <p className="vocab-card__en">{item.en}</p>
        <div className="session__actions">
          <button type="button" className="pill-btn" onClick={() => speak(item.zh, 'zh-HK')}>
            聽中文
          </button>
          <button type="button" className="pill-btn pill-btn--soft" onClick={() => speak(item.en, 'en-US')}>
            Hear English
          </button>
        </div>
      </div>

      <div className="vocab-cats">
        {vocabCategories.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className={`chip ${i === catIndex ? 'chip--active' : ''}`}
            onClick={() => {
              stop()
              setCatIndex(i)
              setItemIndex(0)
            }}
          >
            {c.title.replace('時間 · ', '').replace('人物 · ', '')}
          </button>
        ))}
      </div>

      <footer className="session__footer">
        <button
          type="button"
          className="ghost-btn"
          disabled={catIndex === 0 && itemIndex === 0}
          onClick={() => {
            stop()
            if (itemIndex > 0) setItemIndex((i) => i - 1)
            else if (catIndex > 0) {
              const prev = vocabCategories[catIndex - 1]
              setCatIndex((c) => c - 1)
              setItemIndex(prev.items.length - 1)
            }
          }}
        >
          上一個
        </button>
        <button type="button" className="primary-btn primary-btn--wide" onClick={next}>
          {done ? '下一個' : '識咗 · 下一個'}
        </button>
      </footer>
    </section>
  )
}
