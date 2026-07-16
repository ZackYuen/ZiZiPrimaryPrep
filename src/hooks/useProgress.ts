import { useCallback, useEffect, useState } from 'react'
import type { DayId } from '../data/content'

const STORAGE_KEY = 'zizi-prep-progress-v2'

export type ModuleKey = DayId | 'mock' | 'vocab'

export type ProgressState = {
  stars: number
  completed: Record<string, boolean>
  moduleDone: Partial<Record<ModuleKey, number>>
}

const defaultProgress: ProgressState = {
  stars: 0,
  completed: {},
  moduleDone: {},
}

function load(): ProgressState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultProgress
    return { ...defaultProgress, ...JSON.parse(raw) }
  } catch {
    return defaultProgress
  }
}

export function useProgress() {
  const [progress, setProgress] = useState<ProgressState>(defaultProgress)

  useEffect(() => {
    setProgress(load())
  }, [])

  const persist = useCallback((next: ProgressState) => {
    setProgress(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }, [])

  const markDone = useCallback((itemId: string, moduleKey: ModuleKey) => {
    setProgress((prev) => {
      if (prev.completed[itemId]) return prev
      const next: ProgressState = {
        stars: prev.stars + 1,
        completed: { ...prev.completed, [itemId]: true },
        moduleDone: {
          ...prev.moduleDone,
          [moduleKey]: (prev.moduleDone[moduleKey] ?? 0) + 1,
        },
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const reset = useCallback(() => {
    persist(defaultProgress)
  }, [persist])

  return { progress, markDone, reset }
}
