import { NextResponse } from 'next/server'
import { getWeekMenuForApiWeekStart } from '@/lib/menu-planner'

export const revalidate = 300

function ymdInTz(tz: string, d: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  const y = get('year')
  const m = get('month')
  const day = get('day')
  return `${y}-${m}-${day}`
}

function mondayYmdForNowInTz(tz: string): string {
  // Stable UTC date for the target calendar day (noon avoids DST edges).
  const todayYmd = ymdInTz(tz, new Date())
  const [yy, mm, dd] = todayYmd.split('-').map((v) => parseInt(v, 10))
  const pseudo = new Date(Date.UTC(yy, (mm ?? 1) - 1, dd ?? 1, 12, 0, 0))
  const weekday = pseudo.getUTCDay() // 0=Sun..6=Sat for that calendar day
  const mondayIndex = (weekday + 6) % 7
  pseudo.setUTCDate(pseudo.getUTCDate() - mondayIndex)
  const y = pseudo.getUTCFullYear()
  const m = String(pseudo.getUTCMonth() + 1).padStart(2, '0')
  const d = String(pseudo.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDaysYmd(ymd: string, deltaDays: number): string {
  const [yy, mm, dd] = ymd.split('-').map((v) => parseInt(v, 10))
  const d = new Date(Date.UTC(yy, (mm ?? 1) - 1, dd ?? 1, 12, 0, 0))
  d.setUTCDate(d.getUTCDate() + deltaDays)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function weekStartFromMenuPayload(menu: unknown): string | null {
  if (!menu || typeof menu !== 'object' || Array.isArray(menu)) return null
  const o = menu as Record<string, unknown>
  const direct = o.weekStart
  if (typeof direct === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(direct)) return direct

  const days = o.days
  if (Array.isArray(days)) {
    let best: string | null = null
    for (const d of days) {
      if (!d || typeof d !== 'object' || Array.isArray(d)) continue
      const day = d as Record<string, unknown>
      const raw = day.date
      if (typeof raw !== 'string') continue
      const ymd = raw.includes('T') ? raw.slice(0, 10) : raw.slice(0, 10)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) continue
      if (best === null || ymd < best) best = ymd
    }
    return best
  }
  return null
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const tz = url.searchParams.get('tz')?.trim() || 'America/Chicago'
  const requestedWeekStart = url.searchParams.get('weekStart')?.trim() ?? null
  const desiredWeekStart =
    requestedWeekStart && /^\d{4}-\d{2}-\d{2}$/.test(requestedWeekStart)
      ? requestedWeekStart
      : mondayYmdForNowInTz(tz)

  let result = await getWeekMenuForApiWeekStart(desiredWeekStart)

  if (!result.configured) {
    return NextResponse.json(
      { error: 'Menu planner is not configured' },
      { status: 503 },
    )
  }

  if (result.ok) {
    let upstreamWeekStart = weekStartFromMenuPayload(result.data) ?? desiredWeekStart

    // If upstream ignores requested weekStart and flips early, retry previous week.
    if (upstreamWeekStart > desiredWeekStart) {
      // Then try fetching the previous week as a fallback.
      const prevWeekStart = addDaysYmd(desiredWeekStart, -7)
      const prev = await getWeekMenuForApiWeekStart(prevWeekStart)
      if (prev.configured && prev.ok) {
        result = prev
        upstreamWeekStart = weekStartFromMenuPayload(prev.data) ?? prevWeekStart
      }
    }

    return NextResponse.json(result.data ?? null)
  }

  const body =
    result.body !== null && typeof result.body === 'object'
      ? (result.body as Record<string, unknown>)
      : { error: String(result.body) }

  return NextResponse.json(body, { status: result.status })
}
