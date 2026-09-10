type Props = {
  mood?: 'happy' | 'cheer' | 'think' | 'wave'
  size?: number
  className?: string
}

const MOOD_ART: Record<NonNullable<Props['mood']>, string> = {
  happy: 'seth-wave.jpg',
  wave: 'seth-wave.jpg',
  think: 'seth-think.jpg',
  cheer: 'seth-cheer.jpg',
}

/** Consistent Japanese picture-book portrait of Seth. */
export function Mascot({ mood = 'happy', size = 160, className = '' }: Props) {
  return (
    <img
      className={`mascot mascot--${mood} ${className}`}
      width={size}
      height={size}
      src={`${import.meta.env.BASE_URL}characters/${MOOD_ART[mood]}`}
      alt=""
      aria-hidden
      draggable={false}
    />
  )
}
