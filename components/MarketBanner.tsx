'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ---------------------------------------------------------------------------
// Countdown hook — ticks every second
// ---------------------------------------------------------------------------
export function useCountdown(targetIso: string | null): string {
  const [display, setDisplay] = useState('')

  useEffect(() => {
    if (!targetIso) return

    function tick() {
      const diff = new Date(targetIso!).getTime() - Date.now()
      if (diff <= 0) { setDisplay('Closing…'); return }
      const h = Math.floor(diff / 3_600_000)
      const m = Math.floor((diff % 3_600_000) / 60_000)
      const s = Math.floor((diff % 60_000) / 1_000)
      setDisplay(
        h > 0
          ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
          : `${m}:${String(s).padStart(2, '0')}`
      )
    }

    tick()
    const id = setInterval(tick, 1_000)
    return () => clearInterval(id)
  }, [targetIso])

  return display
}

// ---------------------------------------------------------------------------
// Banner config
// ---------------------------------------------------------------------------
const BANNER_CONFIG = {
  black_market: {
    icon: '🕵️',
    name: 'Black Market',
    tagline: 'Rare & forbidden goods — before they vanish',
    gradient: 'from-purple-950 via-purple-900/80 to-purple-950',
    border: 'border-purple-500/70',
    shimmer: 'bg-purple-400',
    timerColor: 'text-purple-200',
    badgeBg: 'bg-purple-500/20 border-purple-400',
    badgeText: 'text-purple-200',
  },
  traveling_merchant: {
    icon: '🐪',
    name: 'Traveling Merchant',
    tagline: 'Exotic wares from distant lands',
    gradient: 'from-cyan-950 via-cyan-900/80 to-cyan-950',
    border: 'border-cyan-400/70',
    shimmer: 'bg-cyan-400',
    timerColor: 'text-cyan-200',
    badgeBg: 'bg-cyan-500/20 border-cyan-400',
    badgeText: 'text-cyan-200',
  },
}

type BannerVenue = keyof typeof BANNER_CONFIG

function SingleBanner({
  venue,
  closesAt,
}: {
  venue: BannerVenue
  closesAt: string
}) {
  const cfg = BANNER_CONFIG[venue]
  const countdown = useCountdown(closesAt)

  return (
    <motion.div
      layout
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className={`relative bg-gradient-to-r ${cfg.gradient} border-b ${cfg.border} overflow-hidden`}>
        {/* Animated shimmer line at top */}
        <motion.div
          className={`absolute top-0 left-0 right-0 h-[2px] ${cfg.shimmer}`}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="flex items-center gap-3 px-5 py-1.5">
          <span className="text-base shrink-0">{cfg.icon}</span>
          <span className={`font-medieval text-xs font-bold tracking-wide ${cfg.timerColor}`}>
            {cfg.name} is Open!
          </span>
          <span className="text-stone-500 text-[10px] italic hidden sm:inline">{cfg.tagline}</span>

          <div className="flex-1" />

          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded border ${cfg.badgeBg}`}>
            <span className="text-stone-400 text-[10px]">Closes in</span>
            <span className={`font-mono font-bold text-xs ${cfg.timerColor}`}>
              {countdown}
            </span>
          </div>
        </div>

        {/* Animated shimmer line at bottom */}
        <motion.div
          className={`absolute bottom-0 left-0 right-0 h-[2px] ${cfg.shimmer}`}
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
      </div>
    </motion.div>
  )
}

// ---------------------------------------------------------------------------
// Exported component — renders all active market banners stacked
// ---------------------------------------------------------------------------
type Props = {
  blackOpen: boolean
  blackClosesAt: string | null
  travelingOpen: boolean
  travelingClosesAt: string | null
}

export function MarketBanners({
  blackOpen,
  blackClosesAt,
  travelingOpen,
  travelingClosesAt,
}: Props) {
  return (
    <AnimatePresence>
      {blackOpen && blackClosesAt && (
        <SingleBanner key="black" venue="black_market" closesAt={blackClosesAt} />
      )}
      {travelingOpen && travelingClosesAt && (
        <SingleBanner key="traveling" venue="traveling_merchant" closesAt={travelingClosesAt} />
      )}
    </AnimatePresence>
  )
}
