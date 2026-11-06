/**
 * @file utils/date-windows.ts
 * @brief Types and validation helpers for candidate trip date windows (US-2.1).
 */

export type DateWindow = {
  id: string
  trip_id: string
  start_date: string
  end_date: string
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * @brief Returns the given moment as a calendar date in YYYY-MM-DD format (UTC).
 * @param now The moment to format. Defaults to the current time.
 * @return The ISO calendar date string.
 */
export function toIsoDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/**
 * @brief Checks that a string is a real calendar date in YYYY-MM-DD format.
 * @param value The string to check.
 * @return True if the value is a valid calendar date, false otherwise.
 */
export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false
  }
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && toIsoDate(parsed) === value
}

/**
 * @brief Validates a candidate date window.
 * @param startDate The first day of the window (YYYY-MM-DD).
 * @param endDate The last day of the window (YYYY-MM-DD).
 * @param today The current calendar date (YYYY-MM-DD). Defaults to today.
 * @return A validation error message, or null if the window is valid.
 */
export function validateDateWindow(
  startDate: string,
  endDate: string,
  today: string = toIsoDate()
): string | null {
  if (!startDate || !endDate) {
    return 'Both a start date and an end date are required.'
  }
  if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
    return 'Dates must be valid calendar dates.'
  }
  if (startDate < today) {
    return 'The start date cannot be in the past.'
  }
  if (endDate < startDate) {
    return 'The end date cannot be before the start date.'
  }
  return null
}
