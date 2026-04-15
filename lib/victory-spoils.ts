import type { FamilyMember, Faction } from '@/types'

const STORAGE_PREFIX = 'fortress_spoils_v1'

export function spoilsStorageKey(memberId: string) {
  return `${STORAGE_PREFIX}_${memberId}`
}

export type SpoilsStored = { defeated: 'parents' | 'teens' }

export function readSpoilsClaim(memberId: string | null): SpoilsStored | null {
  if (!memberId || typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(spoilsStorageKey(memberId))
    if (!raw) return null
    return JSON.parse(raw) as SpoilsStored
  } catch {
    return null
  }
}

export function writeSpoilsClaim(memberId: string, defeated: 'parents' | 'teens') {
  localStorage.setItem(spoilsStorageKey(memberId), JSON.stringify({ defeated }))
}

export function clearSpoilsClaim(memberId: string) {
  localStorage.removeItem(spoilsStorageKey(memberId))
}

/**
 * When the defeated fort is repaired (HP back above 0), drop the claim
 * so the spoils shelf can appear again after the next defeat.
 */
export function syncSpoilsClaimWithBattlefield(
  memberId: string | null,
  oppSlug: 'parents' | 'teens',
  oppHp: number
) {
  if (!memberId || typeof window === 'undefined') return
  if (oppHp > 0) {
    const cur = readSpoilsClaim(memberId)
    if (cur?.defeated === oppSlug) clearSpoilsClaim(memberId)
  }
}

export function getVictorySpoilsVenue(
  member: FamilyMember | null,
  parents: Faction | undefined,
  teens: Faction | undefined
): 'spoils_teens' | 'spoils_parents' | null {
  if (!member || !parents || !teens) return null
  const my = member.faction_slug === 'parents' ? parents : teens
  const opp = member.faction_slug === 'parents' ? teens : parents
  if (my.current_hp <= 0 || opp.current_hp > 0) return null
  return member.faction_slug === 'teens' ? 'spoils_teens' : 'spoils_parents'
}

export function isVictorySpoilsVisible(
  member: FamilyMember | null,
  parents: Faction | undefined,
  teens: Faction | undefined
): boolean {
  const venue = getVictorySpoilsVenue(member, parents, teens)
  if (!venue || !member) return false
  const oppSlug = venue === 'spoils_teens' ? 'parents' : 'teens'
  const claimed = readSpoilsClaim(member.id)
  if (claimed?.defeated === oppSlug) return false
  return true
}
