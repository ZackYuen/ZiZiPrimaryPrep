import type { SceneId } from '../data/content'

/** Map scene ids to cropped PDF illustrations in /public/scenes */
const SCENE_SRC: Partial<Record<SceneId, string>> = {
  sleep: 'scenes/sleep.jpg',
  'run-park': 'scenes/run-park.jpg',
  'classroom-read': 'scenes/classroom-read.jpg',
  drink: 'scenes/drink.jpg',
  eat: 'scenes/eat.jpg',
  'read-book': 'scenes/write-hw.jpg',
  'write-hw': 'scenes/write-hw.jpg',
  'share-cookie': 'scenes/share-cookie.jpg',
  'broken-vase': 'scenes/broken-vase.jpg',
  playground: 'scenes/playground.jpg',
  sequence: 'scenes/sequence.jpg',
  intro: 'scenes/drink.jpg',
}

type Props = {
  scene: SceneId
  className?: string
  alt?: string
}

export function SceneArt({ scene, className = '', alt = '' }: Props) {
  const src = SCENE_SRC[scene]
  const base = import.meta.env.BASE_URL

  if (!src) {
    return null
  }

  return (
    <div className={`scene-art scene-art--photo scene-art--${scene} ${className}`}>
      <img
        className="scene-art__img"
        src={`${base}${src}`}
        alt={alt || '練習圖畫'}
        loading="lazy"
      />
    </div>
  )
}
