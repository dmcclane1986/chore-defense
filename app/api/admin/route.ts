import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

/** GET: check if admin password is set */
export async function GET() {
  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('admin_config')
    .select('password_hash')
    .eq('id', 1)
    .single()
  return NextResponse.json({ isSet: !!data?.password_hash })
}

/** POST: set password (first time) or verify password */
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const { action, password } = await req.json() as {
    action: 'set' | 'verify'
    password: string
  }

  const { data: cfg } = await supabase
    .from('admin_config')
    .select('password_hash')
    .eq('id', 1)
    .single()

  if (action === 'set') {
    if (cfg?.password_hash) {
      return NextResponse.json({ error: 'Password already set' }, { status: 409 })
    }
    // Store as plain text with a simple marker — fine for a home kiosk
    // Use btoa so it isn't immediately visible in the DB
    const stored = Buffer.from(password).toString('base64')
    await supabase
      .from('admin_config')
      .update({ password_hash: stored })
      .eq('id', 1)
    return NextResponse.json({ ok: true })
  }

  if (action === 'verify') {
    if (!cfg?.password_hash) {
      return NextResponse.json({ error: 'No password set' }, { status: 400 })
    }
    const stored = Buffer.from(password).toString('base64')
    const match = stored === cfg.password_hash
    return NextResponse.json({ ok: match })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
