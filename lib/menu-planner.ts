const WEEK_MENU_PATH = '/api/week-menu'
const MENU_VOTE_PATH = '/api/menu/vote'

function trimEnv(v: string | undefined): string | undefined {
  const t = v?.trim()
  return t || undefined
}

function weekMenuUrl(baseUrl: string, householdId: string): string {
  const base = baseUrl.replace(/\/$/, '')
  const q = new URLSearchParams({ householdId })
  return `${base}${WEEK_MENU_PATH}?${q.toString()}`
}

export type WeekMenuFetchResult =
  | { configured: false }
  | { configured: true; ok: true; data: unknown }
  | { configured: true; ok: false; status: number; body: unknown }

async function fetchUpstreamWeekMenu(): Promise<WeekMenuFetchResult> {
  const baseUrl = trimEnv(process.env.MENU_PLANNER_URL)
  const apiKey = trimEnv(process.env.MENU_PLANNER_API_KEY)
  const householdId = trimEnv(process.env.MENU_PLANNER_HOUSEHOLD_ID)
  if (!baseUrl || !apiKey || !householdId) {
    return { configured: false }
  }

  const url = weekMenuUrl(baseUrl, householdId)
  let res: Response
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 300 },
    })
  } catch (e) {
    return {
      configured: true,
      ok: false,
      status: 502,
      body: { error: e instanceof Error ? e.message : 'Upstream unreachable' },
    }
  }

  const text = await res.text()
  let parsed: unknown
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = { error: 'Invalid JSON from menu planner', raw: text.slice(0, 500) }
  }

  if (!res.ok) {
    return { configured: true, ok: false, status: res.status, body: parsed }
  }

  return { configured: true, ok: true, data: parsed }
}

export type MenuVotePayload = {
  familyMemberId: string
  menuItemId: string
  vote: string | number | boolean
}

export type MenuVoteResult =
  | { configured: false }
  | { configured: true; ok: true; status: number; data: unknown }
  | { configured: true; ok: false; status: number; body: unknown }

/** Forward a menu vote to menu-planner (server-only). */
export async function postMenuVote(
  payload: MenuVotePayload,
): Promise<MenuVoteResult> {
  const baseUrl = trimEnv(process.env.MENU_PLANNER_URL)
  const apiKey = trimEnv(process.env.MENU_PLANNER_API_KEY)
  const householdId = trimEnv(process.env.MENU_PLANNER_HOUSEHOLD_ID)
  if (!baseUrl || !apiKey || !householdId) {
    return { configured: false }
  }

  const url = `${baseUrl.replace(/\/$/, '')}${MENU_VOTE_PATH}`
  const { familyMemberId, menuItemId, vote } = payload
  const body = JSON.stringify({
    householdId,
    household_id: householdId,
    familyMemberId,
    family_member_id: familyMemberId,
    menuItemId,
    menu_item_id: menuItemId,
    vote,
  })

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body,
    })
  } catch (e) {
    return {
      configured: true,
      ok: false,
      status: 502,
      body: { error: e instanceof Error ? e.message : 'Upstream unreachable' },
    }
  }

  const text = await res.text()
  let parsed: unknown
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = { error: 'Invalid JSON from menu planner', raw: text.slice(0, 500) }
  }

  if (!res.ok) {
    return { configured: true, ok: false, status: res.status, body: parsed }
  }

  return { configured: true, ok: true, status: res.status, data: parsed }
}

/** Server-only: full result for API routes (forward status + body). */
export async function getWeekMenuForApi(): Promise<WeekMenuFetchResult> {
  return fetchUpstreamWeekMenu()
}

/** Server-only: safe summary for SSR (no secrets). */
export async function getWeekMenuForPage(): Promise<{
  menu: unknown | null
  menuFetchFailed: boolean
}> {
  const r = await fetchUpstreamWeekMenu()
  if (!r.configured) {
    return { menu: null, menuFetchFailed: false }
  }
  if (r.ok) {
    return { menu: r.data, menuFetchFailed: false }
  }
  return { menu: null, menuFetchFailed: true }
}
