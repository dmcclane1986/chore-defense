'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import type {
  Faction, FamilyMember, Bounty, CombatLogEntry,
  MarketItem, MarketState, CalendarEvent
} from '@/types'
import { useFactions } from '@/hooks/useFactions'
import { useMarketState } from '@/hooks/useMarketState'
import { useCurrentUser } from '@/contexts/UserContext'
import { hpBarWidthPercent } from '@/lib/combat'
import { Fort } from './Fort'
import { getLevel, getLevelProgress } from '@/lib/xp'
import { BountyBoard } from './BountyBoard'
import { Markets } from './Markets'
import { CombatFeed } from './CombatFeed'
import { VictoryBanner } from './VictoryBanner'
import { MarketBanners } from './MarketBanner'
import { CalendarStrip } from './CalendarStrip'
import { WeekMenuStrip } from './WeekMenuStrip'
import { UserSelector } from './UserSelector'
import { isVictorySpoilsVisible } from '@/lib/victory-spoils'

type Props = {
  /** Server time anchor for bounty rotation (must match SSR on every client). */
  boardTimeMs: number
  initialFactions: Faction[]
  members: FamilyMember[]
  bounties: Bounty[]
  initialLog: CombatLogEntry[]
  marketItems: MarketItem[]
  initialMarketState: MarketState | null
  calendarEvents: CalendarEvent[]
  gameState: { conqueror_bonus_awarded: boolean; war_timezone: string } | null
  weekMenu: unknown | null
  weekMenuFetchFailed: boolean
}

export function Dashboard({
  boardTimeMs,
  initialFactions,
  members,
  bounties: initialBounties,
  initialLog,
  marketItems,
  initialMarketState,
  calendarEvents,
  gameState,
  weekMenu,
  weekMenuFetchFailed,
}: Props) {
  const factions = useFactions(initialFactions)
  const { blackOpen, travelingOpen, state: marketState } = useMarketState(initialMarketState)
  const { currentUser, refreshCurrentUser } = useCurrentUser()

  const [damagedFaction, setDamagedFaction] = useState<string | null>(null)
  const [healedFaction, setHealedFaction] = useState<string | null>(null)
  const damageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const healTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (damageTimerRef.current) clearTimeout(damageTimerRef.current)
      if (healTimerRef.current) clearTimeout(healTimerRef.current)
    }
  }, [])
  const [localBounties, setLocalBounties] = useState<Bounty[]>(initialBounties)
  const [localMembers, setLocalMembers] = useState<FamilyMember[]>(members)
  const [showMarkets, setShowMarkets] = useState(false)

  const refreshMembers = useCallback(async () => {
    const supabase = getSupabaseBrowser()
    const { data } = await supabase.from('family_members').select('*')
    if (data) setLocalMembers(data as FamilyMember[])
  }, [])

  const parents = factions.find((f) => f.slug === 'parents')
  const teens = factions.find((f) => f.slug === 'teens')

  const myFaction = currentUser
    ? factions.find((f) => f.slug === currentUser.faction_slug)
    : undefined
  const oppFaction = currentUser
    ? factions.find((f) => f.slug !== currentUser.faction_slug)
    : undefined

  const timezone = gameState?.war_timezone ?? 'America/Chicago'

  const conquerorFaction =
    gameState?.conqueror_bonus_awarded && parents && teens
      ? parents.current_hp <= 0
        ? teens
        : teens.current_hp <= 0
          ? parents
          : null
      : null

  function handleBountyCompleted(action: 'attack' | 'heal') {
    if (!myFaction || !oppFaction) return
    if (action === 'attack') {
      setDamagedFaction(oppFaction.id)
      if (damageTimerRef.current) clearTimeout(damageTimerRef.current)
      damageTimerRef.current = setTimeout(() => setDamagedFaction(null), 600)
    } else {
      setHealedFaction(myFaction.id)
      if (healTimerRef.current) clearTimeout(healTimerRef.current)
      healTimerRef.current = setTimeout(() => setHealedFaction(null), 1200)
    }
    setLocalBounties((prev) => prev.filter((b) => !b.is_completed))
    // Re-fetch all member stats so gold/xp badges update immediately
    refreshMembers()
  }

  function handleBountyMarked(bountyId: string) {
    setLocalBounties((prev) => prev.filter((b) => b.id !== bountyId))
  }

  if (!parents || !teens) {
    return (
      <div className="w-screen h-screen flex items-center justify-center bg-dark-stone">
        <p className="text-stone-500 font-medieval text-xl">Loading the battlefield…</p>
      </div>
    )
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-dark-stone flex flex-col select-none">
      {conquerorFaction && <VictoryBanner winner={conquerorFaction} />}

      {/* ─── Header bar ─── */}
      <header className="shrink-0 flex items-center gap-4 px-5 bg-wood border-b-2 border-amber-900/50"
        style={{ height: '60px', marginTop: conquerorFaction ? '56px' : 0 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-2xl">🏰</span>
          <span className="font-medieval text-amber-300 text-lg tracking-widest hidden sm:block">
            FORTRESS FACTIONS
          </span>
        </div>

        {/* Market buttons */}
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => setShowMarkets((s) => !s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold
              touch-manipulation transition-colors
              ${showMarkets
                ? 'border-amber-500 bg-amber-900/40 text-amber-300'
                : 'border-stone-600 text-stone-400 hover:border-stone-500'}`}
          >
            🏪 Markets
            {(blackOpen ||
              travelingOpen ||
              isVictorySpoilsVisible(currentUser ?? null, parents, teens)) && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Faction HP summary (compact) */}
        <div className="flex items-center gap-6 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-stone-400">Parents</span>
            <div className="w-20 h-2 bg-stone-700 rounded-full overflow-hidden">
              <div
                className="h-full max-w-full bg-blue-500 rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${hpBarWidthPercent(parents.current_hp, parents.max_hp)}%` }}
              />
            </div>
            <span className="text-stone-300 font-bold">{Math.round(parents.current_hp)}</span>
          </div>
          <span className="text-stone-600 font-bold">⚔</span>
          <div className="flex items-center gap-2">
            <span className="text-stone-300 font-bold">{Math.round(teens.current_hp)}</span>
            <div className="w-20 h-2 bg-stone-700 rounded-full overflow-hidden">
              <div
                className="h-full max-w-full bg-red-500 rounded-full transition-[width] duration-500 ease-out"
                style={{ width: `${hpBarWidthPercent(teens.current_hp, teens.max_hp)}%` }}
              />
            </div>
            <span className="text-stone-400">Teens</span>
          </div>
        </div>

        {/* User selector */}
        <div className="shrink-0">
          <UserSelector members={members} />
        </div>
      </header>

      {/* ─── Market banners (between header and battlefield) ─── */}
      <MarketBanners
        blackOpen={blackOpen}
        blackClosesAt={marketState?.black_closes_at ?? null}
        travelingOpen={travelingOpen}
        travelingClosesAt={marketState?.traveling_closes_at ?? null}
      />

      {/* ─── Main area ─── */}
      <main className="flex-1 overflow-hidden grid"
        style={{ gridTemplateColumns: '320px 1fr 320px', gridTemplateRows: '1fr' }}
      >
        {/* ── Left: Parents Fort ── */}
        <aside className="flex flex-col items-center justify-center gap-4 px-4 py-6
          border-r border-stone-800 bg-gradient-to-b from-stone-900/80 to-stone-950/80">
          <Fort
            faction={parents}
            side="left"
            damaged={damagedFaction === parents.id}
            healed={healedFaction === parents.id}
          />
          {/* Parents member badges */}
          <div className="flex gap-2 flex-wrap justify-center">
            {localMembers.filter((m) => m.faction_slug === 'parents').map((m) => {
              const lvl = getLevel(m.xp)
              const prog = getLevelProgress(m.xp)
              const isMe = currentUser?.id === m.id
              return (
                <div key={m.id} className={`flex flex-col gap-1 px-3 py-2 rounded-xl border text-xs min-w-[90px]
                  ${isMe ? 'border-amber-500 bg-amber-900/30' : 'border-stone-700 bg-stone-800/40'}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{m.avatar_emoji}</span>
                    <span className={`font-bold ${isMe ? 'text-amber-200' : 'text-stone-300'}`}>{m.name}</span>
                  </div>
                  <div className={`text-[10px] ${isMe ? 'text-amber-400' : 'text-stone-500'}`}>{lvl.title}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-400">💰{m.gold}</span>
                    <span className="text-purple-400">⭐{m.xp}</span>
                  </div>
                  <div className="h-1 bg-stone-700 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${prog}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </aside>

        {/* ── Center: Bounties + Combat Feed (+ slide-over Markets) ── */}
        <section className="flex flex-col overflow-hidden relative">
          {/* Markets slide-down */}
          {showMarkets && (
            <motion.div
              className="absolute inset-x-0 top-0 z-10 bg-stone-950/95 border-b border-stone-700 p-3 max-h-72 overflow-y-auto"
              initial={{ y: -300 }}
              animate={{ y: 0 }}
              exit={{ y: -300 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <Markets
                items={marketItems}
                member={currentUser}
                parents={parents}
                teens={teens}
                blackOpen={blackOpen}
                travelingOpen={travelingOpen}
                timezone={timezone}
                onPurchase={() => { refreshMembers(); refreshCurrentUser() }}
              />
            </motion.div>
          )}

          {/* Bounty board fills center */}
          <div className="flex-1 overflow-hidden flex flex-col p-4">
            <BountyBoard
              bounties={localBounties}
              boardTimeMs={boardTimeMs}
              currentUser={currentUser}
              myFaction={myFaction}
              oppFaction={oppFaction}
              timezone={timezone}
              onBountyCompleted={handleBountyCompleted}
              onBountyMarked={handleBountyMarked}
            />
          </div>

          {/* Combat feed at bottom of center */}
          <div className="h-44 border-t border-stone-800 px-4 py-3 overflow-hidden">
            <CombatFeed initialLog={initialLog} factions={factions} />
          </div>
        </section>

        {/* ── Right: Teens Fort ── */}
        <aside className="flex flex-col items-center justify-center gap-4 px-4 py-6
          border-l border-stone-800 bg-gradient-to-b from-stone-900/80 to-stone-950/80">
          <Fort
            faction={teens}
            side="right"
            damaged={damagedFaction === teens.id}
            healed={healedFaction === teens.id}
          />
          {/* Teens member badges */}
          <div className="flex gap-2 flex-wrap justify-center">
            {localMembers.filter((m) => m.faction_slug === 'teens').map((m) => {
              const lvl = getLevel(m.xp)
              const prog = getLevelProgress(m.xp)
              const isMe = currentUser?.id === m.id
              return (
                <div key={m.id} className={`flex flex-col gap-1 px-3 py-2 rounded-xl border text-xs min-w-[90px]
                  ${isMe ? 'border-amber-500 bg-amber-900/30' : 'border-stone-700 bg-stone-800/40'}`}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{m.avatar_emoji}</span>
                    <span className={`font-bold ${isMe ? 'text-amber-200' : 'text-stone-300'}`}>{m.name}</span>
                  </div>
                  <div className={`text-[10px] ${isMe ? 'text-amber-400' : 'text-stone-500'}`}>{lvl.title}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-400">💰{m.gold}</span>
                    <span className="text-purple-400">⭐{m.xp}</span>
                  </div>
                  <div className="h-1 bg-stone-700 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${prog}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </aside>
      </main>

      {/* ─── Bottom: Town crier row, then full-width week menu ─── */}
      <footer className="shrink-0 border-t-2 border-stone-800 bg-stone-950/90 flex flex-col">
        <div className="h-[72px] min-h-[72px] shrink-0 w-full min-w-0">
          <CalendarStrip initialEvents={calendarEvents} />
        </div>
        <WeekMenuStrip
          initialMenu={weekMenu}
          initialFetchFailed={weekMenuFetchFailed}
          timezone={timezone}
        />
      </footer>
    </div>
  )
}
