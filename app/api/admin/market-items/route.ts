import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('market_catalog')
    .select('*')
    .order('venue')
    .order('display_name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const body = await req.json()
  const { item_key, display_name, description, venue, price_gold, effect, available_days } = body as {
    item_key: string
    display_name: string
    description?: string
    venue:
      | 'general'
      | 'black_market'
      | 'traveling_merchant'
      | 'parents_store'
      | 'spoils_teens'
      | 'spoils_parents'
    price_gold: number
    effect: Record<string, unknown>
    available_days?: string[] | null
  }

  if (!item_key || !display_name || !venue) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('market_catalog')
    .insert({ item_key, display_name, description, venue, price_gold, effect, available_days: available_days ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, item: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const body = await req.json()
  const { id, ...updates } = body as {
    id: string
    display_name?: string
    description?: string
    venue?:
      | 'general'
      | 'black_market'
      | 'traveling_merchant'
      | 'parents_store'
      | 'spoils_teens'
      | 'spoils_parents'
    price_gold?: number
    effect?: Record<string, unknown>
    available_days?: string[] | null
  }

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { data, error } = await supabase
    .from('market_catalog')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, item: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  const { id } = (await req.json()) as { id: string }

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase.from('market_catalog').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
