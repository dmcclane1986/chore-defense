import { NextResponse } from 'next/server'
import { getCalendarEvents } from '@/lib/calendar'

export const revalidate = 300 // 5-minute cache

export async function GET() {
  const events = await getCalendarEvents()
  return NextResponse.json({ events })
}
