import { useState } from 'react'
import { CHILD, vocabCategories } from '../data/content'
import { useSpeech } from '../hooks/useSpeech'
import { playSfx, unlockAudio } from '../hooks/useSfx'
import { Mascot } from './Mascot'
import { SoundToggle } from './SoundToggle'
import { Confetti } from './Confetti'

type Props = {
  completed: Record<string, boolean>
  onMarkDone: (itemId: string, moduleKey: 'vocab') => void
  onBack: () => void
}

export function VocabSession({ completed, onMarkDone, onBack }: Props) {
  const [catIndex, setCatIndex] = useState(0)
  const [itemIndex, setItemIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [burst, setBurst] = useState(false)
  const { speak, stop } = useSpeech()

  const cat = vocabCategories[catIndex]
  const item = cat.items[itemIndex]
  const cardId = `vocab-${cat.id}-${itemIndex}`
  const done = completed[cardId]

  const next = () => {
    stop()
    unlockAudio()
    playSfx(done ? 'whoosh' : 'star')
    if (!done) {
      onMarkDone(cardId, 'vocab')
      setBurst(true)
    }
    setFlipped(false)
    if (itemIndex < cat.items.length - 1) {
      setItemIndex((i) => i + 1)
      return
    }
    if (catIndex < vocabCategories.length - 1) {
      setCatIndex((c) => c + 1)
      setItemIndex(0)
      return
    }
    playSfx('celebrate')
    onBack()
  }

  return (
    <section className="session">
      <Confetti show={burst} onDone={() => setBurst(false)} />
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
          <span className="session__title">第一週字詞表</span>
          <span>
            {cat.title} · {itemIndex + 1}/{cat.items.length}
          </span>
        </div>
        <SoundToggle />
      </header>

      <div className="vocab-stage">
        <Mascot mood={flipped ? 'cheer' : 'wave'} size={100} className="vocab-stage__mascot" />
        <button
          type="button"
          className={`vocab-card ${flipped ? 'is-flipped' : ''}`}
          key={cardId}
          onClick={() => {
            unlockAudio()
            playSfx('flip')
            setFlipped((f) => !f)
          }}
        >
          <p className="vocab-card__cat">{cat.title}</p>
          <p className="vocab-card__zh">{item.zh}</p>
          <p className={`vocab-card__en ${flipped ? 'is-show' : ''}`}>{item.en}</p>
          <p className="vocab-card__hint">{flipped ? '再點一下可翻面' : `點卡片給 ${CHILD.nameShort} 看英文`}</p>
        </button>
      </div>

      <div className="session__actions" style={{ justifyContent: 'center' }}>
        <button
          type="button"
          className="pill-btn"
          onClick={() => {
            unlockAudio()
            playSfx('tap')
            speak(item.zh, 'zh-HK')
          }}
        >
          聽中文
        </button>
        <button
          type="button"
          className="pill-btn pill-btn--soft"
          onClick={() => {
            unlockAudio()
            playSfx('tap')
            speak(item.en, 'en-US')
          }}
        >
          Hear English
        </button>
      </div>

      <div className="vocab-cats">
        {vocabCategories.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className={`chip ${i === catIndex ? 'chip--active' : ''}`}
            onClick={() => {
              stop()
              playSfx('tap')
              setCatIndex(i)
              setItemIndex(0)
              setFlipped(false)
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
            playSfx('whoosh')
            setFlipped(false)
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
