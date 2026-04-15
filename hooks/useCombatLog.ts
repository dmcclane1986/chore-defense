'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import type { CombatLogEntry } from '@/types'

export function useCombatLog(initial: CombatLogEntry[]) {
  const [log, setLog] = useState<CombatLogEntry[]>(initial)

  useEffect(() => {
    const supabase = getSupabaseBrowser()

    const channel = supabase
      .channel('combat-log-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'combat_log' },
        (payload: { new: Record<string, unknown> }) => {
          setLog((prev) => [payload.new as CombatLogEntry, ...prev].slice(0, 20))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return log
}
