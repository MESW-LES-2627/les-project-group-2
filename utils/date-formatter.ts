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
