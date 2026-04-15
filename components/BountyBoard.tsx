'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Bounty, BountyFrequency, FamilyMember, Faction } from '@/types'
import { TacticalChoiceModal } from './TacticalChoiceModal'
import {
  selectBountiesForBoard,
  FREQUENCY_ICON,
  FREQUENCY_LABEL,
  FREQUENCY_ORDER,
} from '@/lib/bounties'
import { nextMidnightInTz } from '@/lib/timezone'

type Props = {
  bounties: Bounty[]
  /** Same timestamp the server used for SSR (keeps weekly picks in sync; avoids hydration bugs). */
  boardTimeMs: number
  currentUser: FamilyMember | null
  myFaction: Faction | undefined
  oppFaction: Faction | undefined
  timezone: string
  onBountyCompleted: (action: 'attack' | 'heal') => void
  onBountyMarked: (bountyId: string) => void
}

// Quest-type colours stay on the card border to show combat effect
const QUEST_COLORS: Record<string, string> = {
  Strike:  'border-red-800/60 bg-red-950/20 hover:border-red-600/80',
  Fortify: 'border-emerald-800/60 bg-emerald-950/20 hover:border-emerald-600/80',
  Guild:   'border-amber-700/60 bg-amber-900/20 hover:border-amber-500/80',
}

const QUEST_BADGE: Record<string, string> = {
  Strike:  '⚔️',
  Fortify: '🛡️',
  Guild:   '🏰',
}

function useMidnightCountdown(timezone: string): string {
  const getTarget = () => new Date(nextMidnightInTz(timezone)).toISOString()

  const [target, setTarget] = useState(getTarget)
  const [display, setDisplay] = useState('')

  useEffect(() => {
    setTarget(getTarget())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timezone])

  useEffect(() => {
    const refresh = setInterval(() => setTarget(getTarget()), 60_000)
    return () => clearInterval(refresh)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timezone])

  useEffect(() => {
    function tick() {
      const diff = new Date(target).getTime() - Date.now()
      if (diff <= 0) { setDisplay('soon'); return }
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
  }, [target])

  return display
}

export function BountyBoard({
  bounties,
  boardTimeMs,
  currentUser,
  myFaction,
  oppFaction,
  timezone,
  onBountyCompleted,
  onBountyMarked,
}: Props) {
  const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null)
  const nextPost = useMidnightCountdown(timezone)

  const visible = selectBountiesForBoard(bounties, boardTimeMs)
  const canClaim = !!currentUser && currentUser.id !== 'admin'

  // Group visible bounties by frequency for display
  const grouped = FREQUENCY_ORDER.map((freq) => ({
    freq,
    items: visible.filter(
      (b) => (b.frequency ?? 'daily') === freq
    ),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <span className="text-amber-400 text-xl">📜</span>
        <h3 className="font-medieval text-lg text-amber-200 tracking-wide">Bounty Board</h3>
        {nextPost && (
          <span className="text-[10px] text-stone-500 ml-1">
            new in <span className="font-mono font-bold text-stone-400">{nextPost}</span>
          </span>
        )}
        <span className="ml-auto text-xs text-stone-400 bg-stone-800/60 px-2 py-0.5 rounded-full border border-stone-700">
          {visible.length} active
        </span>
      </div>

      {!canClaim && (
        <div className="shrink-0 mb-3 px-3 py-2 rounded-lg border border-stone-700 bg-stone-800/30 text-center">
          <p className="text-stone-500 text-sm">
            {currentUser?.id === 'admin'
              ? '⚙️ Admins cannot claim bounties'
              : '👆 Select a warrior to claim bounties'}
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-stone-600">
        {visible.length === 0 ? (
          <motion.div
            className="flex flex-col items-center gap-2 py-12 text-center"
            initial={false}
            animate={{ opacity: 1 }}
          >
            <span className="text-4xl">🏆</span>
            <p className="text-stone-500 text-sm italic">All quests vanquished!</p>
            <p className="text-stone-600 text-xs">Check the Admin panel to add more.</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ freq, items }) => (
              <div key={freq}>
                {/* Frequency group header */}
                <div className="flex items-center gap-1.5 mb-1.5 px-1">
                  <span className="text-base">{FREQUENCY_ICON[freq as BountyFrequency]}</span>
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">
                    {FREQUENCY_LABEL[freq as BountyFrequency]}
                  </span>
                </div>

                <div className="space-y-2">
                  <AnimatePresence>
                    {items.map((bounty) => (
                      <motion.button
                        key={bounty.id}
                        layout
                        initial={false}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20, height: 0 }}
                        onClick={() =>
                          canClaim && myFaction && oppFaction && setSelectedBounty(bounty)
                        }
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all touch-manipulation
                          ${QUEST_COLORS[bounty.quest_type]}
                          ${!canClaim ? 'opacity-60 cursor-default' : 'active:scale-[0.98] cursor-pointer'}`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Main icon: frequency */}
                          <span className="text-2xl shrink-0 mt-0.5">
                            {FREQUENCY_ICON[bounty.frequency ?? 'daily']}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-amber-100 text-sm leading-snug">
                              {bounty.title}
                            </p>
                            {bounty.description && (
                              <p className="text-stone-400 text-xs mt-0.5 line-clamp-2 italic">
                                {bounty.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-xs text-amber-400 font-bold">
                                💰 {bounty.gold_reward}g
                              </span>
                              <span className="text-xs text-purple-400">
                                ⭐ {bounty.xp_reward}xp
                              </span>
                              <span className="text-xs text-stone-400 border border-stone-600 px-1.5 py-0.5 rounded">
                                {bounty.power} power
                              </span>
                              {/* Quest type badge */}
                              <span className="text-xs text-stone-500 border border-stone-700 px-1.5 py-0.5 rounded">
                                {QUEST_BADGE[bounty.quest_type]} {bounty.quest_type}
                              </span>
                              {bounty.guild_double_gold && (
                                <span className="text-xs text-yellow-400 font-bold">2× Gold</span>
                              )}
                            </div>
                          </div>
                          {canClaim && (
                            <span className="text-stone-600 text-lg shrink-0">›</span>
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedBounty && currentUser && myFaction && oppFaction && (
        <TacticalChoiceModal
          bounty={selectedBounty}
          currentUser={currentUser}
          myFaction={myFaction}
          oppFaction={oppFaction}
          onClose={() => setSelectedBounty(null)}
          onConfirm={async (action) => {
            onBountyMarked(selectedBounty.id)
            setSelectedBounty(null)
            onBountyCompleted(action)
          }}
        />
      )}
    </div>
  )
}
