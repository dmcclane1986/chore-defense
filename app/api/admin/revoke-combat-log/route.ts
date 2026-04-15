import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const { logId } = (await req.json()) as { logId: string }

  if (!logId) {
    return NextResponse.json({ error: 'Missing logId' }, { status: 400 })
  }

  // 1. Fetch the log entry
  const { data: entry, error: entryErr } = await supabase
    .from('combat_log')
    .select('*')
    .eq('id', logId)
    .single()

  if (entryErr || !entry) {
    return NextResponse.json({ error: 'Log entry not found' }, { status: 404 })
  }

  // 2. Fetch bounty for gold/xp amounts (may be null for encounter-type entries)
  let goldReward = 0
  let xpReward = 0
  if (entry.bounty_id) {
    const { data: bounty } = await supabase
      .from('bounties')
      .select('gold_reward, xp_reward, guild_double_gold, quest_type')
      .eq('id', entry.bounty_id)
      .single()
    if (bounty) {
      goldReward = bounty.gold_reward
      xpReward = bounty.xp_reward
    }
  }

  // 3. Subtract gold + XP from family member
  if (entry.family_member_id) {
    const { data: member } = await supabase
      .from('family_members')
      .select('gold, xp')
      .eq('id', entry.family_member_id)
      .single()
    if (member) {
      await supabase
        .from('family_members')
        .update({
          gold: Math.max(0, member.gold - goldReward),
          xp: Math.max(0, member.xp - xpReward),
        })
        .eq('id', entry.family_member_id)
    }
  }

  // 4. Revert faction HP
  const factionId =
    entry.action === 'attack' ? entry.target_faction_id : entry.actor_faction_id

  if (factionId) {
    const { data: faction } = await supabase
      .from('factions')
      .select('current_hp, max_hp')
      .eq('id', factionId)
      .single()
    if (faction) {
      let revertedHp: number
      if (entry.action === 'attack') {
        // HP was reduced — restore it
        revertedHp = Math.min(faction.max_hp, faction.current_hp + entry.final_value)
      } else {
        // HP was increased — reduce it back
        revertedHp = Math.max(0, faction.current_hp - entry.final_value)
      }
      await supabase
        .from('factions')
        .update({ current_hp: revertedHp })
        .eq('id', factionId)
    }
  }

  // 5. Un-complete the bounty
  if (entry.bounty_id) {
    await supabase
      .from('bounties')
      .update({ is_completed: false, completed_by: null })
      .eq('id', entry.bounty_id)
  }

  // 6. Delete the combat log entry
  await supabase.from('combat_log').delete().eq('id', logId)

  return NextResponse.json({ ok: true })
}
