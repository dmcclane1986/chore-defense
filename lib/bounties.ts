import type { Bounty, BountyFrequency } from '@/types'

export const FREQUENCY_ICON: Record<BountyFrequency, string> = {
  constant:    '📌',
  daily:       '☀️',
  weekly:      '📅',
  semi_weekly: '🔄',
  bi_weekly:   '🌙',
}

export const FREQUENCY_LABEL: Record<BountyFrequency, string> = {
  constant:    'Constant',
  daily:       'Daily',
  weekly:      'Weekly',
  semi_weekly: 'Twice a Week',
  bi_weekly:   'Every Two Weeks',
}

type RotatingFrequency = Exclude<BountyFrequency, 'daily' | 'constant'>

// How many to pick from each rotating group per rotation period
const SHOW_COUNT: Record<RotatingFrequency, number> = {
  weekly:      2,
  semi_weekly: 2,
  bi_weekly:   1,
}

// How long each rotation period lasts
const PERIOD_MS: Record<RotatingFrequency, number> = {
  weekly:      7  * 24 * 60 * 60 * 1000,
  semi_weekly: 3  * 24 * 60 * 60 * 1000,  // ~twice per week
  bi_weekly:   14 * 24 * 60 * 60 * 1000,
}

/** Deterministic Fisher-Yates shuffle seeded by a 32-bit integer */
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
 * Returns the bounties that should appear on the board right now.
 * - Constant → always shown (even if marked complete in DB; completion is reset server-side)
 * - Daily (or null/legacy) → always shown when not completed
 * - Weekly / Semi-Weekly / Bi-Weekly → a date-seeded selection is shown;
 *   the selection rotates on each period boundary so the same chores appear
 *   for everyone until the period flips.
 *
 * Pass `nowMs` from the server on initial load so SSR and every browser match
 * (client-only Date.now() breaks hydration if clocks differ between machines).
 */
export function selectBountiesForBoard(bounties: Bounty[], nowMs: number = Date.now()): Bounty[] {
  const constant = bounties.filter((b) => b.frequency === 'constant')
  const available = bounties.filter((b) => !b.is_completed)

  // Daily (and legacy bounties with no frequency) always show
  const daily = available.filter(
    (b) => !b.frequency || b.frequency === 'daily'
  )

  function pickGroup(freq: RotatingFrequency): Bounty[] {
    const pool = available.filter((b) => b.frequency === freq)
    if (pool.length === 0) return []
    const period = Math.floor(nowMs / PERIOD_MS[freq])
    const shuffled = seededShuffle(pool, period)
    return shuffled.slice(0, SHOW_COUNT[freq])
  }

  return [
    ...constant,
    ...daily,
    ...pickGroup('weekly'),
    ...pickGroup('semi_weekly'),
    ...pickGroup('bi_weekly'),
  ]
}

/** Display order for frequency groups on the board */
export const FREQUENCY_ORDER: BountyFrequency[] = [
  'constant',
  'daily',
  'weekly',
  'semi_weekly',
  'bi_weekly',
]
