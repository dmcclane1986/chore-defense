export type Level = {
  level: number
  title: string
  minXp: number
  maxXp: number | null
}

export const LEVELS: Level[] = [
  { level: 1, title: 'Peasant',    minXp: 0,    maxXp: 49   },
  { level: 2, title: 'Squire',     minXp: 50,   maxXp: 149  },
  { level: 3, title: 'Knight',     minXp: 150,  maxXp: 349  },
  { level: 4, title: 'Chevalier',  minXp: 350,  maxXp: 699  },
  { level: 5, title: 'Baron',      minXp: 700,  maxXp: 1299 },
  { level: 6, title: 'Viscount',   minXp: 1300, maxXp: 2199 },
  { level: 7, title: 'Earl',       minXp: 2200, maxXp: 3499 },
  { level: 8, title: 'Duke',       minXp: 3500, maxXp: 5499 },
  { level: 9, title: 'Archduke',   minXp: 5500, maxXp: 8499 },
  { level: 10, title: 'Sovereign', minXp: 8500, maxXp: null },
]

export function getLevel(xp: number): Level {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].minXp) return LEVELS[i]
  }
  return LEVELS[0]
}

/** Progress within the current level, as 0–100 */
export function getLevelProgress(xp: number): number {
  const lvl = getLevel(xp)
  if (lvl.maxXp === null) return 100
  const range = lvl.maxXp - lvl.minXp
  const progress = xp - lvl.minXp
  return Math.min(100, Math.round((progress / range) * 100))
}

/** XP needed to reach next level */
export function xpToNextLevel(xp: number): number | null {
  const lvl = getLevel(xp)
  if (lvl.maxXp === null) return null
  return lvl.maxXp + 1 - xp
}
