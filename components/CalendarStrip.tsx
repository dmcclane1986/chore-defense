'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { format, parseISO, isToday, isTomorrow, differenceInCalendarDays } from 'date-fns'
import type { CalendarEvent } from '@/types'

type Props = {
  initialEvents: CalendarEvent[]
}

function formatEventTime(ev: CalendarEvent) {
  const start = ev.start.dateTime ?? ev.start.date
  if (!start) return ''
  try {
    if (ev.start.dateTime) {
      return format(parseISO(start), 'h:mm a')
    }
    const d = parseISO(start)
    if (isToday(d)) return 'Today'
    if (isTomorrow(d)) return 'Tomorrow'
    return format(d, 'EEE MMM d')
  } catch {
    return start
  }
}

function formatEventDate(ev: CalendarEvent) {
  const start = ev.start.dateTime ?? ev.start.date
  if (!start) return ''
  try {
    const d = parseISO(start)
    const now = new Date()
    if (isToday(d)) return 'Today'
    if (isTomorrow(d)) return 'Tomorrow'
    const days = differenceInCalendarDays(d, now)
    if (days === 2) return 'In 2 days'
    return format(d, 'EEE, MMM d')
  } catch { return '' }
}

export function CalendarStrip({ initialEvents }: Props) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [now, setNow] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(tick)
  }, [])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/calendar', { cache: 'no-store' })
      const data = await res.json()
      if (data.events) setEvents(data.events)
    } catch {
      // silent
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(refresh, 5 * 60_000)
    return () => clearInterval(interval)
  }, [refresh])

  return (
    <div className="flex items-center gap-0 h-full w-full overflow-hidden">
      {/* Date/time clock */}
      <div className="shrink-0 flex flex-col items-center justify-center px-5 border-r border-stone-700 h-full bg-stone-900/60">
        <p className="text-amber-300 font-medieval font-bold text-lg leading-none">
          {format(now, 'EEE, MMM d')}
        </p>
        <p className="text-stone-400 text-sm mt-0.5">{format(now, 'h:mm a')}</p>
      </div>

      {/* Scrolling events */}
      <div className="flex-1 flex items-center gap-4 px-4 overflow-x-auto overflow-y-hidden h-full
        scrollbar-thin scrollbar-thumb-stone-700">
        <span className="text-amber-500 shrink-0 text-sm font-medieval tracking-wider">📯 Town Crier</span>
        <button
          onClick={refresh}
          disabled={refreshing}
          title="Refresh calendar"
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded text-stone-500
            hover:text-stone-300 hover:bg-stone-700/60 transition-colors touch-manipulation
            disabled:opacity-40"
        >
          <span className={`text-xs ${refreshing ? 'animate-spin inline-block' : ''}`}>↺</span>
        </button>

        {events.length === 0 ? (
          <p className="text-stone-700 text-sm italic shrink-0">
            No events in the next 3 days — or calendar not yet connected.
          </p>
        ) : (
          events.map((ev) => (
            <motion.div
              key={ev.id}
              className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm
                ${ev.isActive
                  ? 'border-amber-500 bg-amber-900/40 shadow-[0_0_10px_2px_rgba(251,191,36,0.25)]'
                  : 'border-stone-700 bg-stone-800/50'}`}
              animate={ev.isActive
                ? { boxShadow: ['0 0 6px 1px rgba(251,191,36,0.15)', '0 0 14px 3px rgba(251,191,36,0.35)', '0 0 6px 1px rgba(251,191,36,0.15)'] }
                : {}}
              transition={ev.isActive ? { duration: 2, repeat: Infinity } : {}}
            >
              {ev.isActive && (
                <motion.span
                  className="text-amber-400 text-xs font-bold"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  ◉
                </motion.span>
              )}
              <div>
                <span className={`font-bold ${ev.isActive ? 'text-amber-200' : 'text-stone-300'}`}>
                  {ev.summary}
                </span>
                <span className="text-stone-500 text-xs ml-2">
                  {ev.isActive ? 'NOW · ' : ''}{formatEventDate(ev)}
                  {ev.start.dateTime && ` · ${formatEventTime(ev)}`}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
