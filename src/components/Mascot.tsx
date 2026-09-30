type Props = {
  mood?: 'happy' | 'cheer' | 'think' | 'wave'
  size?: number
  className?: string
}

const MOOD_ART: Record<NonNullable<Props['mood']>, string> = {
  happy: 'zizi-wave.jpg',
  wave: 'zizi-wave.jpg',
  think: 'zizi-think.jpg',
  cheer: 'zizi-cheer.jpg',
}

/** Handmade lime-green clay/paper buddy representing 孜孜 / Seth. */
export function Mascot({ mood = 'happy', size = 160, className = '' }: Props) {
  return (
    <img
      className={`mascot mascot--${mood} ${className}`}
      width={size}
      height={size}
      src={`${import.meta.env.BASE_URL}characters/${MOOD_ART[mood]}`}
      alt="孜孜的綠色手工小伙伴"
      draggable={false}
    />
  )
}
