type Props = {
  image: string
  alt: string
  className?: string
}

export function storyFrameSrc(image: string): string {
  return `${import.meta.env.BASE_URL}story-interview/${image}`
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
