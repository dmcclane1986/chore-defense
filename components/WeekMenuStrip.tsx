'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getDay, parseISO } from 'date-fns'
import { useCurrentUser } from '@/contexts/UserContext'
import { menuPlannerFamilyMemberIdForUser } from '@/lib/menu-planner-member-map'

type Props = {
  initialMenu: unknown | null
  initialFetchFailed: boolean
}

type VoteableLine = {
  menuItemId: string
  label: string
  kind?: 'lunch' | 'dinner'
}

const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/** Monday = 0 … Sunday = 6 (JS getDay: Sun = 0). */
function mondayIndexFromDate(d: Date): number {
  return (getDay(d) + 6) % 7
}

const WEEK_NAME_TO_INDEX: Record<string, number> = {
  mon: 0,
  monday: 0,
  mo: 0,
  tue: 1,
  tues: 1,
  tuesday: 1,
  tu: 1,
  wed: 2,
  wednesday: 2,
  we: 2,
  thu: 3,
  thur: 3,
  thurs: 3,
  thursday: 3,
  fri: 4,
  friday: 4,
  fr: 4,
  sat: 5,
  saturday: 5,
  sa: 5,
  sun: 6,
  sunday: 6,
  su: 6,
}

function stringFromMaybeNested(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim()
  if (v !== null && typeof v === 'object') {
    const o = v as Record<string, unknown>
    const s = o.name ?? o.title ?? o.label ?? o.text
    if (typeof s === 'string' && s.trim()) return s.trim()
  }
  return null
}

/**
 * Id for menu vote (POST /api/menu-vote): prefer planned-menu / slot ids, not recipe ids.
 * Do not walk `recipe`/`dish` nested objects (those ids usually fail "menu item not found").
 */
function coalesceMenuVoteId(o: Record<string, unknown>): string | number | null {
  const keys = [
    'plannedMealId',
    'planned_meal_id',
    'dayMealId',
    'day_meal_id',
    'weekMenuItemId',
    'week_menu_item_id',
    'menuItemId',
    'menu_item_id',
    'slotId',
    'slot_id',
    'mealSlotId',
    'meal_slot_id',
    'itemId',
    'item_id',
    'mealId',
    'meal_id',
    'id',
    '_id',
  ] as const
  for (const k of keys) {
    if (!(k in o)) continue
    const v = o[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return null
}

function menuItemIdFrom(o: Record<string, unknown>, depth = 0): string | null {
  const direct = coalesceMenuVoteId(o)
  if (direct !== null) return String(direct)
  if (depth === 0) {
    for (const key of ['menuItem', 'meal'] as const) {
      const nested = o[key]
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        const nid = menuItemIdFrom(nested as Record<string, unknown>, 1)
        if (nid) return nid
      }
    }
  }
  return null
}

function mealKindFromSlot(o: Record<string, unknown>): 'lunch' | 'dinner' | undefined {
  const slotRaw = (o.slot ?? o.mealType ?? o.type ?? o.category ?? '').toString().toLowerCase()
  if (slotRaw.includes('lunch') || slotRaw === 'l') return 'lunch'
  if (slotRaw.includes('dinner') || slotRaw.includes('supper') || slotRaw === 'd') return 'dinner'
  return undefined
}

function mealLine(day: Record<string, unknown>): string | null {
  const direct =
    day.dinner ??
    day.main ??
    day.lunch ??
    day.breakfast ??
    day.title ??
    day.name ??
    day.recipeName ??
    day.dish ??
    day.meal ??
    day.summary ??
    day.description ??
    day.text ??
    day.food
  const fromDirect = stringFromMaybeNested(direct)
  if (fromDirect) return fromDirect

  const meals = day.meals ?? day.items ?? day.recipes
  if (Array.isArray(meals) && meals.length) {
    const parts: string[] = []
    for (const m of meals) {
      const line = stringFromMaybeNested(m)
      if (line) parts.push(line)
    }
    if (parts.length) return parts.join(' · ')
  }
  return null
}

/** Pull tagged lunch/dinner from meals/slots arrays (slot, mealType, type). */
function taggedMealsFromArray(day: Record<string, unknown>): {
  lunch: string | null
  dinner: string | null
} {
  let lunch: string | null = null
  let dinner: string | null = null
  const arr = day.meals ?? day.items ?? day.recipes ?? day.slots
  if (!Array.isArray(arr)) return { lunch, dinner }

  for (const m of arr) {
    if (m === null || typeof m !== 'object') continue
    const o = m as Record<string, unknown>
    const slotRaw = (o.slot ?? o.mealType ?? o.type ?? o.category ?? '').toString().toLowerCase()
    const text =
      stringFromMaybeNested(o.recipe ?? o.dish ?? o.meal ?? o) ??
      stringFromMaybeNested(o)
    if (!text) continue
    if (slotRaw.includes('lunch') || slotRaw === 'l') {
      lunch = lunch ? `${lunch} · ${text}` : text
    } else if (
      slotRaw.includes('dinner') ||
      slotRaw.includes('supper') ||
      slotRaw === 'd'
    ) {
      dinner = dinner ? `${dinner} · ${text}` : text
    }
  }
  return { lunch, dinner }
}

/**
 * Explicit lunch + dinner → split rows. Otherwise one combined line (existing behavior).
 */
function extractDayMealDisplay(day: Record<string, unknown>): {
  split: boolean
  lunch: string | null
  dinner: string | null
  single: string | null
} {
  const tagged = taggedMealsFromArray(day)
  let lunch =
    stringFromMaybeNested(day.lunch) ??
    stringFromMaybeNested(day.lunchMenu) ??
    tagged.lunch
  let dinner =
    stringFromMaybeNested(day.dinner) ??
    stringFromMaybeNested(day.dinnerMenu) ??
    stringFromMaybeNested(day.main) ??
    tagged.dinner

  if (lunch && dinner) {
    return { split: true, lunch, dinner, single: null }
  }

  const single = mealLine(day)
  if (!single) {
    if (lunch) return { split: false, lunch: null, dinner: null, single: lunch }
    if (dinner) return { split: false, lunch: null, dinner: null, single: dinner }
    return { split: false, lunch: null, dinner: null, single: null }
  }

  return { split: false, lunch: null, dinner: null, single }
}

function resolveSlotIndex(day: Record<string, unknown>): number | null {
  const dateKeys = ['date', 'dayDate', 'isoDate', 'scheduledDate', 'menuDate']
  for (const k of dateKeys) {
    const raw = day[k]
    if (typeof raw === 'string' && raw.trim()) {
      try {
        const d = parseISO(raw.includes('T') ? raw : `${raw}T12:00:00`)
        if (!Number.isNaN(d.getTime())) return mondayIndexFromDate(d)
      } catch {
        /* ignore */
      }
    }
  }

  const dow = day.dayOfWeek ?? day.dow ?? day.weekdayIndex
  if (typeof dow === 'number' && Number.isInteger(dow) && dow >= 0 && dow <= 6) {
    return dow
  }

  const w =
    day.weekday ??
    day.dayName ??
    day.dayLabel ??
    day.label ??
    day.day
  if (typeof w === 'string' && w.trim()) {
    const key = w.trim().toLowerCase().replace(/\./g, '')
    if (key in WEEK_NAME_TO_INDEX) return WEEK_NAME_TO_INDEX[key]
    const three = key.slice(0, 3)
    if (three in WEEK_NAME_TO_INDEX) return WEEK_NAME_TO_INDEX[three]
  }

  return null
}

function unwrapMenuPayload(menu: unknown): unknown {
  if (!menu || typeof menu !== 'object' || Array.isArray(menu)) return menu
  const o = menu as Record<string, unknown>
  const inner = o.data ?? o.weekMenu ?? o.result
  if (inner !== null && typeof inner === 'object') return inner
  return menu
}

function extractDays(menu: unknown): Record<string, unknown>[] {
  const root = unwrapMenuPayload(menu)
  if (!root || typeof root !== 'object') return []
  if (Array.isArray(root)) {
    if (root.length && typeof root[0] === 'string') {
      return root.map((s) => ({ title: String(s) }))
    }
    return root.filter((d): d is Record<string, unknown> => d !== null && typeof d === 'object')
  }
  const o = root as Record<string, unknown>
  for (const key of ['days', 'week', 'menu', 'entries', 'meals'] as const) {
    const arr = o[key]
    if (Array.isArray(arr) && arr.length) {
      if (typeof arr[0] === 'string') {
        return arr.map((s) => ({ title: String(s) }))
      }
      const out = arr.filter((d): d is Record<string, unknown> => d !== null && typeof d === 'object')
      if (out.length) return out
    }
  }
  return []
}

/** Voteable rows from meals / items / recipes / slots (each row must have an id). */
function rowsFromMealsArray(day: Record<string, unknown>): VoteableLine[] {
  const arr = day.meals ?? day.items ?? day.recipes ?? day.slots
  if (!Array.isArray(arr)) return []
  const out: VoteableLine[] = []
  for (const m of arr) {
    if (m === null || typeof m !== 'object') continue
    const o = m as Record<string, unknown>
    const id = menuItemIdFrom(o)
    const label =
      stringFromMaybeNested(o.recipe ?? o.dish ?? o.meal ?? o) ??
      stringFromMaybeNested(o)
    if (!id || !label) continue
    const kind = mealKindFromSlot(o)
    out.push({ menuItemId: id, label, kind })
  }
  return out
}

/** Lunch/dinner as nested objects with ids (no array). */
function rowsFromTopLevelMealObjects(day: Record<string, unknown>): VoteableLine[] {
  const out: VoteableLine[] = []
  const pairs: [string, 'lunch' | 'dinner'][] = [
    ['lunch', 'lunch'],
    ['lunchMenu', 'lunch'],
    ['dinner', 'dinner'],
    ['dinnerMenu', 'dinner'],
    ['main', 'dinner'],
  ]
  for (const [key, kind] of pairs) {
    const v = day[key]
    if (!v || typeof v !== 'object' || Array.isArray(v)) continue
    const o = v as Record<string, unknown>
    const id = menuItemIdFrom(o)
    const label = stringFromMaybeNested(o)
    if (id && label) out.push({ menuItemId: id, label, kind })
  }
  return out
}

function dedupeVoteRows(rows: VoteableLine[]): VoteableLine[] {
  const seen = new Set<string>()
  const out: VoteableLine[] = []
  for (const r of rows) {
    if (seen.has(r.menuItemId)) continue
    seen.add(r.menuItemId)
    out.push(r)
  }
  return out
}

function collectVoteRowsForDay(day: Record<string, unknown>): VoteableLine[] {
  return dedupeVoteRows([
    ...rowsFromMealsArray(day),
    ...rowsFromTopLevelMealObjects(day),
  ])
}

function assignVoteRowsToWeekSlots(days: Record<string, unknown>[]): VoteableLine[][] {
  const accs: VoteableLine[][] = Array.from({ length: 7 }, () => [])
  const pending: VoteableLine[][] = []

  for (const day of days) {
    const rows = collectVoteRowsForDay(day)
    if (rows.length === 0) continue
    const idx = resolveSlotIndex(day)
    if (idx !== null && idx >= 0 && idx <= 6) {
      accs[idx].push(...rows)
    } else {
      pending.push(rows)
    }
  }

  let p = 0
  for (const rows of pending) {
    while (p < 7 && accs[p].length > 0) p++
    if (p >= 7) break
    accs[p].push(...rows)
    p++
  }

  return accs.map((cell) => dedupeVoteRows(cell))
}

type MealAcc = { lunches: string[]; dinners: string[]; others: string[] }

function emptyAcc(): MealAcc {
  return { lunches: [], dinners: [], others: [] }
}

function accFromDisplay(
  d: ReturnType<typeof extractDayMealDisplay>,
): MealAcc {
  if (d.split && d.lunch && d.dinner) {
    return { lunches: [d.lunch], dinners: [d.dinner], others: [] }
  }
  if (d.single) return { lunches: [], dinners: [], others: [d.single] }
  return emptyAcc()
}

function mergeAcc(a: MealAcc, b: MealAcc): MealAcc {
  return {
    lunches: [...a.lunches, ...b.lunches],
    dinners: [...a.dinners, ...b.dinners],
    others: [...a.others, ...b.others],
  }
}

type WeekSlotCell = {
  split: boolean
  lunch: string | null
  dinner: string | null
  single: string | null
}

function finalizeSlotCell(acc: MealAcc): WeekSlotCell {
  const lunch = acc.lunches.filter(Boolean).join(' · ') || null
  const dinner = acc.dinners.filter(Boolean).join(' · ') || null
  const other = acc.others.filter(Boolean).join(' · ') || null
  if (lunch && dinner) {
    return { split: true, lunch, dinner, single: null }
  }
  const single = [other, lunch || null, dinner || null].filter(Boolean).join(' · ') || null
  return { split: false, lunch: null, dinner: null, single }
}

function accIsEmpty(acc: MealAcc): boolean {
  return !acc.lunches.length && !acc.dinners.length && !acc.others.length
}

function assignMealsToWeekSlots(days: Record<string, unknown>[]): WeekSlotCell[] {
  const accs: MealAcc[] = Array.from({ length: 7 }, emptyAcc)
  const pending: { acc: MealAcc }[] = []

  for (const day of days) {
    const display = extractDayMealDisplay(day)
    const acc = accFromDisplay(display)
    if (accIsEmpty(acc)) continue
    const idx = resolveSlotIndex(day)
    if (idx !== null && idx >= 0 && idx <= 6) {
      accs[idx] = mergeAcc(accs[idx], acc)
    } else {
      pending.push({ acc })
    }
  }

  let p = 0
  for (const { acc } of pending) {
    while (p < 7 && !accIsEmpty(accs[p])) p++
    if (p >= 7) break
    accs[p] = mergeAcc(accs[p], acc)
    p++
  }

  return accs.map(finalizeSlotCell)
}

/** One weekday column: plain text fallback + voteable rows (meal ids preserved per row). */
type WeekColumn = {
  plain: WeekSlotCell
  voteRows: VoteableLine[]
}

const EMPTY_WEEK_CELL: WeekSlotCell = {
  split: false,
  lunch: null,
  dinner: null,
  single: null,
}

function buildWeekColumns(days: Record<string, unknown>[]): WeekColumn[] {
  const plainSlots = assignMealsToWeekSlots(days)
  const voteRowsByDay = assignVoteRowsToWeekSlots(days)
  return Array.from({ length: 7 }, (_, i) => ({
    plain: plainSlots[i] ?? EMPTY_WEEK_CELL,
    voteRows: voteRowsByDay[i] ?? [],
  }))
}

const slotPillClass =
  'w-full rounded border border-stone-600/70 bg-stone-900/50 px-1 py-0.5 text-left min-w-0 shadow-sm'

function VoteRow({
  label,
  menuItemId,
  showVotes,
  canVote,
  busy,
  hasVoted,
  onVote,
}: {
  label: string
  menuItemId: string
  /** When false, no ▲/▼ (e.g. no warrior selected). */
  showVotes: boolean
  canVote: boolean
  busy: boolean
  hasVoted: boolean
  onVote: (menuItemId: string, dir: 'up' | 'down') => void
}) {
  const btn =
    'shrink-0 self-stretch flex items-center justify-center w-5 min-h-[1.35rem] rounded text-xs text-stone-400 hover:text-amber-200 hover:bg-stone-700/70 disabled:opacity-25 disabled:pointer-events-none touch-manipulation leading-none'
  const labelBase =
    'flex-1 min-w-0 text-[11px] sm:text-xs text-stone-300 leading-snug break-words px-0.5'

  if (!showVotes) {
    return (
      <div className="flex items-center min-w-0 w-full">
        <span className={`${labelBase} text-left`}>{label}</span>
      </div>
    )
  }

  if (hasVoted) {
    return (
      <div className="flex items-center gap-0.5 min-w-0 w-full">
        <span className="w-5 shrink-0" aria-hidden />
        <span
          className="flex-1 min-w-0 text-center text-xs text-emerald-600/80 leading-none py-0.5"
          title="Already voted"
          aria-label="Already voted"
        >
          ✓
        </span>
        <span className="w-5 shrink-0" aria-hidden />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-0.5 min-w-0 w-full">
      <button
        type="button"
        className={btn}
        disabled={!canVote || busy}
        title="Vote up"
        aria-label="Vote up"
        onClick={() => onVote(menuItemId, 'up')}
      >
        ▲
      </button>
      <span className={`${labelBase} text-center`}>{label}</span>
      <button
        type="button"
        className={btn}
        disabled={!canVote || busy}
        title="Vote down"
        aria-label="Vote down"
        onClick={() => onVote(menuItemId, 'down')}
      >
        ▼
      </button>
    </div>
  )
}

function VoteRowsInCell({
  rows,
  showVotes,
  canVote,
  votingId,
  votedItems,
  onVote,
}: {
  rows: VoteableLine[]
  showVotes: boolean
  canVote: boolean
  votingId: string | null
  votedItems: Set<string>
  onVote: (menuItemId: string, dir: 'up' | 'down') => void
}) {
  const lunch = rows.filter((r) => r.kind === 'lunch')
  const dinner = rows.filter((r) => r.kind === 'dinner')
  const other = rows.filter((r) => !r.kind)
  const splitLayout =
    lunch.length > 0 && dinner.length > 0 && other.length === 0

  const renderRows = (list: VoteableLine[]) =>
    list.map((r) => (
      <VoteRow
        key={r.menuItemId}
        menuItemId={r.menuItemId}
        label={r.label}
        showVotes={showVotes}
        canVote={canVote}
        busy={votingId === r.menuItemId}
        hasVoted={votedItems.has(r.menuItemId)}
        onVote={onVote}
      />
    ))

  if (splitLayout) {
    return (
      <div className="flex flex-col gap-0.5 flex-1 min-w-0 min-h-[2.5rem]">
        <div className={slotPillClass}>
          <span className="block text-[8px] uppercase tracking-wide text-amber-600/80 leading-none mb-0.5">
            Lunch
          </span>
          <div className="flex flex-col gap-0.5">{renderRows(lunch)}</div>
        </div>
        <div className={slotPillClass}>
          <span className="block text-[8px] uppercase tracking-wide text-emerald-600/80 leading-none mb-0.5">
            Dinner
          </span>
          <div className="flex flex-col gap-0.5">{renderRows(dinner)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${slotPillClass} flex flex-col gap-0.5 flex-1 min-w-0`}>
      <div className="flex flex-col gap-1">{renderRows(rows)}</div>
    </div>
  )
}

function storageKeyForUser(memberId: string): string {
  return `menu-votes:${memberId}`
}

function loadVotedItems(memberId: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKeyForUser(memberId))
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? new Set<string>(arr) : new Set()
  } catch {
    return new Set()
  }
}

function saveVotedItems(memberId: string, items: Set<string>): void {
  try {
    localStorage.setItem(storageKeyForUser(memberId), JSON.stringify([...items]))
  } catch {
    /* ignore quota / SSR errors */
  }
}

export function WeekMenuStrip({ initialMenu, initialFetchFailed }: Props) {
  const { currentUser } = useCurrentUser()
  const [menu, setMenu] = useState<unknown | null>(initialMenu)
  const [fetchFailed, setFetchFailed] = useState(initialFetchFailed)
  const [refreshing, setRefreshing] = useState(false)
  const [votingId, setVotingId] = useState<string | null>(null)
  const [voteError, setVoteError] = useState<string | null>(null)
  const [votedItems, setVotedItems] = useState<Set<string>>(() => new Set())

  /** Logged-in family member, not admin overlay user. */
  const isRealWarrior = Boolean(currentUser && currentUser.id !== 'admin')
  const showVoteButtons = isRealWarrior
  const canSubmitVote = isRealWarrior

  /** Load per-user voted items from localStorage whenever the active user changes. */
  useEffect(() => {
    if (!currentUser || currentUser.id === 'admin') {
      setVotedItems(new Set())
      return
    }
    const memberId = menuPlannerFamilyMemberIdForUser(currentUser)
    setVotedItems(loadVotedItems(memberId))
  }, [currentUser])

  useEffect(() => {
    if (!voteError) return
    const t = setTimeout(() => setVoteError(null), 4000)
    return () => clearTimeout(t)
  }, [voteError])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/menu', { cache: 'no-store' })
      if (res.status === 503) {
        setMenu(null)
        setFetchFailed(false)
        return
      }
      if (!res.ok) {
        setMenu(null)
        setFetchFailed(true)
        return
      }
      setFetchFailed(false)
      setMenu(await res.json())
    } catch {
      setMenu(null)
      setFetchFailed(true)
    } finally {
      setRefreshing(false)
    }
  }, [])

  const submitVote = useCallback(
    async (menuItemId: string, vote: 'up' | 'down') => {
      if (!currentUser || currentUser.id === 'admin') return
      setVoteError(null)
      setVotingId(menuItemId)
      try {
        const res = await fetch('/api/menu-vote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            familyMemberId: menuPlannerFamilyMemberIdForUser(currentUser),
            menuItemId,
            vote,
          }),
        })
        if (res.ok) {
          const memberId = menuPlannerFamilyMemberIdForUser(currentUser)
          setVotedItems((prev) => {
            const next = new Set(prev)
            next.add(menuItemId)
            saveVotedItems(memberId, next)
            return next
          })
          await refresh()
          return
        }
        let message = `Vote failed (${res.status})`
        try {
          const err = await res.json()
          if (err && typeof err === 'object' && err !== null) {
            const o = err as { error?: unknown; message?: unknown }
            const e = o.error ?? o.message
            if (typeof e === 'string' && e.trim()) message = e.trim()
          }
        } catch {
          /* keep default */
        }
        setVoteError(message)
      } catch {
        setVoteError('Could not reach server')
      } finally {
        setVotingId(null)
      }
    },
    [currentUser, refresh],
  )

  useEffect(() => {
    const id = setInterval(refresh, 30 * 60_000)
    return () => clearInterval(id)
  }, [refresh])

  const days = extractDays(menu)
  const weekColumns = useMemo(() => buildWeekColumns(days), [days])

  if (!initialMenu && !initialFetchFailed && days.length === 0 && !fetchFailed) {
    return null
  }

  const hasAnyMeal = weekColumns.some(
    (c) => c.plain.split || c.plain.single || c.voteRows.length > 0,
  )
  const hasVoteableRows = weekColumns.some((c) => c.voteRows.length > 0)

  return (
    <div className="w-full border-t border-stone-800 bg-stone-900/55 px-2 py-2 shrink-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-emerald-500/90 text-sm font-medieval tracking-wider">🍲 Week menu</span>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            title="Refresh menu"
            className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-stone-500 hover:text-stone-300 hover:bg-stone-700/60 transition-colors text-xs disabled:opacity-40"
          >
            <span className={refreshing ? 'animate-spin inline-block' : ''}>↺</span>
          </button>
        </div>
        {hasVoteableRows && !isRealWarrior && (
          <span className="text-xs text-stone-500 italic">Select a warrior to vote.</span>
        )}
      </div>

      {voteError && (
        <p className="text-amber-600/90 text-[10px] px-1 pb-1 font-medieval" role="alert">
          {voteError}
        </p>
      )}

      {fetchFailed && (
        <p className="text-stone-500 text-xs italic px-1 pb-1">Menu unavailable.</p>
      )}

      {!fetchFailed && !hasAnyMeal && (
        <p className="text-stone-600 text-xs italic px-1 pb-1">No dishes listed this week.</p>
      )}

      {!fetchFailed && hasAnyMeal && (
        <div className="grid grid-cols-7 gap-1 w-full min-w-0">
          {WEEKDAY_SHORT.map((label, i) => {
            const { plain: cell, voteRows } = weekColumns[i]
            return (
              <div
                key={label}
                className="min-w-0 flex flex-col rounded-md border border-stone-700/80 bg-stone-800/60 px-1.5 py-1.5"
              >
                <span className="text-emerald-600/90 font-medieval font-bold text-xs uppercase tracking-wide border-b border-stone-700/50 pb-0.5 mb-1 shrink-0">
                  {label}
                </span>
                {voteRows.length > 0 ? (
                  <VoteRowsInCell
                    rows={voteRows}
                    showVotes={showVoteButtons}
                    canVote={canSubmitVote}
                    votingId={votingId}
                    votedItems={votedItems}
                    onVote={submitVote}
                  />
                ) : cell.split && cell.lunch && cell.dinner ? (
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0 min-h-[2.5rem]">
                    <div className={slotPillClass} title={cell.lunch}>
                      <span className="block text-[8px] uppercase tracking-wide text-amber-600/80 leading-none mb-0.5">
                        Lunch
                      </span>
                      <span className="block text-[11px] sm:text-xs text-stone-300 leading-snug break-words line-clamp-3">
                        {cell.lunch}
                      </span>
                    </div>
                    <div className={slotPillClass} title={cell.dinner}>
                      <span className="block text-[8px] uppercase tracking-wide text-emerald-600/80 leading-none mb-0.5">
                        Dinner
                      </span>
                      <span className="block text-[11px] sm:text-xs text-stone-300 leading-snug break-words line-clamp-3">
                        {cell.dinner}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p
                    className="text-[11px] sm:text-xs text-stone-300 leading-snug break-words flex-1 min-h-[2rem]"
                    title={cell.single ?? undefined}
                  >
                    {cell.single ?? '—'}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
