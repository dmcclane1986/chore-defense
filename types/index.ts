export type FamilyMember = {
  id: string
  name: string
  faction_slug: 'parents' | 'teens'
  gold: number
  xp: number
  avatar_emoji: string
}

export type AdminConfig = {
  id: number
  password_hash: string | null
}

export type Faction = {
  id: string
  slug: 'parents' | 'teens'
  display_name: string
  current_hp: number
  max_hp: number
  created_at: string
}

export type Profile = {
  id: string
  name: string | null
  full_name: string | null
  avatar_url: string | null
  gold: number
  xp: number
  faction_id: string
  faction_contribution_xp: number
}

export type BountyFrequency = 'daily' | 'weekly' | 'semi_weekly' | 'bi_weekly'

export type Bounty = {
  id: string
  title: string
  description: string | null
  gold_reward: number
  xp_reward: number
  quest_type: 'Strike' | 'Fortify' | 'Guild'
  power: number
  guild_double_gold: boolean
  frequency: BountyFrequency | null
  is_completed: boolean
  completed_by: string | null
  expires_at: string | null
  is_encounter: boolean
  created_at: string
}

export type CombatLogEntry = {
  id: string
  actor_faction_id: string | null
  target_faction_id: string | null
  bounty_id: string | null
  bounty_title: string | null
  family_member_id: string | null
  family_member_name: string | null
  action: 'attack' | 'heal'
  base_value: number
  final_value: number
  is_crit: boolean
  is_desperation: boolean
  created_at: string
}

export type MarketState = {
  id: number
  black_is_active: boolean
  black_opens_at: string | null
  black_closes_at: string | null
  traveling_is_active: boolean
  traveling_opens_at: string | null
  traveling_closes_at: string | null
}

export type MarketItem = {
  id: string
  item_key: string
  display_name: string
  description: string | null
  venue:
    | 'general'
    | 'black_market'
    | 'traveling_merchant'
    | 'parents_store'
    /** Teens only, while Parents fort is destroyed */
    | 'spoils_teens'
    /** Parents only, while Teens fort is destroyed */
    | 'spoils_parents'
  price_gold: number
  effect: Record<string, unknown>
  /** null / empty = random daily rotation. Non-empty = only shown on these days. */
  available_days: string[] | null
}

export type GameState = {
  id: number
  last_chore_completed_at: string | null
  conqueror_bonus_awarded: boolean
  war_timezone: string
  next_war_reset_at: string | null
}

export type CalendarEvent = {
  id: string
  summary: string
  description?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  isActive: boolean
}
