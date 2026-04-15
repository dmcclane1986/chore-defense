'use client'

import { motion } from 'framer-motion'
import type { Faction } from '@/types'

type Props = {
  winner: Faction
}

export function VictoryBanner({ winner }: Props) {
  return (
    <motion.div
      className="absolute inset-x-0 top-0 z-20 flex items-center justify-center gap-4 py-3 px-6
        bg-gradient-to-r from-yellow-900/90 via-amber-700/90 to-yellow-900/90
        border-b-2 border-amber-500 shadow-lg"
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
    >
      <motion.span
        className="text-3xl"
        animate={{ rotate: [-10, 10, -10] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        🏆
      </motion.span>
      <div className="text-center">
        <p className="text-amber-200 text-xs uppercase tracking-widest font-bold">Victory Lap</p>
        <p className="text-amber-100 font-medieval text-xl">
          {winner.display_name} have conquered!
        </p>
      </div>
      <motion.div
        className="flex items-center gap-1.5 bg-amber-500/20 border border-amber-400 rounded-lg px-3 py-1.5"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <span className="text-yellow-300 text-lg">💰</span>
        <span className="text-amber-200 font-bold text-sm">2× Gold Active</span>
      </motion.div>
      <motion.span
        className="text-3xl"
        animate={{ rotate: [10, -10, 10] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        🏆
      </motion.span>
    </motion.div>
  )
}
