import { NextResponse } from 'next/server'
import { getWeekMenuForApi } from '@/lib/menu-planner'

export const revalidate = 300

export async function GET() {
  const result = await getWeekMenuForApi()

  if (!result.configured) {
    return NextResponse.json(
      { error: 'Menu planner is not configured' },
      { status: 503 },
    )
  }

  if (result.ok) {
    return NextResponse.json(result.data ?? null)
  }

  const body =
    result.body !== null && typeof result.body === 'object'
      ? (result.body as Record<string, unknown>)
      : { error: String(result.body) }

  return NextResponse.json(body, { status: result.status })
}
