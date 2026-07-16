type Props = {
  /** Day of June to highlight (1–30). June 1 is Sunday in the worksheet. */
  highlightDay?: number
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

/** June calendar matching the PDF (1 = Sunday). */
export function JuneCalendar({ highlightDay }: Props) {
  // June 1 Sunday → offset 0
  const cells: (number | null)[] = []
  for (let d = 1; d <= 30; d++) cells.push(d)
  // pad end to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="june-cal" aria-label="六月日曆">
      <p className="june-cal__title">六月</p>
      <div className="june-cal__grid">
        {WEEKDAYS.map((w) => (
          <span key={w} className="june-cal__head">
            {w}
          </span>
        ))}
        {cells.map((d, i) => (
          <span
            key={i}
            className={[
              'june-cal__cell',
              d == null ? 'is-empty' : '',
              d != null && d === highlightDay ? 'is-highlight' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {d ?? ''}
          </span>
        ))}
      </div>
    </div>
  )
}
