'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import type { FamilyMember } from '@/types'
import { useCurrentUser } from '@/contexts/UserContext'
import { getLevel, xpToNextLevel } from '@/lib/xp'

type Props = {
  members: FamilyMember[]
}

type AdminStep = 'idle' | 'set-password' | 'enter-password'

const ADMIN_USER: FamilyMember = {
  id: 'admin',
  name: 'ADMIN',
  faction_slug: 'parents',
  gold: 0,
  xp: 0,
  avatar_emoji: '⚙️',
}

export function UserSelector({ members }: Props) {
  const { currentUser, setCurrentUser } = useCurrentUser()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [adminStep, setAdminStep] = useState<AdminStep>('idle')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (adminStep !== 'idle') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [adminStep])

  function handleSelectMember(member: FamilyMember) {
    setCurrentUser(member)
    setOpen(false)
    setAdminStep('idle')
    setPassword('')
    setConfirmPassword('')
    setError('')
  }

  async function handleAdminClick() {
    setLoading(true)
    const res = await fetch('/api/admin')
    const { isSet } = await res.json()
    setLoading(false)
    setAdminStep(isSet ? 'enter-password' : 'set-password')
    setPassword('')
    setConfirmPassword('')
    setError('')
  }

  async function handleSetPassword() {
    if (password.length < 4) {
      setError('Password must be at least 4 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set', password }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.ok) {
      router.push('/admin')
    } else {
      setError(data.error ?? 'Failed to set password')
    }
  }

  async function handleVerifyPassword() {
    setLoading(true)
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', password }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.ok) {
      router.push('/admin')
    } else {
      setError('Incorrect password')
      setPassword('')
      inputRef.current?.focus()
    }
  }

  function cancelAdmin() {
    setAdminStep('idle')
    setPassword('')
    setConfirmPassword('')
    setError('')
  }

  const allMembers = [...members, ADMIN_USER]
  const currentLevel = currentUser && currentUser.id !== 'admin' ? getLevel(currentUser.xp) : null

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => { setOpen((o) => !o); setAdminStep('idle') }}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-700/60
          bg-stone-800/80 hover:bg-stone-700/80 transition-colors touch-manipulation min-w-[160px]"
      >
        <span className="text-xl">
          {currentUser ? currentUser.avatar_emoji : '👤'}
        </span>
        <div className="flex-1 text-left">
          <p className="text-amber-200 font-bold text-sm leading-none">
            {currentUser ? currentUser.name : 'Select Warrior'}
          </p>
          {currentLevel && (
            <p className="text-stone-500 text-[10px] mt-0.5">{currentLevel.title}</p>
          )}
        </div>
        {currentUser && currentUser.id !== 'admin' && (
          <div className="text-right shrink-0">
            <p className="text-amber-400 text-xs font-bold">💰{currentUser.gold}</p>
            <p className="text-purple-400 text-[10px]">⭐{currentUser.xp}</p>
          </div>
        )}
        <span className="text-stone-500 text-xs ml-1">▼</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setAdminStep('idle') }} />

            <motion.div
              className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-amber-700/60
                bg-stone-900 shadow-2xl overflow-hidden"
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              {adminStep === 'idle' ? (
                <>
                  <div className="px-4 py-2 border-b border-stone-700">
                    <p className="text-xs text-stone-500 uppercase tracking-wider">Choose Your Warrior</p>
                  </div>
                  <div className="p-2 space-y-1">
                    {allMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() =>
                          member.id === 'admin' ? handleAdminClick() : handleSelectMember(member)
                        }
                        disabled={loading}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg
                          transition-all touch-manipulation text-left
                          ${currentUser?.id === member.id
                            ? 'bg-amber-800/40 border border-amber-600/50'
                            : 'hover:bg-stone-700/60 border border-transparent'
                          }
                          ${member.id === 'admin' ? 'opacity-60 hover:opacity-100' : ''}`}
                      >
                        <span className="text-2xl">{member.avatar_emoji}</span>
                        <div className="flex-1">
                          <p className="text-amber-100 font-bold text-sm">{member.name}</p>
                          {member.id !== 'admin' && (
                            <div className="flex items-center gap-2">
                              <p className="text-stone-500 text-xs">{getLevel(member.xp).title}</p>
                              <p className="text-amber-500 text-xs">💰{member.gold}</p>
                            </div>
                          )}
                          {member.id === 'admin' && (
                            <p className="text-stone-500 text-xs">🔒 Password required</p>
                          )}
                        </div>
                        {currentUser?.id === member.id && (
                          <span className="text-amber-400 text-xs">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                  {currentUser && (
                    <div className="border-t border-stone-700 p-2">
                      <button
                        onClick={() => { setCurrentUser(null); setOpen(false) }}
                        className="w-full text-xs text-stone-500 hover:text-stone-300 py-2 touch-manipulation"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </>
              ) : adminStep === 'set-password' ? (
                <div className="p-4 space-y-3">
                  <div className="text-center">
                    <span className="text-3xl">⚙️</span>
                    <p className="text-amber-200 font-bold mt-1">Create Admin Password</p>
                    <p className="text-stone-400 text-xs mt-0.5">First time setup</p>
                  </div>
                  <input
                    ref={inputRef}
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && confirmPassword && handleSetPassword()}
                    placeholder="New password"
                    className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2.5
                      text-stone-200 text-sm focus:outline-none focus:border-amber-500 placeholder:text-stone-600"
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
                    placeholder="Confirm password"
                    className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2.5
                      text-stone-200 text-sm focus:outline-none focus:border-amber-500 placeholder:text-stone-600"
                  />
                  {error && <p className="text-red-400 text-xs text-center">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={cancelAdmin}
                      className="flex-1 py-2 rounded-lg border border-stone-600 text-stone-400 text-sm touch-manipulation hover:bg-stone-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSetPassword}
                      disabled={!password || !confirmPassword || loading}
                      className="flex-1 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm font-bold
                        disabled:opacity-40 touch-manipulation"
                    >
                      {loading ? '…' : 'Set Password'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  <div className="text-center">
                    <span className="text-3xl">🔒</span>
                    <p className="text-amber-200 font-bold mt-1">Admin Login</p>
                  </div>
                  <input
                    ref={inputRef}
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError('') }}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyPassword()}
                    placeholder="Enter password"
                    className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2.5
                      text-stone-200 text-sm focus:outline-none focus:border-amber-500 placeholder:text-stone-600"
                  />
                  {error && (
                    <motion.p
                      className="text-red-400 text-xs text-center"
                      animate={{ x: [-4, 4, -4, 4, 0] }}
                      transition={{ duration: 0.3 }}
                    >
                      {error}
                    </motion.p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={cancelAdmin}
                      className="flex-1 py-2 rounded-lg border border-stone-600 text-stone-400 text-sm touch-manipulation hover:bg-stone-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleVerifyPassword}
                      disabled={!password || loading}
                      className="flex-1 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm font-bold
                        disabled:opacity-40 touch-manipulation"
                    >
                      {loading ? '…' : 'Enter'}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
