/**
 * Returns the ms timestamp of the next midnight in the given IANA timezone
 * (e.g. 'America/Chicago' for CST/CDT).
 *
 * Works by reading the current H:M:S in the target TZ via Intl and calculating
 * how many ms remain until 00:00:00 in that zone.
 */
export function nextMidnightInTz(tz: string): number {
  const now = new Date()

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now)

  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10)

  const h = get('hour') % 24 // some engines return 24 for midnight
  const m = get('minute')
  const s = get('second')

  const msUntilMidnight = ((24 - h) * 3_600 - m * 60 - s) * 1_000

  // If we happen to be right at midnight, msUntilMidnight = 86_400_000 (next one is 24h away)
  return now.getTime() + msUntilMidnight
}

export const US_TIMEZONES: { label: string; value: string }[] = [
  { label: 'Eastern  (ET)',  value: 'America/New_York'    },
  { label: 'Central  (CT)',  value: 'America/Chicago'     },
  { label: 'Mountain (MT)',  value: 'America/Denver'      },
  { label: 'Pacific  (PT)',  value: 'America/Los_Angeles' },
  { label: 'Alaska   (AKT)', value: 'America/Anchorage'   },
  { label: 'Hawaii   (HT)',  value: 'Pacific/Honolulu'    },
  { label: 'UTC',            value: 'UTC'                 },
]
