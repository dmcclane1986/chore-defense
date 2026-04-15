'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import type { CalendarEvent } from '@/types'

type Props = {
  initialEvents: CalendarEvent[]
}

export function TownCrier({ initialEvents }: Props) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)

  useEffect(() => {
    const refresh = async () => {
      try {
        const res = await fetch('/api/calendar')
        const data = await res.json()
        if (data.events) setEvents(data.events)
      } catch {}
    }
    const interval = setInterval(refresh, 5 * 60_000)
    return () => clearInterval(interval)
  }, [])

  function formatEventTime(ev: CalendarEvent) {
    const start = ev.start.dateTime ?? ev.start.date
    if (!start) return ''
    try {
      return ev.start.dateTime
        ? format(parseISO(start), 'EEE, MMM d · h:mm a')
        : format(parseISO(start), 'EEE, MMM d')
    } catch {
      return start
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-400 text-xl">📯</span>
        <h3 className="font-medieval text-lg text-amber-200 tracking-wide">Town Crier</h3>
        <span className="text-xs text-stone-500 ml-1">World News</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {events.length === 0 ? (
          <p className="text-stone-500 text-xs italic text-center py-4">
            The kingdom is quiet. No news from the realm.
          </p>
        ) : (
          events.map((ev) => (
            <motion.div
              key={ev.id}
              className={`rounded-lg p-3 border transition-all
                ${ev.isActive
                  ? 'border-amber-400 bg-amber-900/30 shadow-[0_0_12px_2px_rgba(251,191,36,0.3)]'
                  : 'border-stone-700 bg-stone-800/40'}`}
              animate={
                ev.isActive
                  ? { boxShadow: ['0 0 8px 1px rgba(251,191,36,0.2)', '0 0 18px 4px rgba(251,191,36,0.4)', '0 0 8px 1px rgba(251,191,36,0.2)'] }
                  : {}
              }
              transition={ev.isActive ? { duration: 2, repeat: Infinity } : {}}
            >
              <div className="flex items-start gap-2">
                {ev.isActive && (
                  <motion.span
                    className="text-amber-400 text-xs font-bold shrink-0 mt-0.5"
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    ◉ LIVE
                  </motion.span>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold leading-tight ${ev.isActive ? 'text-amber-200' : 'text-stone-300'}`}>
                    {ev.summary}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">{formatEventTime(ev)}</p>
                  {ev.description && (
                    <p className="text-xs text-stone-400 mt-1 line-clamp-2">{ev.description}</p>
                  )}
                </div>
              </div>
              {ev.isActive && (
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="text-xs text-amber-500 font-bold">⚔ Guild Meeting in Progress</span>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}
