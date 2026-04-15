'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MarketItem, FamilyMember, Faction } from '@/types'
import { selectItemsForToday } from '@/lib/market'
import {
  getVictorySpoilsVenue,
  isVictorySpoilsVisible,
  syncSpoilsClaimWithBattlefield,
  writeSpoilsClaim,
} from '@/lib/victory-spoils'
import { useCountdown } from './MarketBanner'
import { nextMidnightInTz } from '@/lib/timezone'

type Props = {
  items: MarketItem[]
  member: FamilyMember | null
  parents: Faction
  teens: Faction
  blackOpen: boolean
  travelingOpen: boolean
  timezone: string
  onPurchase: (item: MarketItem) => void
}

type Venue =
  | 'general'
  | 'black_market'
  | 'traveling_merchant'
  | 'parents_store'
  | 'spoils_teens'
  | 'spoils_parents'

// ---------------------------------------------------------------------------
// Helpers: per-person, per-day localStorage purchase tracking
// ---------------------------------------------------------------------------

function todayKey(memberId: string) {
  const date = new Date().toISOString().slice(0, 10) // "YYYY-MM-DD"
  return `fortress_mkt_${memberId}_${date}`
}

function loadPurchased(memberId: string): Set<string> {
  try {
    const raw = localStorage.getItem(todayKey(memberId))
    return new Set(JSON.parse(raw ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

function savePurchased(memberId: string, keys: Set<string>) {
  localStorage.setItem(todayKey(memberId), JSON.stringify([...keys]))
}

// ---------------------------------------------------------------------------
// Countdown until next UTC midnight (general store daily seed)
// ---------------------------------------------------------------------------

function useRefreshCountdown(timezone: string): string {
  const getTarget = () => new Date(nextMidnightInTz(timezone)).toISOString()
  const [target, setTarget] = useState(getTarget)

  useEffect(() => {
    setTarget(getTarget())
    const id = setInterval(() => setTarget(getTarget()), 60_000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timezone])

  return useCountdown(target)
}

// ---------------------------------------------------------------------------
// Market shelf (purely presentational — purchase logic lives in Markets)
// ---------------------------------------------------------------------------

const VENUE_STYLE: Record<Venue, { border: string; label: string; icon: string }> = {
  general:            { border: 'border-amber-700/50',  label: 'General Store',      icon: '🏪' },
  black_market:       { border: 'border-purple-700/50', label: 'Black Market',       icon: '🕵️' },
  traveling_merchant: { border: 'border-cyan-700/50',   label: 'Traveling Merchant', icon: '🐪' },
  parents_store:      { border: 'border-blue-700/50',   label: "Parents' Store",     icon: '🛡️' },
  spoils_teens:       { border: 'border-rose-700/50',   label: 'Fallen Crown Spoils', icon: '👑' },
  spoils_parents:     { border: 'border-violet-700/50', label: 'Rebel Vault Spoils', icon: '🔓' },
}

function MarketShelf({
  venue,
  items,
  member,
  purchasedKeys,
  onBuy,
  refreshCountdown,
}: {
  venue: Venue
  items: MarketItem[]
  member: FamilyMember | null
  purchasedKeys: Set<string>
  onBuy: (item: MarketItem) => Promise<void>
  refreshCountdown?: string
}) {
  const style = VENUE_STYLE[venue]
  const [purchasing, setPurchasing] = useState<string | null>(null)

  async function handleBuy(item: MarketItem) {
    if (!member || purchasing) return
    setPurchasing(item.item_key)
    try {
      await onBuy(item)
    } finally {
      setPurchasing(null)
    }
  }

  // Separate available from already-purchased
  const available = items.filter((i) => !purchasedKeys.has(i.item_key))
  const boughtToday = items.filter((i) => purchasedKeys.has(i.item_key))

  return (
    <div className={`rounded-xl border ${style.border} bg-stone-900/60 p-3 flex flex-col gap-2`}>
      <div className="flex items-center gap-2">
        <span className="text-base">{style.icon}</span>
        <span className="font-medieval text-amber-200 text-xs">{style.label}</span>
        {refreshCountdown && (
          <span className="text-[10px] text-stone-500 ml-1">
            🔄 refreshes in <span className="font-mono font-bold text-stone-400">{refreshCountdown}</span>
          </span>
        )}
        <span className="ml-auto text-xs text-stone-600">{available.length} available</span>
      </div>

      {available.length === 0 && boughtToday.length === 0 && (
        <p className="text-xs text-stone-600 italic text-center py-1">Nothing available today.</p>
      )}

      {available.length > 0 && (
        <div className="space-y-1.5">
          {available.map((item) => {
            const canAfford = member ? member.gold >= item.price_gold : false
            return (
              <div
                key={item.item_key}
                className="flex items-center gap-2 bg-stone-800/50 rounded-lg px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-amber-100 text-xs font-bold truncate">{item.display_name}</p>
                  {item.description && (
                    <p className="text-stone-400 text-xs truncate">{item.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleBuy(item)}
                  disabled={!member || !canAfford || !!purchasing}
                  className={`shrink-0 text-xs font-bold px-2 py-1 rounded border touch-manipulation transition-all
                    ${canAfford && !purchasing
                      ? 'border-amber-600 text-amber-400 hover:bg-amber-800/40 active:scale-95'
                      : 'border-stone-600 text-stone-500 cursor-not-allowed'}`}
                >
                  {purchasing === item.item_key ? '…' : `${item.price_gold}g`}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Already purchased today — shown dimmed at the bottom */}
      {boughtToday.length > 0 && (
        <div className="space-y-1 border-t border-stone-800 pt-2 mt-1">
          {boughtToday.map((item) => (
            <div
              key={item.item_key}
              className="flex items-center gap-2 bg-stone-900/40 rounded-lg px-3 py-1.5 opacity-50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-stone-400 text-xs truncate line-through">{item.display_name}</p>
              </div>
              <span className="text-xs text-emerald-600 shrink-0">✓ bought</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Root Markets component — owns purchase logic & tracking
// ---------------------------------------------------------------------------

export function Markets({
  items,
  member,
  parents,
  teens,
  blackOpen,
  travelingOpen,
  timezone,
  onPurchase,
}: Props) {
  const refreshCountdown = useRefreshCountdown(timezone)
  const isParent = member?.faction_slug === 'parents'

  const [, setSpoilsRevision] = useState(0)
  const spoilsVenue = getVictorySpoilsVenue(member, parents, teens)
  const spoilsVisible = isVictorySpoilsVisible(member, parents, teens)

  useEffect(() => {
    if (!member) return
    const opp = member.faction_slug === 'parents' ? teens : parents
    syncSpoilsClaimWithBattlefield(member.id, opp.slug, opp.current_hp)
    setSpoilsRevision((t) => t + 1)
  }, [member?.id, member?.faction_slug, parents.current_hp, teens.current_hp, parents.id, teens.id])

  // Per-person, per-day purchase tracking
  const [purchasedKeys, setPurchasedKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!member) { setPurchasedKeys(new Set()); return }
    setPurchasedKeys(loadPurchased(member.id))
  }, [member?.id])

  async function handleBuy(item: MarketItem) {
    if (!member) return
    const res = await fetch('/api/market/purchase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemKey: item.item_key, familyMemberId: member.id }),
    })
    const data = await res.json()
    if (data.ok) {
      if (item.venue === 'spoils_teens' || item.venue === 'spoils_parents') {
        const opp = member.faction_slug === 'parents' ? teens : parents
        writeSpoilsClaim(member.id, opp.slug)
        setSpoilsRevision((t) => t + 1)
      }
      // Mark as purchased for this person today
      const next = new Set(purchasedKeys)
      next.add(item.item_key)
      setPurchasedKeys(next)
      savePurchased(member.id, next)
      onPurchase(item)
    }
  }

  const byVenue = (v: Venue) => {
    const venueItems = items.filter((i) => i.venue === v)
    const dayRotated = v === 'general' || v === 'parents_store'
    return dayRotated ? selectItemsForToday(venueItems) : venueItems
  }

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-amber-400 text-xl">🏪</span>
        <h3 className="font-medieval text-lg text-amber-200 tracking-wide">Markets</h3>
        {member && (
          <span className="ml-auto text-sm text-amber-400 font-bold">💰 {member.gold}g</span>
        )}
      </div>

      {/* General store — hidden for parents */}
      {!isParent && (
        <MarketShelf
          venue="general"
          items={byVenue('general')}
          member={member}
          purchasedKeys={purchasedKeys}
          onBuy={handleBuy}
          refreshCountdown={refreshCountdown}
        />
      )}

      {/* Parents' Store — only for parents */}
      <AnimatePresence>
        {isParent && (
          <motion.div
            key="parents-shelf"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <MarketShelf
              venue="parents_store"
              items={byVenue('parents_store')}
              member={member}
              purchasedKeys={purchasedKeys}
              onBuy={handleBuy}
              refreshCountdown={refreshCountdown}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Special market shelves */}
      <AnimatePresence>
        {blackOpen && (
          <motion.div
            key="black-shelf"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <MarketShelf
              venue="black_market"
              items={byVenue('black_market')}
              member={member}
              purchasedKeys={purchasedKeys}
              onBuy={handleBuy}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {travelingOpen && (
          <motion.div
            key="traveling-shelf"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <MarketShelf
              venue="traveling_merchant"
              items={byVenue('traveling_merchant')}
              member={member}
              purchasedKeys={purchasedKeys}
              onBuy={handleBuy}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {spoilsVisible && spoilsVenue && (
          <motion.div
            key={spoilsVenue}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <MarketShelf
              venue={spoilsVenue}
              items={byVenue(spoilsVenue)}
              member={member}
              purchasedKeys={purchasedKeys}
              onBuy={handleBuy}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {!blackOpen && !travelingOpen && !spoilsVisible && (
        <p className="text-xs text-stone-600 text-center italic">
          Special markets appear when opened by an admin, or when you raze the enemy fort…
        </p>
      )}
    </div>
  )
}
