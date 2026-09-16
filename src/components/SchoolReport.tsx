import { useMemo, useState } from 'react'
import {
  CRITERIA,
  FILL_LABEL,
  REPORT_META,
  STRATEGIES,
  WEIGHTS,
  rankedSchools,
  type FillAdvice,
  type RankedSchool,
} from '../data/schoolReport'

type Props = {
  onBack: () => void
}

type Filter = 'all' | 'top' | 'net48' | 'dp'

function barWidth(score: number): string {
  return `${Math.max(8, score * 10)}%`
}

function scoreClass(score: number): string {
  if (score >= 8) return 'sr-score sr-score--hi'
  if (score >= 6) return 'sr-score sr-score--mid'
  return 'sr-score sr-score--lo'
}

function adviceClass(advice: FillAdvice): string {
  return `sr-chip sr-chip--${advice}`
}

export function SchoolReport({ onBack }: Props) {
  const rows = useMemo(() => rankedSchools(), [])
  const [filter, setFilter] = useState<Filter>('top')
  const [openId, setOpenId] = useState<string | null>(rows[0]?.id ?? null)

  const visible = rows.filter((row) => {
    if (filter === 'all') return true
    if (filter === 'net48') return row.net === '48'
    if (filter === 'dp') return row.advice === 'dp-first' || row.advice === 'dp-if-linked'
    return row.rank <= 10
  })

  const printReport = () => {
    window.print()
  }

  return (
    <section className="school-report">
      <header className="session__top school-report__top">
        <button type="button" className="ghost-btn" onClick={onBack} aria-label="返回">
          ←
        </button>
        <p className="school-report__kicker">家長專用 · 唔關面試練習事</p>
        <button type="button" className="sr-print" onClick={printReport}>
          列印
        </button>
      </header>

      <h2 className="parent__title">碩孜小一選校評分</h2>
      <p className="parent__lead">
        為 {REPORT_META.child}、{REPORT_META.kindergarten}（{REPORT_META.kindergartenAddress}
        ）、校網 {REPORT_META.schoolNet} 而設。入學年份 {REPORT_META.intake}。更新 {REPORT_META.updated}。
      </p>

      <div className="sr-deadline" role="status">
        <strong>9 月 25 日 23:59 截止</strong>
        <p>
          官立／資助小學「自行分配學位」只可以揀 <b>1 間</b>。電子平台 {REPORT_META.dpElectronic}。紙本{' '}
          {REPORT_META.dpPaper}。結果 {REPORT_META.dpResult}。
        </p>
      </div>

      <div className="sr-checklist">
        <h3>填表前 5 件事</h3>
        <ol>
          <li>用「智方便+」開好「小一入學電子平台」（epoa.edb.gov.hk），唔好等到 25 號晚。 </li>
          <li>只遞交一次：電子同紙本唔可以重複，亦唔可以向兩間官津小學申請，否則作廢。</li>
          <li>靈糧堂籍 ≠ 聖公會／循道衞理／天主教堂籍。無嗰間辦學團體嘅教會證明，就當無宗教分。</li>
          <li>直資（例如陸慶濤）可以另外報，唔佔呢個自行學位；但一旦接受直資小一，就不能再經 POA 派官津。</li>
          <li>自行失敗唔等於無書讀：1 月仲有校網 48 統一派位（{REPORT_META.caChoice}）。</li>
        </ol>
      </div>

      <h3 className="parent__h3">三條填表策略</h3>
      <div className="sr-strategies">
        {STRATEGIES.map((s) => (
          <article key={s.id} className="sr-strategy">
            <p className="sr-strategy__badge">{s.badge}</p>
            <h3>{s.title}</h3>
            <p className="sr-strategy__dp">
              9/25 填：<strong>{s.dp}</strong>
            </p>
            <p>{s.why}</p>
            <p className="sr-strategy__backup">{s.backup}</p>
          </article>
        ))}
      </div>

      <h3 className="parent__h3">加權（為活躍嘅孜孜而設）</h3>
      <ul className="sr-weights">
        <li>活躍適合度 {(WEIGHTS.active * 100).toFixed(0)}%</li>
        <li>校園面積 {(WEIGHTS.campus * 100).toFixed(0)}%</li>
        <li>升中成績 {(WEIGHTS.s1 * 100).toFixed(0)}%</li>
        <li>入學把握 {(WEIGHTS.chance * 100).toFixed(0)}%</li>
        <li>住屋負擔 {(WEIGHTS.housing * 100).toFixed(0)}%</li>
        <li>龍校 {(WEIGHTS.dragon * 100).toFixed(0)}%</li>
        <li>少負面新聞 {(WEIGHTS.news * 100).toFixed(0)}%</li>
      </ul>
      <p className="sr-fine">
        「入學競爭程度」10 分＝最爭；總分用倒數「入學把握」。呢份唔係全港名校榜，而係麗港城活躍男仔嘅填表分。
      </p>

      <div className="sr-filters" role="tablist" aria-label="篩選學校">
        {(
          [
            ['top', '前十'],
            ['dp', '自行相關'],
            ['net48', '校網 48'],
            ['all', '全部'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={filter === id ? 'sr-filter sr-filter--on' : 'sr-filter'}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="sr-table-wrap">
        <table className="sr-table">
          <thead>
            <tr>
              <th>#</th>
              <th>學校</th>
              <th>總分</th>
              <th>活躍</th>
              <th>校園</th>
              <th>升中</th>
              <th>競爭</th>
              <th>填表</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={row.id}
                className={openId === row.id ? 'sr-row sr-row--open' : 'sr-row'}
                onClick={() => setOpenId(row.id)}
              >
                <td>{row.rank}</td>
                <td>
                  <strong>{row.short}</strong>
                  <span className="sr-muted">
                    {row.area} · {row.campusSqm.toLocaleString()}㎡
                    {row.campusEstimated ? ' 約' : ''}
                  </span>
                </td>
                <td>
                  <b>{row.total.toFixed(1)}</b>
                </td>
                <td>{row.active}</td>
                <td>{row.campus}</td>
                <td>{row.s1}</td>
                <td>{row.competition}</td>
                <td>
                  <span className={adviceClass(row.advice)}>{FILL_LABEL[row.advice]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="parent__h3">逐間睇分</h3>
      <div className="sr-cards">
        {visible.map((row) => (
          <SchoolCard
            key={row.id}
            row={row}
            open={openId === row.id}
            onToggle={() => setOpenId(openId === row.id ? null : row.id)}
          />
        ))}
      </div>

      <div className="parent__note">
        <h3>資料來源同限制</h3>
        <p>
          校園面積：教育局《小學概覽 2025》／Schooland。學額同統一派位佔比：Schooland 校網 48（2026
          學額；2027 實際開班或有出入）。樓價：2026 年 8–9 月麗港城／匯景花園放盤同成交呎價。升中：教育局唔公開
          Band 1%；聖安當有公開分項，其餘係家長圈／個別中學取錄表。
        </p>
        <p>
          標「約」嘅面積係按千禧／舊校類型估計。負面新聞用公開報道，無報道 ≠ 完美。填表前請再對教育局電子平台同學校網頁。
        </p>
      </div>
    </section>
  )
}

function SchoolCard({
  row,
  open,
  onToggle,
}: {
  row: RankedSchool
  open: boolean
  onToggle: () => void
}) {
  return (
    <article className={open ? 'sr-card sr-card--open' : 'sr-card'}>
      <button type="button" className="sr-card__head" onClick={onToggle}>
        <span className="sr-card__rank">{row.rank}</span>
        <span className="sr-card__title">
          <strong>{row.name}</strong>
          <em>
            {row.short} · {row.kind === 'dss' ? '直資' : row.kind === 'government' ? '官立' : '資助'} · 網{' '}
            {row.net}
          </em>
        </span>
        <span className="sr-card__total">{row.total.toFixed(1)}</span>
      </button>
      {open ? (
        <div className="sr-card__body">
          <p className="sr-card__why">{row.why}</p>
          <p>
            <span className={adviceClass(row.advice)}>{FILL_LABEL[row.advice]}</span>
            <span className="sr-muted">
              {' '}
              {row.address} · {row.religion} · {row.classes} 班／約 {row.places} 學位
            </span>
          </p>
          <ul className="sr-bars">
            {CRITERIA.filter((c) => c.key !== 'chance').map((c) => {
              const value =
                c.key === 'competition'
                  ? row.competition
                  : c.key === 'campus'
                    ? row.campus
                    : c.key === 'dragon'
                      ? row.dragon
                      : c.key === 's1'
                        ? row.s1
                        : c.key === 'news'
                          ? row.news
                          : c.key === 'housing'
                            ? row.housing
                            : row.active
              return (
                <li key={c.key}>
                  <span>{c.label}</span>
                  <span className="sr-bar">
                    <i style={{ width: barWidth(value) }} />
                  </span>
                  <b className={scoreClass(value)}>{value}</b>
                </li>
              )
            })}
            <li>
              <span>入學把握</span>
              <span className="sr-bar">
                <i style={{ width: barWidth(row.chance) }} />
              </span>
              <b className={scoreClass(row.chance)}>{row.chance}</b>
            </li>
          </ul>
          <dl className="sr-notes">
            <div>
              <dt>通勤</dt>
              <dd>{row.commute}</dd>
            </div>
            <div>
              <dt>面積</dt>
              <dd>
                {row.campusSqm.toLocaleString()} 平方米
                {row.campusEstimated ? '（估計）' : ''}
              </dd>
            </div>
            <div>
              <dt>龍校</dt>
              <dd>{row.dragonNote}</dd>
            </div>
            <div>
              <dt>升中</dt>
              <dd>{row.s1Note}</dd>
            </div>
            <div>
              <dt>新聞</dt>
              <dd>{row.newsNote}</dd>
            </div>
            <div>
              <dt>樓價／租金</dt>
              <dd>{row.housingNote}</dd>
            </div>
            <div>
              <dt>活躍適合</dt>
              <dd>{row.activeNote}</dd>
            </div>
            <div>
              <dt>競爭</dt>
              <dd>
                {row.competitionNote}
                {row.caShare ? ` 統一派位佔比 ${row.caShare}%。` : ''}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}
    </article>
  )
}
