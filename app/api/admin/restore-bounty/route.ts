import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const { bountyId } = (await req.json()) as { bountyId: string }

  if (!bountyId) {
    return NextResponse.json({ error: 'Missing bountyId' }, { status: 400 })
  }

  const { error } = await supabase
    .from('bounties')
    .update({ is_completed: false, completed_by: null })
    .eq('id', bountyId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
