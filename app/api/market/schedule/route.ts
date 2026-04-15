import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/** Admin-only: schedule the Black Market (10hr) or Traveling Merchant (2hr) windows */
export async function POST(req: NextRequest) {
  const { venue } = await req.json() as { venue: 'black_market' | 'traveling_merchant' }
  const supabase = getSupabaseAdmin()

  const now = Date.now()
  const opensAt = new Date(now).toISOString()
  const durationMs = venue === 'black_market' ? 10 * 3600_000 : 2 * 3600_000
  const closesAt = new Date(now + durationMs).toISOString()

  if (venue === 'black_market') {
    await supabase.from('market_state').update({
      black_is_active: true,
      black_opens_at: opensAt,
      black_closes_at: closesAt,
    }).eq('id', 1)
  } else {
    await supabase.from('market_state').update({
      traveling_is_active: true,
      traveling_opens_at: opensAt,
      traveling_closes_at: closesAt,
    }).eq('id', 1)
  }

  return NextResponse.json({ ok: true, opensAt, closesAt })
}
