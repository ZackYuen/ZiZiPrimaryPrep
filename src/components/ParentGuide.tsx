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
        <p className="parent__stars">碩孜已收集 {stars} 顆星</p>
      </header>

      <h2 className="parent__title">家長指引</h2>
      <p className="parent__lead">
        內容來自《名校模擬面試》第一週字詞表與 Day 1–6。目標不是全部做對，而是建立勇氣、表達與不放棄。
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

      <h3 className="parent__h3">答錯點樣教</h3>
      <div className="parent__list">
        <article className="parent__item">
          <h3>唔會一次錯就揭曉</h3>
          <p>
            選擇題／數學：第一次答錯只會鼓勵「再試一次」，唔顯示正確答案。第二次錯先出小提示；碩孜按「睇睇答案」先揭曉。答啱先有星星。
          </p>
        </article>
        <article className="parent__item">
          <h3>五歲唔使打字</h3>
          <p>
            中英文題：碩孜大聲講完，按「我講完啦」。分類／排句：拖或點。數學：只用大數字鍵盤。唔使打中文或英文。
          </p>
        </article>
        <article className="parent__item">
          <h3>電話聽講（練習提示）</h3>
          <p>
            說話題可按「試下用電話聽你講」睇電話聽到咩字，並有溫柔重點提示。童聲粵語未必準——星星仍然由家長按「我講完啦」決定，唔會自動判錯。
          </p>
        </article>
        <article className="parent__item">
          <h3>選擇題會讀出嚟</h3>
          <p>
            每題有「讀晒選項」，每個選項旁有「聽」。唔識字都可以先聽再揀。
          </p>
        </article>
        <article className="parent__item">
          <h3>點樣先有真正粵語朗讀？</h3>
          <p>
            而家用瀏覽器 Web Speech（免費、唔使 API key），會優先揀 yue / zh-HK /
            Cantonese 聲線；Chrome／Edge 通常最好。若聽到普通話，請喺系統加入「中文（香港）」語音。
            更高質（要收費／後端）：Google Cloud TTS 嘅 <code>yue-HK</code> 聲線，或
            cantonese.ai。
          </p>
        </article>
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
          已設定為 <strong>袁碩孜（Seth Yuen）</strong>、藍田靈糧幼稚園。喜好／志願答案仍可按碩孜真實情況改寫。
        </p>
        <p>PDF 原稿在倉庫根目錄。Level 4 唔係必須完成——敢嘗試已經值得讚！</p>
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
