import { storyFrameSrc } from '../lib/storyFrameSrc'

type Props = {
  image: string
  alt: string
  className?: string
}

/** Wordless picture-book art used by the timed visual-memory exercise. */
export function StoryFrameArt({ image, alt, className = '' }: Props) {
  return (
    <img
      className={`story-frame-art ${className}`}
      src={storyFrameSrc(image)}
      alt={alt}
      draggable={false}
    />
  )
}
