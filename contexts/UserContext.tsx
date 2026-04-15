'use client'

import { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase-browser'
import type { FamilyMember } from '@/types'

const INACTIVITY_MS = 30_000
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const

type UserContextValue = {
  currentUser: FamilyMember | null
  setCurrentUser: (user: FamilyMember | null) => void
  refreshCurrentUser: () => Promise<void>
}

const UserContext = createContext<UserContextValue>({
  currentUser: null,
  setCurrentUser: () => {},
  refreshCurrentUser: async () => {},
})

const STORAGE_KEY = 'fortress_current_user'

export function UserProvider({
  children,
  members: initialMembers,
}: {
  children: ReactNode
  members: FamilyMember[]
}) {
  const [currentUser, setCurrentUserState] = useState<FamilyMember | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as { id: string }
        const match = initialMembers.find((m) => m.id === parsed.id)
        if (match) setCurrentUserState(match)
      }
    } catch {}
  }, [initialMembers])

  function setCurrentUser(user: FamilyMember | null) {
    setCurrentUserState(user)
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: user.id }))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  // Auto-logout after 30 s of inactivity (not applicable to admin)
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!currentUser || currentUser.id === 'admin') return

    function resetTimer() {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      inactivityTimer.current = setTimeout(() => {
        setCurrentUser(null)
      }, INACTIVITY_MS)
    }

    resetTimer()
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }))

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, resetTimer))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id])

  /** Re-fetch the current user's gold/XP from the DB and update the context */
  const refreshCurrentUser = useCallback(async () => {
    if (!currentUser || currentUser.id === 'admin') return
    const supabase = getSupabaseBrowser()
    const { data } = await supabase
      .from('family_members')
      .select('*')
      .eq('id', currentUser.id)
      .single()
    if (data) setCurrentUserState(data as FamilyMember)
  }, [currentUser])

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, refreshCurrentUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useCurrentUser() {
  return useContext(UserContext)
}
