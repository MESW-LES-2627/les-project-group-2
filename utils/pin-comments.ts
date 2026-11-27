/**
 * @file utils/pin-comments.ts
 * @brief Shared limits and helpers for pin comments.
 */

import type { PinComment } from '@/types/map'

/**
 * @brief Longest comment, in characters, that a member can write under a pin.
 */
export const MAX_COMMENT_LENGTH = 1000

/**
 * @brief Formats the creation time of a comment for display, e.g. "20 Nov 2026".
 * @param isoDate ISO date or timestamp of the comment.
 * @return The formatted date, or an empty string when it is missing or invalid.
 */
export function formatCommentDate(isoDate: string): string {
  const date = new Date(isoDate)
  if (!isoDate || Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * @brief Returns a copy of the pin with the comment added at the end.
 * @param pin The pin receiving the comment.
 * @param comment The new comment.
 * @return The updated pin.
 */
export function withComment<T extends { comments?: PinComment[] }>(pin: T, comment: PinComment): T {
  return { ...pin, comments: [...(pin.comments ?? []), comment] }
}

/**
 * @brief Returns a copy of the pin without the given comment.
 * @param pin The pin that held the comment.
 * @param commentId The comment to remove.
 * @return The updated pin.
 */
export function withoutComment<T extends { comments?: PinComment[] }>(pin: T, commentId: string): T {
  return { ...pin, comments: (pin.comments ?? []).filter((comment) => comment.id !== commentId) }
}
