import { NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON ?? ''
  const calId = process.env.GOOGLE_CALENDAR_ID ?? ''

  let parseError: string | null = null
  let parsed: Record<string, unknown> | null = null
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    parseError = String(e)
  }

  // Try a live API call
  let apiResult: unknown = null
  let apiError: string | null = null
  if (parsed && calId) {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: parsed,
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      })
      const cal = google.calendar({ version: 'v3', auth })
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
        items: res.data.items?.map((e) => ({ summary: e.summary, start: e.start })) ?? [],
      }
    } catch (e: unknown) {
      apiError = e instanceof Error ? `${e.message}\n${(e as NodeJS.ErrnoException & { errors?: unknown[] }).errors ? JSON.stringify((e as NodeJS.ErrnoException & { errors?: unknown[] }).errors) : ''}` : String(e)
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
