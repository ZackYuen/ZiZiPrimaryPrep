import { coreAbilities, levels, parentQuotes, parentTips } from '../data/content'

type Props = {
  stars: number
  onReset: () => void
  onBack: () => void
}

export function ParentGuide({ stars, onReset, onBack }: Props) {
  return (
    <section className="parent">
      <header className="session__top">
        <button type="button" className="ghost-btn" onClick={onBack}>
          ← 返回
        </button>
        <p className="parent__stars">孜孜已收集 {stars} 顆星</p>
      </header>

      <h2 className="parent__title">家長指引</h2>
      <p className="parent__lead">
        內容來自《名校模擬面試》第一周字詞表與 Day 1–6。目標不是全部做對，而是建立勇氣、表達與不放棄。
      </p>

      <h3 className="parent__h3">三個核心能力</h3>
      <div className="parent__list">
        {coreAbilities.map((a) => (
          <article key={a.title} className="parent__item">
            <h3>{a.title}</h3>
            <p>{a.body}</p>
          </article>
        ))}
      </div>

      <h3 className="parent__h3">四個難度級別</h3>
      <div className="level-grid">
        {levels.map((l) => (
          <div key={l.level} className="level-pill" style={{ borderColor: l.color }}>
            <strong style={{ color: l.color }}>
              Lv.{l.level} {l.name}
            </strong>
            <span>{l.goal}</span>
            <span className="level-pill__target">{l.target}</span>
          </div>
        ))}
      </div>

      <h3 className="parent__h3">給家長的話</h3>
      <div className="parent__list">
        {parentTips.map((tip) => (
          <article key={tip.title} className="parent__item">
            <h3>{tip.title}</h3>
            <p>{tip.body}</p>
          </article>
        ))}
      </div>

      <h3 className="parent__h3">家長金句</h3>
      <div className="parent__list">
        {parentQuotes.map((q) => (
          <article key={q.when} className="parent__item">
            <h3>{q.when}</h3>
            <p>{q.quote}</p>
          </article>
        ))}
      </div>

      <div className="parent__note">
        <h3>個人化</h3>
        <p>
          在 <code>src/data/content.ts</code> 修改 <code>CHILD</code>（姓名、幼稚園）。答案可按家庭真實情況改寫。
        </p>
        <p>PDF 原稿已放在倉庫根目錄，方便對照練習。Level 4 唔係必須完成——敢嘗試已經值得讚！</p>
      </div>

      <button
        type="button"
        className="ghost-btn"
        onClick={() => {
          if (confirm('確定要清空所有星星和進度嗎？')) onReset()
        }}
      >
        重置進度
      </button>
    </section>
  )
}
