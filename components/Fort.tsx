'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Faction } from '@/types'
import { DESPERATION_THRESHOLD, hpBarWidthPercent } from '@/lib/combat'

type Props = {
  faction: Faction
  side: 'left' | 'right'
  damaged?: boolean
  healed?: boolean
}

function FortSVG({ destroyed, side }: { destroyed: boolean; side: 'left' | 'right' }) {
  if (destroyed) {
    return (
      <svg viewBox="0 0 64 64" className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
        {/* Rubble */}
        <rect x="8" y="48" width="48" height="8" fill="#5a3e28" />
        <rect x="12" y="40" width="16" height="8" fill="#4a3020" />
        <rect x="36" y="42" width="12" height="6" fill="#4a3020" />
        <rect x="6" y="52" width="8" height="4" fill="#6b4c32" />
        <rect x="22" y="50" width="6" height="6" fill="#3d2a18" />
        <rect x="46" y="50" width="10" height="6" fill="#4a3020" />
        <rect x="16" y="44" width="4" height="4" fill="#8B4513" />
        <rect x="32" y="46" width="4" height="4" fill="#6b4c32" />
        <rect x="48" y="44" width="6" height="4" fill="#5a3e28" />
        {/* Flames */}
        <rect x="14" y="36" width="4" height="8" fill="#ff6b00" opacity="0.9" />
        <rect x="16" y="32" width="2" height="4" fill="#ffaa00" opacity="0.8" />
        <rect x="38" y="38" width="4" height="6" fill="#ff6b00" opacity="0.9" />
        <rect x="40" y="34" width="2" height="4" fill="#ffaa00" opacity="0.8" />
      </svg>
    )
  }

  const wallColor = side === 'left' ? '#8B6914' : '#5C4A1E'
  const towerColor = side === 'left' ? '#7A5C0F' : '#4A3A15'
  const flagColor = side === 'left' ? '#1a6fad' : '#ad1a1a'
  const windowColor = '#1a1008'

  return (
    <svg viewBox="0 0 64 64" className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
      {/* Main wall */}
      <rect x="12" y="32" width="40" height="24" fill={wallColor} />
      {/* Battlements */}
      <rect x="12" y="28" width="6" height="8" fill={wallColor} />
      <rect x="22" y="28" width="6" height="8" fill={wallColor} />
      <rect x="36" y="28" width="6" height="8" fill={wallColor} />
      <rect x="46" y="28" width="6" height="8" fill={wallColor} />
      {/* Left tower */}
      <rect x="4" y="20" width="14" height="36" fill={towerColor} />
      <rect x="4" y="16" width="4" height="8" fill={towerColor} />
      <rect x="10" y="16" width="4" height="8" fill={towerColor} />
      {/* Right tower */}
      <rect x="46" y="20" width="14" height="36" fill={towerColor} />
      <rect x="46" y="16" width="4" height="8" fill={towerColor} />
      <rect x="52" y="16" width="4" height="8" fill={towerColor} />
      {/* Gate */}
      <rect x="26" y="42" width="12" height="14" fill="#1a0e00" />
      <rect x="27" y="43" width="10" height="10" rx="2" fill="#120800" />
      {/* Windows */}
      <rect x="7" y="28" width="4" height="4" fill={windowColor} />
      <rect x="53" y="28" width="4" height="4" fill={windowColor} />
      <rect x="28" y="34" width="4" height="4" fill={windowColor} />
      <rect x="36" y="34" width="4" height="4" fill={windowColor} />
      {/* Flag pole + flag */}
      <rect x={side === 'left' ? '9' : '55'} y="4" width="2" height="16" fill="#3d2a18" />
      <rect x={side === 'left' ? '11' : '47'} y="4" width="8" height="6" fill={flagColor} />
      {/* Ground */}
      <rect x="0" y="56" width="64" height="8" fill="#3d2a18" />
    </svg>
  )
}

function HealSparkle() {
  return (
    <AnimatePresence>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-3 h-3 rounded-full bg-emerald-400 pointer-events-none"
          style={{
            left: `${20 + Math.random() * 60}%`,
            top: `${30 + Math.random() * 40}%`,
          }}
          initial={{ opacity: 1, scale: 1, y: 0 }}
          animate={{ opacity: 0, scale: 0, y: -60 - Math.random() * 40 }}
          transition={{ duration: 0.8 + Math.random() * 0.4, delay: i * 0.08 }}
        />
      ))}
    </AnimatePresence>
  )
}

export function Fort({ faction, side, damaged, healed }: Props) {
  const hpPct = hpBarWidthPercent(faction.current_hp, faction.max_hp)
  const isDestroyed = faction.current_hp <= 0
  const isDesperation = hpPct < DESPERATION_THRESHOLD && !isDestroyed

  const shakeVariants = {
    shake: {
      x: [-6, 6, -5, 5, -3, 3, 0],
      transition: { duration: 0.45, times: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 1] },
    },
    still: { x: 0 },
  }

  const hpColor =
    hpPct > 50 ? 'bg-emerald-500' :
    hpPct > 20 ? 'bg-amber-400' :
    'bg-red-500'

  return (
    <div className={`flex flex-col items-center gap-3 ${side === 'right' ? 'items-end' : 'items-start'}`}>
      {/* Faction name + desperation badge */}
      <div className="flex items-center gap-2">
        <h2 className="font-medieval text-2xl text-amber-200 tracking-wide drop-shadow">
          {faction.display_name}
        </h2>
        {isDesperation && (
          <motion.span
            className="text-xs font-bold bg-red-700 text-red-100 px-2 py-0.5 rounded border border-red-400"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            ⚔ DESPERATION
          </motion.span>
        )}
      </div>

      {/* HP Bar */}
      <div className="w-full h-5 bg-stone-800 rounded border border-stone-600 overflow-hidden relative">
        <div
          className={`h-full max-w-full ${hpColor} transition-[width,color] duration-500 ease-out`}
          style={{ width: `${hpPct}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white drop-shadow">
          {Math.round(faction.current_hp)} / {faction.max_hp} HP
        </span>
      </div>

      {/* Fort SVG with shake + sparkle */}
      <div className="relative w-48 h-48">
        <motion.div
          className="w-full h-full"
          variants={shakeVariants}
          animate={damaged ? 'shake' : 'still'}
        >
          <FortSVG destroyed={isDestroyed} side={side} />
        </motion.div>

        {healed && <HealSparkle />}

        {isDestroyed && (
          <motion.div
            className="absolute inset-0 flex items-end justify-center pb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="text-red-500 font-bold text-sm bg-stone-900/80 px-2 py-0.5 rounded">
              CONQUERED
            </span>
          </motion.div>
        )}
      </div>
    </div>
  )
}
