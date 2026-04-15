import { NextResponse } from 'next/server'
import { auth as googleAuth, calendar } from '@googleapis/calendar'

export async function GET() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? ''
  const calId = process.env.GOOGLE_CALENDAR_ID ?? ''

  let parseError: string | null = null
  let parsed: Record<string, unknown> | null = null
  try {
    parsed = JSON.parse(raw)
  } catch (err: unknown) {
    parseError = String(err)
  }

  // Try a live API call
  let apiResult: unknown = null
  let apiError: string | null = null
  if (parsed && calId) {
    try {
      const auth = new googleAuth.GoogleAuth({
        credentials: parsed,
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      })
      const cal = calendar({ version: 'v3', auth })
      const now = new Date()
      const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const res = await cal.events.list({
        calendarId: calId,
        timeMin: now.toISOString(),
        timeMax: future.toISOString(),
        maxResults: 5,
        singleEvents: true,
        orderBy: 'startTime',
      })
      apiResult = {
        status: res.status,
        itemCount: res.data.items?.length ?? 0,
        items: res.data.items?.map((ev) => ({ summary: ev.summary, start: ev.start })) ?? [],
      }
    } catch (err: unknown) {
      apiError = err instanceof Error ? err.message : String(err)
    }
  }

  return NextResponse.json({
    calendarIdSet: !!calId,
    calendarId: calId || null,
    rawLength: raw.length,
    parseOk: !!parsed,
    parseError,
    clientEmail: parsed ? (parsed.client_email ?? null) : null,
    hasPrivateKey: parsed ? !!(parsed.private_key) : false,
    apiResult,
    apiError,
  })
}
