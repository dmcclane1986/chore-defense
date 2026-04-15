import type { MarketItem } from '@/types'

export const DAY_NAMES = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
] as const

export type DayName = typeof DAY_NAMES[number]

export const DAY_LABELS: Record<DayName, string> = {
  sunday:    'Sun',
  monday:    'Mon',
  tuesday:   'Tue',
  wednesday: 'Wed',
  thursday:  'Thu',
  friday:    'Fri',
  saturday:  'Sat',
}

/** How many random-rotation items to show per day in the general store */
const RANDOM_SHOW_COUNT = 5

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr]
  let s = seed >>> 0
  for (let i = result.length - 1; i > 0; i--) {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    const j = s % (i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Filters a venue's items to what should be visible today.
 *
 * - Items with `available_days` set → only shown when today matches one of those days
 * - Items with no `available_days`  → random rotation pool; up to RANDOM_SHOW_COUNT
 *   are chosen each day (seed changes at midnight so everyone sees the same selection)
 *
 * For black_market / traveling_merchant, pass `applyFilter = false` to skip
 * filtering (those markets are already time-gated by their schedule window).
 */
export function selectItemsForToday(
  items: MarketItem[],
  applyFilter = true
): MarketItem[] {
  if (!applyFilter) return items

  const todayIndex = new Date().getDay()
  const todayName = DAY_NAMES[todayIndex]
  // Seed changes once per calendar day (UTC midnight)
  const dailySeed = Math.floor(Date.now() / (24 * 60 * 60 * 1000))

  const daySpecific = items.filter(
    (item) => item.available_days && item.available_days.length > 0
  )
  const randomPool = items.filter(
    (item) => !item.available_days || item.available_days.length === 0
  )

  const todayDaySpecific = daySpecific.filter((item) =>
    item.available_days!.includes(todayName)
  )

  const shuffledRandom = seededShuffle(randomPool, dailySeed)
  const selectedRandom = shuffledRandom.slice(0, RANDOM_SHOW_COUNT)

  return [...todayDaySpecific, ...selectedRandom]
}
