'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Bounty, FamilyMember, Faction } from '@/types'
import { useCurrentUser } from '@/contexts/UserContext'

type Props = {
  bounty: Bounty
  currentUser: FamilyMember
  myFaction: Faction
  oppFaction: Faction
  onClose: () => void
  onConfirm: (action: 'attack' | 'heal') => Promise<void>
}

type Result = {
  action: 'attack' | 'heal'
  finalValue: number
  isCrit: boolean
  isDesperation: boolean
  goldAwarded: number
}

export function TacticalChoiceModal({ bounty, currentUser, myFaction, oppFaction, onClose, onConfirm }: Props) {
  const { refreshCurrentUser } = useCurrentUser()
  const [chosen, setChosen] = useState<'attack' | 'heal' | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)

  const hpPct = (myFaction.current_hp / myFaction.max_hp) * 100
  const isDesperation = hpPct < 20

  async function handleConfirm() {
    if (!chosen) return
    setLoading(true)
    try {
      const res = await fetch('/api/complete-bounty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bountyId: bounty.id,
          familyMemberId: currentUser.id,
          familyMemberName: currentUser.name,
          action: chosen,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setResult({
          action: chosen,
          finalValue: data.finalValue,
          isCrit: data.isCrit,
          isDesperation: data.isDesperation,
          goldAwarded: data.goldAwarded,
        })
        // Refresh gold/XP display immediately
        await refreshCurrentUser()
        await onConfirm(chosen)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          className="relative z-10 w-[560px] max-w-[96vw] rounded-2xl border-4 border-amber-700
            shadow-2xl overflow-hidden"
          initial={{ scale: 0.85, y: 32 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.85, y: 32 }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
          style={{ background: 'linear-gradient(160deg, #f5e6c8 0%, #e0c990 100%)' }}
        >
          {/* Header */}
          <div className="bg-amber-900 px-6 py-4 text-center border-b-4 border-amber-800">
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="text-xl">{currentUser.avatar_emoji}</span>
              <p className="text-amber-300 text-xs uppercase tracking-widest font-bold">
                {currentUser.name} · Quest Complete
              </p>
            </div>
            <h2 className="font-medieval text-2xl text-amber-100">{bounty.title}</h2>
          </div>

          <div className="p-6 space-y-5">
            {!result ? (
              <>
                <div className="text-center space-y-1">
                  <p className="text-stone-700 text-sm">Choose your tactical action</p>
                  <p className="text-stone-500 text-xs">
                    Base power: <strong className="text-stone-700">{bounty.power} pts</strong>
                    {isDesperation && (
                      <span className="ml-2 text-red-600 font-bold">+25% Desperation Surge!</span>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setChosen('attack')}
                    className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all
                      touch-manipulation select-none
                      ${chosen === 'attack'
                        ? 'border-red-600 bg-red-900/25 scale-[1.03] shadow-lg'
                        : 'border-stone-400/60 bg-white/30 hover:border-red-400 hover:bg-red-50/20'}`}
                  >
                    <span className="text-5xl">⚔️</span>
                    <div className="text-center">
                      <p className="font-bold text-red-800 text-xl">ATTACK</p>
                      <p className="text-xs text-stone-600 mt-1">
                        Deal <strong>{bounty.power}</strong> dmg to<br />
                        <span className="font-bold">{oppFaction.display_name}</span>
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => setChosen('heal')}
                    className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all
                      touch-manipulation select-none
                      ${chosen === 'heal'
                        ? 'border-emerald-600 bg-emerald-900/20 scale-[1.03] shadow-lg'
                        : 'border-stone-400/60 bg-white/30 hover:border-emerald-400 hover:bg-emerald-50/20'}`}
                  >
                    <span className="text-5xl">🛡️</span>
                    <div className="text-center">
                      <p className="font-bold text-emerald-800 text-xl">HEAL</p>
                      <p className="text-xs text-stone-600 mt-1">
                        Restore <strong>{bounty.power}</strong> HP to<br />
                        <span className="font-bold">{myFaction.display_name}</span>
                      </p>
                    </div>
                  </button>
                </div>

                <p className="text-center text-xs text-stone-500">
                  🎲 10% chance of a Critical Hit — doubles the effect!
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 py-3.5 rounded-xl border-2 border-stone-400 text-stone-600
                      font-bold hover:bg-stone-100/50 touch-manipulation text-base"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={!chosen || loading}
                    className="flex-1 py-3.5 rounded-xl border-2 border-amber-700 bg-amber-800 text-white
                      font-bold disabled:opacity-40 hover:bg-amber-700 touch-manipulation text-base
                      transition-colors"
                  >
                    {loading ? 'Resolving…' : '⚡ Confirm'}
                  </button>
                </div>

                <div className="flex justify-between text-xs text-stone-500 border-t border-stone-300/60 pt-3">
                  <span>💰 Reward: {bounty.gold_reward} Gold</span>
                  <span>⭐ {bounty.xp_reward} XP</span>
                </div>
              </>
            ) : (
              <motion.div
                className="flex flex-col items-center gap-5 py-6"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <motion.div
                  className="text-7xl"
                  animate={{ scale: [0.5, 1.2, 1] }}
                  transition={{ duration: 0.5 }}
                >
                  {result.action === 'attack' ? '💥' : '✨'}
                </motion.div>

                <div className="text-center space-y-2">
                  {result.isCrit && (
                    <motion.p
                      className="text-yellow-600 font-black text-2xl"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 0.6, repeat: 2 }}
                    >
                      ⚡ CRITICAL HIT!
                    </motion.p>
                  )}
                  {result.isDesperation && (
                    <p className="text-red-600 font-bold">🔥 Desperation Surge activated!</p>
                  )}
                  <p className="text-4xl font-black text-stone-800">
                    {result.action === 'attack' ? '−' : '+'}{result.finalValue} HP
                  </p>
                  <p className="text-stone-500">
                    +{result.goldAwarded} Gold earned by {currentUser.name}
                  </p>
                </div>

                <button
                  onClick={onClose}
                  className="px-10 py-3.5 rounded-xl bg-amber-800 text-white font-bold
                    touch-manipulation hover:bg-amber-700 text-base"
                >
                  Continue
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
