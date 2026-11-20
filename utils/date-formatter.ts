/**
 * @file utils/date-formatter.ts
 * @brief Utility for formatting event dates.
 */

/**
 * @brief Formats an event date string into a human-readable format or 'Dates not set'.
 * @param dateStr ISO date string.
 * @return Formatted date string or 'Dates not set'.
 */
export function formatEventDate(dateStr?: string | null): string {
  if (!dateStr) return 'Dates not set'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'Dates not set'
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  } catch {
    return 'Dates not set'
  }
}

/**
 * @brief Formats a YYYY-MM-DD or ISO calendar date as "10 Aug 2026".
 * @param dateStr ISO or calendar date string.
 * @return Formatted date string or 'Dates not set'.
 */
export function formatCalendarDate(dateStr?: string | null): string {
  if (!dateStr) return 'Dates not set'
  try {
    const cleanDate = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00Z`
    const d = new Date(cleanDate)
    if (isNaN(d.getTime())) return 'Dates not set'
    const formatted = d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
    return formatted.replace('Sept', 'Sep')
  } catch {
    return 'Dates not set'
  }
}

/**
 * @brief Formats a start and end date as a human-readable date interval (e.g. "10 Aug 2026 – 15 Aug 2026").
 * @param startDate Start date string.
 * @param endDate End date string.
 * @return Formatted date range string or 'Dates not set'.
 */
export function formatDateRange(
  startDate?: string | null,
  endDate?: string | null
): string {
  const start = formatCalendarDate(startDate)
  const end = formatCalendarDate(endDate)

  if (start === 'Dates not set' && end === 'Dates not set') {
    return 'Dates not set'
  }
  if (start === 'Dates not set') return end
  if (end === 'Dates not set' || start === end) return start
  return `${start} – ${end}`
}
