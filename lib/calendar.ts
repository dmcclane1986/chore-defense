import { auth as googleAuth, calendar } from '@googleapis/calendar'
import type { CalendarEvent } from '@/types'

function getCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) return null
  try {
    // Handle both single-line and multi-line JSON in the env var
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const credentials = getCredentials()
  if (!credentials || !process.env.GOOGLE_CALENDAR_ID) return []

  try {
    const auth = new googleAuth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    })

    const cal = calendar({ version: 'v3', auth })
    const now = new Date()
    const threeDaysAhead = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    const res = await cal.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      timeMin: now.toISOString(),
      timeMax: threeDaysAhead.toISOString(),
      maxResults: 12,
      singleEvents: true,
      orderBy: 'startTime',
    })

    const items = res.data.items ?? []
    return items.map((ev) => {
      const start = ev.start?.dateTime ?? ev.start?.date ?? ''
      const end = ev.end?.dateTime ?? ev.end?.date ?? ''
      const startMs = new Date(start).getTime()
      const endMs = new Date(end).getTime()
      const nowMs = now.getTime()
      const isActive = nowMs >= startMs && nowMs <= endMs

      return {
        id: ev.id ?? Math.random().toString(),
        summary: ev.summary ?? 'Untitled Event',
        description: ev.description ?? undefined,
        start: ev.start as CalendarEvent['start'],
        end: ev.end as CalendarEvent['end'],
        isActive,
      }
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    // Downgrade to warn so Next.js dev overlay doesn't treat it as a crash
    console.warn('[calendar] Could not fetch events:', msg.split('\n')[0])
    return []
  }
}
