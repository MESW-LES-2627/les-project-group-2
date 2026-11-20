/**
 * @file utils/best-dates.ts
 * @brief Ranks candidate date ranges by how many members can attend them (US-2.4).
 */

import { expandWindowDays, type AvailabilityRow } from '@/utils/availability'

export type SuggestionMember = {
  user_id: string
  display_name: string
}

export type DateSuggestion = {
  start: string
  end: string
  attending: string[]
  notAttending: string[]
}

const DAY_IN_MS = 24 * 60 * 60 * 1000

/**
 * @brief Adds days to a calendar date.
 * @param day The calendar date (YYYY-MM-DD).
 * @param amount The number of days to add.
 * @return The resulting calendar date (YYYY-MM-DD).
 */
function addDays(day: string, amount: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + amount * DAY_IN_MS).toISOString().slice(0, 10)
}

/**
 * @brief Groups the "available" answers by day.
 * @param rows Every availability answer of the trip.
 * @return The ids of the members who are available, keyed by day.
 */
export function groupAvailableByDay(rows: AvailabilityRow[]): Record<string, string[]> {
  const byDay: Record<string, string[]> = {}

  for (const row of rows) {
    if (row.status === 'available') {
      byDay[row.day] = [...(byDay[row.day] ?? []), row.user_id]
    }
  }

  return byDay
}

/**
 * @brief Picks the default trip length: the length of the shortest candidate window.
 * @param windows The candidate windows of the trip.
 * @return The number of days (at least 1).
 */
export function defaultTripLength(windows: { start_date: string; end_date: string }[]): number {
  if (windows.length === 0) {
    return 1
  }

  return Math.min(...windows.map((window) => expandWindowDays([window]).length))
}

/**
 * @brief Suggests the best date ranges of a given length.
 * A range is made of consecutive candidate days. A member can attend it only if they are
 * available on every day. Ranges are ranked by the number of members who can attend,
 * and ties go to the earliest start date.
 * @param windows The candidate windows of the trip.
 * @param availableByDay The ids of the members available on each day.
 * @param members Every member of the trip.
 * @param length The trip length in days.
 * @param limit The maximum number of suggestions to return.
 * @return The ranked suggestions.
 */
export function suggestBestDates(
  windows: { start_date: string; end_date: string }[],
  availableByDay: Record<string, string[]>,
  members: SuggestionMember[],
  length: number,
  limit: number = 5
): DateSuggestion[] {
  if (!Number.isInteger(length) || length < 1) {
    return []
  }

  const days = expandWindowDays(windows)
  const candidateDays = new Set(days)
  const suggestions: DateSuggestion[] = []

  for (const start of days) {
    const range = Array.from({ length }, (_, offset) => addDays(start, offset))
    if (!range.every((day) => candidateDays.has(day))) {
      continue
    }

    const attending: string[] = []
    const notAttending: string[] = []
    for (const member of members) {
      const canAttend = range.every((day) => availableByDay[day]?.includes(member.user_id))
      ;(canAttend ? attending : notAttending).push(member.display_name)
    }

    suggestions.push({ start, end: range[range.length - 1], attending, notAttending })
  }

  return suggestions
    .sort((a, b) => b.attending.length - a.attending.length || a.start.localeCompare(b.start))
    .slice(0, limit)
}
