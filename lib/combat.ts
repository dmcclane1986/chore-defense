const CRIT_CHANCE = 0.10
const DESPERATION_HP_THRESHOLD = 20   // below 20% HP → desperation buff active
const DESPERATION_RECOVERY_HP = 50    // buff stays until 50% HP is reached
const DESPERATION_MULT = 1.25
const CRIT_MULT = 2

export type CombatResult = {
  finalValue: number
  isCrit: boolean
  isDesperation: boolean
}

/**
 * Resolves the final damage or heal value for a combat action.
 * Desperation buff activates when the acting faction is below 20% HP.
 * Critical hits have a 10% chance to double the final value.
 */
export function resolveAction(
  baseValue: number,
  actorFactionHp: number,
  actorFactionMaxHp: number
): CombatResult {
  const hpPct = actorFactionMaxHp > 0
    ? (actorFactionHp / actorFactionMaxHp) * 100
    : 100

  const isDesperation = hpPct < DESPERATION_HP_THRESHOLD
  const isCrit = Math.random() < CRIT_CHANCE

  let finalValue = baseValue
  if (isDesperation) finalValue = Math.round(finalValue * DESPERATION_MULT)
  if (isCrit) finalValue = Math.round(finalValue * CRIT_MULT)

  return { finalValue, isCrit, isDesperation }
}

/**
 * Returns true if the faction is in Victory Lap state (opponent HP is 0).
 * During Victory Lap, the winning faction earns 2x gold.
 */
export function isVictoryLap(opponentHp: number): boolean {
  return opponentHp <= 0
}

/** Bar fill width 0–100; safe when max HP is missing or zero. */
export function hpBarWidthPercent(currentHp: number, maxHp: number): number {
  if (maxHp <= 0) return 0
  return Math.max(0, Math.min(100, (currentHp / maxHp) * 100))
}

export function applyVictoryLapGold(gold: number, inVictoryLap: boolean): number {
  return inVictoryLap ? gold * 2 : gold
}

export const DESPERATION_THRESHOLD = DESPERATION_HP_THRESHOLD
export const DESPERATION_RECOVERY = DESPERATION_RECOVERY_HP
