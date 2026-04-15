import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const { itemKey, familyMemberId } = await req.json() as {
    itemKey: string
    familyMemberId: string
  }

  if (!itemKey || !familyMemberId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const [itemRes, memberRes, marketRes] = await Promise.all([
    supabase.from('market_catalog').select('*').eq('item_key', itemKey).single(),
    supabase.from('family_members').select('*').eq('id', familyMemberId).single(),
    supabase.from('market_state').select('*').eq('id', 1).single(),
  ])

  if (!itemRes.data) return NextResponse.json({ error: 'Unknown item' }, { status: 404 })
  if (!memberRes.data) return NextResponse.json({ error: 'Member not found' }, { status: 404 })

  const item = itemRes.data
  const member = memberRes.data
  const ms = marketRes.data

  if (member.gold < item.price_gold) {
    return NextResponse.json({ error: 'Not enough gold' }, { status: 402 })
  }

  const now = new Date()
  if (item.venue === 'black_market') {
    const open = ms?.black_is_active && ms.black_closes_at && new Date(ms.black_closes_at) > now
    if (!open) return NextResponse.json({ error: 'Black Market is closed' }, { status: 403 })
  }
  if (item.venue === 'traveling_merchant') {
    const open = ms?.traveling_is_active && ms.traveling_closes_at && new Date(ms.traveling_closes_at) > now
    if (!open) return NextResponse.json({ error: 'Traveling Merchant has departed' }, { status: 403 })
  }

  if (item.venue === 'spoils_teens' || item.venue === 'spoils_parents') {
    const { data: factions } = await supabase.from('factions').select('*')
    const parentsF = factions?.find((f) => f.slug === 'parents')
    const teensF = factions?.find((f) => f.slug === 'teens')
    if (!parentsF || !teensF) {
      return NextResponse.json({ error: 'Factions not configured' }, { status: 500 })
    }
    if (item.venue === 'spoils_teens') {
      if (member.faction_slug !== 'teens') {
        return NextResponse.json({ error: 'This spoils pile is for the Teens faction' }, { status: 403 })
      }
      if (parentsF.current_hp > 0 || teensF.current_hp <= 0) {
        return NextResponse.json({ error: 'Victory spoils are not available now' }, { status: 403 })
      }
    }
    if (item.venue === 'spoils_parents') {
      if (member.faction_slug !== 'parents') {
        return NextResponse.json({ error: 'This spoils pile is for the Parents faction' }, { status: 403 })
      }
      if (teensF.current_hp > 0 || parentsF.current_hp <= 0) {
        return NextResponse.json({ error: 'Victory spoils are not available now' }, { status: 403 })
      }
    }
  }

  const effect = item.effect as Record<string, unknown>

  await supabase.from('family_members')
    .update({ gold: member.gold - item.price_gold })
    .eq('id', familyMemberId)

  if (effect.type === 'instant_repair_pct') {
    const { data: faction } = await supabase
      .from('factions').select('*').eq('slug', member.faction_slug).single()
    if (faction) {
      const healAmt = faction.max_hp * ((effect.percent as number ?? 25) / 100)
      await supabase.from('factions')
        .update({ current_hp: Math.min(faction.max_hp, faction.current_hp + healAmt) })
        .eq('id', faction.id)
    }
  }

  // Send Discord notification for items flagged with "notify": true
  if (effect.notify === true && process.env.DISCORD_WEBHOOK_URL) {
    const venueLabels: Record<string, string> = {
      general: '🏪 General Store',
      parents_store: "🛡️ Parents' Store",
      black_market: '🕵️ Black Market',
      traveling_merchant: '🐪 Traveling Merchant',
      spoils_teens: '👑 Fallen Crown Spoils',
      spoils_parents: '🔓 Rebel Vault Spoils',
    }
    await fetch(process.env.DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: '🛒 Purchase — Action Required',
          color: 0xf59e0b,
          fields: [
            { name: 'Who',  value: member.name,              inline: true },
            { name: 'Item', value: item.display_name,        inline: true },
            { name: 'Cost', value: `${item.price_gold}g`,    inline: true },
            { name: 'From', value: venueLabels[item.venue] ?? item.venue, inline: true },
          ],
          footer: { text: 'Fulfill this reward and react ✅ when done' },
          timestamp: new Date().toISOString(),
        }],
      }),
    }).catch(() => { /* don't let a notification failure break the purchase */ })
  }

  return NextResponse.json({ ok: true, spent: item.price_gold })
}
