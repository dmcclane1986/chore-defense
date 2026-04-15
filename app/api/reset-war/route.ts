import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(_req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.rpc('weekly_war_reset')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, result: data })
}
