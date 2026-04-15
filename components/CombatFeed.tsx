'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import type { CombatLogEntry, Faction } from '@/types'
import { useCombatLog } from '@/hooks/useCombatLog'

type Props = {
  initialLog: CombatLogEntry[]
  factions: Faction[]
}

export function CombatFeed({ initialLog, factions }: Props) {
  const log = useCombatLog(initialLog)

  function factionName(id: string | null) {
    return factions.find((f) => f.id === id)?.display_name ?? '?'
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-red-400 text-xl">🗡</span>
        <h3 className="font-medieval text-lg text-amber-200 tracking-wide">Battle Chronicle</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        <AnimatePresence initial={false}>
          {log.length === 0 ? (
            <p className="text-stone-500 text-xs italic text-center py-4">
              No battles recorded yet. Be the first to strike!
            </p>
          ) : (
            log.map((entry) => (
              <motion.div
                key={entry.id}
                layout
                initial={{ opacity: 0, y: -16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`rounded-lg px-3 py-2 text-xs border
                  ${entry.action === 'attack'
                    ? 'border-red-800/50 bg-red-950/30'
                    : 'border-emerald-800/50 bg-emerald-950/30'}`}
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>{entry.action === 'attack' ? '⚔️' : '🛡️'}</span>
                  <span className="text-amber-300 font-bold">
                    {factionName(entry.actor_faction_id)}
                  </span>
                  <span className="text-stone-400">
                    {entry.action === 'attack' ? 'struck' : 'fortified'}
                  </span>
                  {entry.action === 'attack' && (
                    <>
                      <span className="text-stone-400">→</span>
                      <span className="text-stone-300">{factionName(entry.target_faction_id)}</span>
                    </>
                  )}
                  <span
                    className={`font-bold ml-auto ${entry.action === 'attack' ? 'text-red-400' : 'text-emerald-400'}`}
                  >
                    {entry.action === 'attack' ? '−' : '+'}{entry.final_value}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-stone-500">
                  {entry.bounty_title && (
                    <span className="truncate italic">{entry.bounty_title}</span>
                  )}
                  {entry.is_crit && <span className="text-yellow-500 font-bold shrink-0">CRIT!</span>}
                  {entry.is_desperation && <span className="text-red-500 shrink-0">DESP!</span>}
                  <span className="ml-auto shrink-0">
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
