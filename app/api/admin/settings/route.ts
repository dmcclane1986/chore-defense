import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const body = await req.json() as { war_timezone?: string }

  const updates: Record<string, unknown> = {}
  if (body.war_timezone) updates.war_timezone = body.war_timezone

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  const { error } = await supabase
    .from('game_state')
    .update(updates)
    .eq('id', 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
