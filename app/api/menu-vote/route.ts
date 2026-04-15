import { NextRequest, NextResponse } from 'next/server'
import { postMenuVote } from '@/lib/menu-planner'

function isValidVote(v: unknown): v is string | number | boolean {
  if (v === null || v === undefined) return false
  if (typeof v === 'boolean') return true
  if (typeof v === 'number') return Number.isFinite(v)
  if (typeof v === 'string') return v.trim().length > 0
  return false
}

export async function POST(req: NextRequest) {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 })
  }

  const o = raw as Record<string, unknown>
  const familyMemberId =
    typeof o.familyMemberId === 'string' ? o.familyMemberId.trim() : ''
  const menuItemId = typeof o.menuItemId === 'string' ? o.menuItemId.trim() : ''
  const vote = o.vote

  if (!familyMemberId || !menuItemId) {
    return NextResponse.json(
      { error: 'Missing or invalid familyMemberId or menuItemId' },
      { status: 400 },
    )
  }

  if (!isValidVote(vote)) {
    return NextResponse.json({ error: 'Missing or invalid vote' }, { status: 400 })
  }

  const votePayload = typeof vote === 'string' ? vote.trim() : vote

  const result = await postMenuVote({
    familyMemberId,
    menuItemId,
    vote: votePayload,
  })

  if (!result.configured) {
    return NextResponse.json(
      { error: 'Menu planner is not configured' },
      { status: 503 },
    )
  }

  if (result.ok) {
    if (result.status === 204 || result.data === null || result.data === undefined) {
      return new NextResponse(null, { status: result.status })
    }
    return NextResponse.json(result.data, { status: result.status })
  }

  const errBody =
    result.body !== null && typeof result.body === 'object'
      ? (result.body as Record<string, unknown>)
      : { error: String(result.body) }

  return NextResponse.json(errBody, { status: result.status })
}
