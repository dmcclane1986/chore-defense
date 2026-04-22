import { getSupabaseAdmin } from '@/lib/supabase-server'
import { getCalendarEvents } from '@/lib/calendar'
import { getWeekMenuForPage } from '@/lib/menu-planner'
import { Dashboard } from '@/components/Dashboard'
import { UserProvider } from '@/contexts/UserContext'
import type { Faction, FamilyMember, Bounty, CombatLogEntry, MarketItem, MarketState } from '@/types'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const supabase = getSupabaseAdmin()

  const [
    factionsRes,
    membersRes,
    bountiesRes,
    logRes,
    marketItemsRes,
    marketStateRes,
    gameStateRes,
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
    supabase.from('game_state').select('conqueror_bonus_awarded, war_timezone').eq('id', 1).single(),
    getCalendarEvents(),
    getWeekMenuForPage(),
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
