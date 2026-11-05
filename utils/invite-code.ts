/**
 * @file utils/invite-code.ts
 * @brief Utility helpers for generating, validating, and building trip invite codes and URLs.
 */

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const INVITE_CODE_LENGTH = 8

/**
 * @brief Generates a random alphanumeric trip invite code.
 * Excludes easily confusable characters (0, O, 1, I).
 * @return Uppercase 8-character invite code string.
 */
export function generateInviteCode(): string {
  let code = ''
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * INVITE_CODE_ALPHABET.length)
    code += INVITE_CODE_ALPHABET[randomIndex]
  }
  return code
}

/**
 * @brief Validates if a string is a syntactically valid invite code.
 * @param code The candidate invite code.
 * @return True if valid, false otherwise.
 */
export function isValidInviteCode(code: unknown): code is string {
  if (typeof code !== 'string') return false
  const trimmed = code.trim().toUpperCase()
  return /^[A-Z0-9]{4,16}$/.test(trimmed)
}

/**
 * @brief Builds the shareable invite link for a given trip invite code.
 * @param origin The website base URL (e.g. http://localhost:3000 or https://planit2.vercel.app).
 * @param code The trip invite code.
 * @return Fully-qualified invite URL.
 */
export function buildInviteUrl(origin: string, code: string): string {
  const cleanOrigin = origin.replace(/\/+$/, '')
  return `${cleanOrigin}/trips/join?code=${encodeURIComponent(code.trim().toUpperCase())}`
}
