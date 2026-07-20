import { useEffect } from 'react'
import { ensureBgm, setBgmScene, type BgmMood, type BgmPlace } from '../lib/bgm'

type Opts = {
  place: BgmPlace
  day?: number
  stars: number
  /** When set, updates mood. Omit on session screens so local mood wins. */
  mood?: BgmMood
}

/** Keep procedural BGM aligned with the current screen + progress. */
export function useBackgroundMusic({ place, day = 0, stars, mood }: Opts) {
  useEffect(() => {
    if (mood !== undefined) {
      setBgmScene({ place, day, stars, mood })
    } else {
      setBgmScene({ place, day, stars })
    }
  }, [place, day, stars, mood])

  useEffect(() => {
    ensureBgm()
  }, [])
}
