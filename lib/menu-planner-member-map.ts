/**
 * Menu-planner vote API expects household-specific member UUIDs, which may differ
 * from Supabase `family_members.id`. Map by display name (case-insensitive).
 */
const NAME_TO_MENU_PLANNER_MEMBER_ID: Record<string, string> = {
  dad: '9aaaec2c-31e6-4b03-a147-5117233ad92c',
  mom: '84ee2224-d98d-449e-9320-0e202fddb518',
  brett: 'd83096fc-12d9-4bf0-9e46-32acecf5d753',
  shayla: 'e6a75a5c-1c43-4b75-aa88-82b6e2fc8e5d',
}

export function menuPlannerFamilyMemberIdForUser(member: {
  id: string
  name: string
}): string {
  const key = member.name.trim().toLowerCase()
  return NAME_TO_MENU_PLANNER_MEMBER_ID[key] ?? member.id
}
