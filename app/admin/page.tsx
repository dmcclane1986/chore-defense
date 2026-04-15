import { getSupabaseAdmin } from '@/lib/supabase-server'
import { AdminPanel } from './AdminPanel'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = getSupabaseAdmin()
  const [bountiesRes, factionsRes, marketItemsRes, combatLogRes, gameStateRes] = await Promise.all([
    supabase.from('bounties').select('*').order('created_at', { ascending: false }),
    supabase.from('factions').select('*'),
    supabase.from('market_catalog').select('*').order('venue').order('display_name'),
    supabase
      .from('combat_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('game_state').select('war_timezone').eq('id', 1).single(),
  ])

  return (
    <AdminPanel
      bounties={bountiesRes.data ?? []}
      factions={factionsRes.data ?? []}
      marketItems={marketItemsRes.data ?? []}
      combatLog={combatLogRes.data ?? []}
      timezone={gameStateRes.data?.war_timezone ?? 'America/Chicago'}
    />
  )
}
