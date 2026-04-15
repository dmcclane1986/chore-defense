'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import type { Faction } from '@/types'

export function useFactions(initial: Faction[]) {
  const [factions, setFactions] = useState<Faction[]>(initial)

  useEffect(() => {
    const supabase = getSupabaseBrowser()

    const channel = supabase
      .channel('factions-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'factions' },
        (payload: { new: Record<string, unknown> }) => {
          setFactions((prev) =>
            prev.map((f) =>
              f.id === payload.new.id ? { ...f, ...(payload.new as Faction) } : f
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return factions
}
