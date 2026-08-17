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
        <button type="button" className="ghost-btn" onClick={onBack} aria-label="返回">
          ←
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
          <h3>卡住點算</h3>
          <p>
            每題都有圖。碩孜撳「? 幫我」就會出圖同淺提示，仲會讀出嚟。答錯一次都會自動出圖。睇完提示，下一題掣就開，唔會停死。
          </p>
        </article>
        <article className="parent__item">
          <h3>唔會一次錯就揭曉</h3>
          <p>
            選擇題／數學：答錯會出圖同淺提示，唔會即刻揭曉答案。再錯可以撳「?」睇答案。答啱先有星星；睇完提示都可以去下一題。
          </p>
        </article>
        <article className="parent__item">
          <h3>五歲唔使打字</h3>
          <p>
            中英文題：碩孜大聲講。分類／排句：拖詞。數學：大數字鍵盤。
          </p>
        </article>
        <article className="parent__item">
          <h3>電話聽講（練習提示）</h3>
          <p>
            撳 ● 錄音 → ■ 轉字（Google）→ ▶ 朗讀轉出嚟嘅字 → 爸爸媽媽撳 ★。
          </p>
        </article>
        <article className="parent__item">
          <h3>掣用符號（方便唔識字）</h3>
          <p>
            主要掣用符號：▶ ▶▶ ✓ ? ← → ＋ － $ ★。中文喺旁白／aria。
          </p>
        </article>
        <article className="parent__item">
          <h3>點樣先有真正粵語朗讀？</h3>
          <p>
            iPhone Safari <strong>用唔到 Siri 聲音 2</strong>（Apple 禁止網頁用 Siri／優質語音包，只得精簡版善怡）。所以朗讀改用 <strong>Google 高質粵語 Chirp3</strong>，口語同中英夾雜會自然過舊聲。練習頁「朗讀聲」應顯示 Google 粵語 Chirp3。
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
