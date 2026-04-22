import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { resolveAction, isVictoryLap, applyVictoryLapGold } from '@/lib/combat'

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()

  const body = await req.json()
  const { bountyId, familyMemberId, familyMemberName, action } = body as {
    bountyId: string
    familyMemberId: string
    familyMemberName: string
    action: 'attack' | 'heal'
  }

  if (!bountyId || !familyMemberId || !action) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const [bountyRes, memberRes, factionsRes] = await Promise.all([
    supabase.from('bounties').select('*').eq('id', bountyId).single(),
    supabase.from('family_members').select('*').eq('id', familyMemberId).single(),
    supabase.from('factions').select('*'),
  ])

  if (!bountyRes.data) return NextResponse.json({ error: 'Bounty not found' }, { status: 404 })
  if (!memberRes.data) return NextResponse.json({ error: 'Family member not found' }, { status: 404 })

  const bounty = bountyRes.data
  const isConstant = bounty.frequency === 'constant'
  if (!isConstant && bounty.is_completed) {
    return NextResponse.json({ error: 'Bounty already completed' }, { status: 409 })
  }
  const member = memberRes.data
  const factions = factionsRes.data ?? []
  const myFaction = factions.find((f) => f.slug === member.faction_slug)
  const oppFaction = factions.find((f) => f.slug !== member.faction_slug)

  if (!myFaction || !oppFaction) {
    return NextResponse.json({ error: 'Factions not configured' }, { status: 500 })
  }

  const { finalValue, isCrit, isDesperation } = resolveAction(
    bounty.power,
    myFaction.current_hp,
    myFaction.max_hp
  )

  const inVictoryLap = isVictoryLap(oppFaction.current_hp)
  let goldAwarded = applyVictoryLapGold(bounty.gold_reward, inVictoryLap)
  if (bounty.quest_type === 'Guild' && bounty.guild_double_gold) {
    goldAwarded = bounty.gold_reward * 2
  }

  let newTargetHp: number | null = null
  let conquerorBonus = false

  if (action === 'attack') {
    newTargetHp = Math.max(0, oppFaction.current_hp - finalValue)
    await supabase.from('factions').update({ current_hp: newTargetHp }).eq('id', oppFaction.id)

    if (newTargetHp === 0) {
      const { data: gs } = await supabase
        .from('game_state').select('conqueror_bonus_awarded').eq('id', 1).single()
      if (!gs?.conqueror_bonus_awarded) {
        conquerorBonus = true
        await supabase.from('game_state').update({ conqueror_bonus_awarded: true }).eq('id', 1)
      }
    }
  } else {
    newTargetHp = Math.min(myFaction.max_hp, myFaction.current_hp + finalValue)
    await supabase.from('factions').update({ current_hp: newTargetHp }).eq('id', myFaction.id)
  }

  // Award gold + XP to the family member
  await supabase.from('family_members').update({
    gold: member.gold + goldAwarded,
    xp: member.xp + bounty.xp_reward,
  }).eq('id', familyMemberId)

  // Constant chores stay on the board; others are marked complete once.
  if (isConstant) {
    await supabase
      .from('bounties')
      .update({ is_completed: false, completed_by: null })
      .eq('id', bountyId)
  } else {
    await supabase.from('bounties').update({ is_completed: true }).eq('id', bountyId)
  }

  // Update game state
  await supabase.from('game_state')
    .update({ last_chore_completed_at: new Date().toISOString() })
    .eq('id', 1)

  // Insert combat log
  await supabase.from('combat_log').insert({
    family_member_id: familyMemberId === 'admin' ? null : familyMemberId,
    family_member_name: familyMemberName,
    actor_faction_id: myFaction.id,
    target_faction_id: action === 'attack' ? oppFaction.id : myFaction.id,
    bounty_id: bountyId,
    bounty_title: bounty.title,
    action,
    base_value: bounty.power,
    final_value: finalValue,
    is_crit: isCrit,
    is_desperation: isDesperation,
  })

  return NextResponse.json({
    ok: true,
    action,
    baseValue: bounty.power,
    finalValue,
    isCrit,
    isDesperation,
    goldAwarded,
    xpAwarded: bounty.xp_reward,
    conquerorBonus,
    newHp: newTargetHp,
  })
}
