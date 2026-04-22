import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import type { Bounty, BountyFrequency } from '@/types'

function adminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  )
}

function parseFiniteNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function supabaseErrPayload(err: { message: string; code?: string; details?: string; hint?: string }) {
  return {
    error: err.message,
    code: err.code,
    details: err.details,
    hint: err.hint,
  }
}

const FREQUENCIES: BountyFrequency[] = [
  'constant',
  'daily',
  'weekly',
  'semi_weekly',
  'bi_weekly',
]

function isFrequency(v: unknown): v is BountyFrequency {
  return typeof v === 'string' && (FREQUENCIES as string[]).includes(v)
}

function isQuestType(v: unknown): v is Bounty['quest_type'] {
  return v === 'Strike' || v === 'Fortify' || v === 'Guild'
}

export async function GET() {
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: 'Server misconfigured: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing' },
      { status: 500 },
    )
  }
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('bounties')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json(supabaseErrPayload(error), { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: 'Server misconfigured: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing' },
      { status: 500 },
    )
  }
  const supabase = getSupabaseAdmin()
  const body = (await req.json()) as Record<string, unknown>

  const title = typeof body.title === 'string' ? body.title.trim() : ''
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const frequency = isFrequency(body.frequency) ? body.frequency : 'daily'
  const quest_type = isQuestType(body.quest_type) ? body.quest_type : 'Strike'
  const description =
    typeof body.description === 'string' && body.description.trim() === ''
      ? null
      : typeof body.description === 'string'
        ? body.description
        : null
  const gold_reward = parseFiniteNumber(body.gold_reward) ?? 0
  const xp_reward = parseFiniteNumber(body.xp_reward) ?? 0
  const powerRaw = parseFiniteNumber(body.power)
  const power = powerRaw !== undefined && powerRaw >= 1 ? Math.trunc(powerRaw) : 10
  const guild_double_gold = Boolean(body.guild_double_gold)

  const { data, error } = await supabase
    .from('bounties')
    .insert({
      title,
      description,
      frequency,
      gold_reward: Math.trunc(gold_reward),
      xp_reward: Math.trunc(xp_reward),
      quest_type,
      power,
      guild_double_gold,
      is_completed: false,
    })
    .select()

  if (error) return NextResponse.json(supabaseErrPayload(error), { status: 500 })
  const inserted = data?.[0]
  if (!inserted) {
    return NextResponse.json({ error: 'Insert returned no row' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, bounty: inserted })
}

export async function PATCH(req: NextRequest) {
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: 'Server misconfigured: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing' },
      { status: 500 },
    )
  }
  const supabase = getSupabaseAdmin()
  const body = (await req.json()) as Record<string, unknown>
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const row: Record<string, unknown> = {}

  if (typeof body.title === 'string') {
    const t = body.title.trim()
    if (!t) {
      return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
    }
    row.title = t
  }
  if ('description' in body) {
    row.description =
      typeof body.description === 'string' && body.description.trim() === ''
        ? null
        : typeof body.description === 'string'
          ? body.description
          : null
  }
  if (isFrequency(body.frequency)) row.frequency = body.frequency
  const gr = parseFiniteNumber(body.gold_reward)
  if (gr !== undefined && gr >= 0) row.gold_reward = Math.trunc(gr)
  const xr = parseFiniteNumber(body.xp_reward)
  if (xr !== undefined && xr >= 0) row.xp_reward = Math.trunc(xr)
  if (isQuestType(body.quest_type)) row.quest_type = body.quest_type
  const pr = parseFiniteNumber(body.power)
  if (pr !== undefined && pr >= 1) row.power = Math.trunc(pr)
  if (typeof body.guild_double_gold === 'boolean') row.guild_double_gold = body.guild_double_gold

  if (Object.keys(row).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase.from('bounties').update(row).eq('id', id).select()

  if (error) return NextResponse.json(supabaseErrPayload(error), { status: 500 })
  const updated = data?.[0]
  if (!updated) {
    return NextResponse.json(
      {
        error:
          'No chore was updated. The id may not exist, or Postgres rejected the values (e.g. frequency not allowed by a DB check constraint).',
      },
      { status: 404 },
    )
  }
  return NextResponse.json({ ok: true, bounty: updated })
}

export async function DELETE(req: NextRequest) {
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: 'Server misconfigured: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing' },
      { status: 500 },
    )
  }
  const supabase = getSupabaseAdmin()
  const { id } = (await req.json()) as { id?: string }
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const { error } = await supabase.from('bounties').delete().eq('id', id)
  if (error) return NextResponse.json(supabaseErrPayload(error), { status: 500 })
  return NextResponse.json({ ok: true })
}
