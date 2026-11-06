/**
 * @file utils/availability.ts
 * @brief Types and helpers to build the availability calendar of a trip (US-2.2).
 */

export type AvailabilityStatus = 'available' | 'unavailable'

/** An answer the user can pick for a day; `none` clears a previous answer. */
export type AvailabilityChoice = AvailabilityStatus | 'none'

export type AvailabilityRow = {
  user_id: string
  day: string
  status: AvailabilityStatus
}

export type CalendarMember = {
  user_id: string
  display_name: string
}

export type CalendarDay = {
  day: string
  available: string[]
  unavailable: string[]
}

export type AvailabilityCalendar = {
  days: CalendarDay[]
  missing: string[]
}

const DAY_IN_MS = 24 * 60 * 60 * 1000

/**
 * @brief Lists every calendar day covered by a set of windows, without duplicates.
 * @param windows The candidate windows, each with start and end dates (YYYY-MM-DD).
 * @return The sorted list of days (YYYY-MM-DD).
 */
export function expandWindowDays(
  windows: { start_date: string; end_date: string }[]
): string[] {
  const days = new Set<string>()

  for (const window of windows) {
    const end = Date.parse(`${window.end_date}T00:00:00Z`)
    for (
      let current = Date.parse(`${window.start_date}T00:00:00Z`);
      current <= end;
      current += DAY_IN_MS
    ) {
      days.add(new Date(current).toISOString().slice(0, 10))
    }
  }

  return [...days].sort()
}

/**
 * @brief Builds the per-day overlaps and the list of members who have not answered yet.
 * A member counts as having answered once they marked at least one day of the trip.
 * @param windows The candidate windows of the trip.
 * @param rows Every availability answer of the trip.
 * @param members Every member of the trip.
 * @return The calendar days with who is (un)available, and the names of members still missing.
 */
export function buildAvailabilityCalendar(
  windows: { start_date: string; end_date: string }[],
  rows: AvailabilityRow[],
  members: CalendarMember[]
): AvailabilityCalendar {
  const names = new Map(members.map((member) => [member.user_id, member.display_name]))
  const days = new Map<string, CalendarDay>(
    expandWindowDays(windows).map((day) => [day, { day, available: [], unavailable: [] }])
  )
  const answered = new Set<string>()

  for (const row of rows) {
    const name = names.get(row.user_id)
    const day = days.get(row.day)
    if (!name || !day) {
      continue
    }
    answered.add(row.user_id)
    day[row.status].push(name)
  }

  return {
    days: [...days.values()],
    missing: members.filter((member) => !answered.has(member.user_id)).map((member) => member.display_name),
  }
}
