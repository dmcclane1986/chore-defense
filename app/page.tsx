import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getCalendarEvents } from '@/lib/calendar'
import { getWeekMenuForPageWeekStart } from '@/lib/menu-planner'
import { Dashboard } from '@/components/Dashboard'
import { UserProvider } from '@/contexts/UserContext'
import type { Faction, FamilyMember, Bounty, CombatLogEntry, MarketItem, MarketState } from '@/types'

export const dynamic = 'force-dynamic'

function ymdInTz(tz: string, d: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}-${get('month')}-${get('day')}`
}

function mondayYmdForNowInTz(tz: string): string {
  const todayYmd = ymdInTz(tz, new Date())
  const [yy, mm, dd] = todayYmd.split('-').map((v) => parseInt(v, 10))
  const pseudo = new Date(Date.UTC(yy, (mm ?? 1) - 1, dd ?? 1, 12, 0, 0))
  const weekday = pseudo.getUTCDay()
  const mondayIndex = (weekday + 6) % 7
  pseudo.setUTCDate(pseudo.getUTCDate() - mondayIndex)
  const y = pseudo.getUTCFullYear()
  const m = String(pseudo.getUTCMonth() + 1).padStart(2, '0')
  const d = String(pseudo.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default async function Home() {
  const supabase = getSupabaseAdmin()

  const gameStateRes = await supabase
    .from('game_state')
    .select('conqueror_bonus_awarded, war_timezone')
    .eq('id', 1)
    .single()

  const timezone = gameStateRes.data?.war_timezone ?? 'America/Chicago'
  const desiredWeekStart = mondayYmdForNowInTz(timezone)

  const [
    factionsRes,
    membersRes,
    bountiesRes,
    logRes,
    marketItemsRes,
    marketStateRes,
    calendarEvents,
    weekMenuState,
  ] = await Promise.all([
    supabase.from('factions').select('*').order('slug'),
    supabase.from('family_members').select('*').order('name'),
    supabase
      .from('bounties')
      .select('*')
      .or('is_completed.eq.false,frequency.eq.constant')
      .order('created_at'),
    supabase.from('combat_log').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('market_catalog').select('*').order('price_gold'),
    supabase.from('market_state').select('*').eq('id', 1).single(),
    getCalendarEvents(),
    getWeekMenuForPageWeekStart(desiredWeekStart),
  ])

  const members = (membersRes.data ?? []) as FamilyMember[]
  const { menu: weekMenu, menuFetchFailed: weekMenuFetchFailed } = weekMenuState
  /** Single clock for bounty rotation so SSR + all clients agree (avoids hydration failures). */
  const boardTimeMs = Date.now()

  return (
    <UserProvider members={members}>
      <Dashboard
        boardTimeMs={boardTimeMs}
        initialFactions={(factionsRes.data ?? []) as Faction[]}
        members={members}
        bounties={(bountiesRes.data ?? []) as Bounty[]}
        initialLog={(logRes.data ?? []) as CombatLogEntry[]}
        marketItems={(marketItemsRes.data ?? []) as MarketItem[]}
        initialMarketState={(marketStateRes.data ?? null) as MarketState | null}
        calendarEvents={calendarEvents}
        gameState={gameStateRes.data ?? null}
        weekMenu={weekMenu}
        weekMenuFetchFailed={weekMenuFetchFailed}
      />
    </UserProvider>
  )
}
