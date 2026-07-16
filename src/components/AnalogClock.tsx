type Props = {
  hour: number
  minute: number
  className?: string
}

/** Simple analog clock face for reading-time drills */
export function AnalogClock({ hour, minute, className = '' }: Props) {
  const h = hour % 12
  const minuteAngle = minute * 6
  const hourAngle = h * 30 + minute * 0.5

  return (
    <div className={`analog-clock ${className}`} aria-label={`鐘面 ${hour}:${String(minute).padStart(2, '0')}`}>
      <svg viewBox="0 0 200 200" className="analog-clock__svg" role="img">
        <circle cx="100" cy="100" r="96" className="analog-clock__rim" />
        <circle cx="100" cy="100" r="88" className="analog-clock__face" />
        {Array.from({ length: 12 }, (_, i) => {
          const n = i + 1
          const a = ((n % 12) * 30 - 90) * (Math.PI / 180)
          const x = 100 + Math.cos(a) * 68
          const y = 100 + Math.sin(a) * 68
          return (
            <text key={n} x={x} y={y} className="analog-clock__num" textAnchor="middle" dominantBaseline="middle">
              {n}
            </text>
          )
        })}
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i * 6 - 90) * (Math.PI / 180)
          const outer = 88
          const inner = i % 5 === 0 ? 78 : 83
          return (
            <line
              key={i}
              x1={100 + Math.cos(a) * inner}
              y1={100 + Math.sin(a) * inner}
              x2={100 + Math.cos(a) * outer}
              y2={100 + Math.sin(a) * outer}
              className={i % 5 === 0 ? 'analog-clock__tick analog-clock__tick--major' : 'analog-clock__tick'}
            />
          )
        })}
        <line
          x1="100"
          y1="100"
          x2={100 + Math.sin((hourAngle * Math.PI) / 180) * 48}
          y2={100 - Math.cos((hourAngle * Math.PI) / 180) * 48}
          className="analog-clock__hand analog-clock__hand--hour"
        />
        <line
          x1="100"
          y1="100"
          x2={100 + Math.sin((minuteAngle * Math.PI) / 180) * 66}
          y2={100 - Math.cos((minuteAngle * Math.PI) / 180) * 66}
          className="analog-clock__hand analog-clock__hand--minute"
        />
        <circle cx="100" cy="100" r="5" className="analog-clock__pin" />
      </svg>
    </div>
  )
}
