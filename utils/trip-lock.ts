/**
 * @file utils/trip-lock.ts
 * @brief Validation helpers for locking the official trip dates (US-2.3).
 */

import { isValidIsoDate } from '@/utils/date-windows'

/** Label stored in `trips.state` while the dates are locked. */
export const DATES_LOCKED_STATE = 'Dates locked'

/**
 * @brief Validates the range the organizer wants to lock as the official trip dates.
 * Every day of the range must be covered by at least one candidate window.
 * @param startDate The first day of the range (YYYY-MM-DD).
 * @param endDate The last day of the range (YYYY-MM-DD).
 * @param windows The candidate date windows of the trip.
 * @return A validation error message, or null if the range can be locked.
 */
export function validateLockRange(
  startDate: string,
  endDate: string,
  windows: { start_date: string; end_date: string }[]
): string | null {
  if (!startDate || !endDate) {
    return 'Both a start date and an end date are required.'
  }
  if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
    return 'Dates must be valid calendar dates.'
  }
  if (endDate < startDate) {
    return 'The end date cannot be before the start date.'
  }

  const dayInMs = 24 * 60 * 60 * 1000
  const end = Date.parse(`${endDate}T00:00:00Z`)
  for (let current = Date.parse(`${startDate}T00:00:00Z`); current <= end; current += dayInMs) {
    const day = new Date(current).toISOString().slice(0, 10)
    if (!windows.some((window) => day >= window.start_date && day <= window.end_date)) {
      return 'The locked dates must be inside the candidate date windows.'
    }
  }

  return null
}
