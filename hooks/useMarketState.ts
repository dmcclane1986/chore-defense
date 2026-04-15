'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import type { MarketState } from '@/types'

export function useMarketState(initial: MarketState | null) {
  const [state, setState] = useState<MarketState | null>(initial)

  useEffect(() => {
    const supabase = getSupabaseBrowser()

    // Poll every 60s so windows open/close without full page reload
    const fetchState = async () => {
      const { data } = await supabase
        .from('market_state')
        .select('*')
        .eq('id', 1)
        .single()
      if (data) setState(data as MarketState)
    }

    fetchState()
    const interval = setInterval(fetchState, 60_000)
    return () => clearInterval(interval)
  }, [])

  const now = new Date()

  const blackOpen =
    !!state?.black_is_active &&
    !!state.black_closes_at &&
    (!state.black_opens_at || new Date(state.black_opens_at) <= now) &&
    new Date(state.black_closes_at) > now

  const travelingOpen =
    !!state?.traveling_is_active &&
    !!state.traveling_closes_at &&
    (!state.traveling_opens_at || new Date(state.traveling_opens_at) <= now) &&
    new Date(state.traveling_closes_at) > now

  return { state, blackOpen, travelingOpen }
}
