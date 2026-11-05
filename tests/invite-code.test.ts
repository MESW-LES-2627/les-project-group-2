/**
 * @file tests/invite-code.test.ts
 * @brief Unit tests for invite code generation, validation, and URL construction utilities.
 */

import { describe, it, expect } from 'vitest'
import { generateInviteCode, isValidInviteCode, buildInviteUrl } from '@/utils/invite-code'

describe('Invite Code Utility', () => {
  describe('generateInviteCode', () => {
    it('generates an 8-character uppercase alphanumeric string', () => {
      const code = generateInviteCode()
      expect(code).toHaveLength(8)
      expect(/^[A-Z0-9]{8}$/.test(code)).toBe(true)
    })

    it('generates distinct codes on successive calls', () => {
      const set = new Set<string>()
      for (let i = 0; i < 50; i++) {
        set.add(generateInviteCode())
      }
      expect(set.size).toBe(50)
    })
  })

  describe('isValidInviteCode', () => {
    it('returns true for valid codes', () => {
      expect(isValidInviteCode('ABCDEFGH')).toBe(true)
      expect(isValidInviteCode('abcdefgh')).toBe(true)
      expect(isValidInviteCode('TRIP1234')).toBe(true)
      expect(isValidInviteCode('  TRIP1234  ')).toBe(true)
      expect(isValidInviteCode('A1B2')).toBe(true)
    })

    it('returns false for invalid codes or non-string inputs', () => {
      expect(isValidInviteCode('')).toBe(false)
      expect(isValidInviteCode('   ')).toBe(false)
      expect(isValidInviteCode('ABC')).toBe(false) // too short (< 4)
      expect(isValidInviteCode('TOOLONGOFANINVITATIONCODE')).toBe(false) // too long (> 16)
      expect(isValidInviteCode('INVALID#CODE')).toBe(false)
      expect(isValidInviteCode('INV@LID')).toBe(false)
      expect(isValidInviteCode(null)).toBe(false)
      expect(isValidInviteCode(undefined)).toBe(false)
      expect(isValidInviteCode(12345)).toBe(false)
      expect(isValidInviteCode({})).toBe(false)
    })
  })

  describe('buildInviteUrl', () => {
    it('constructs correct invite URL without trailing slash', () => {
      const url = buildInviteUrl('https://planit2.vercel.app', 'TRIP1234')
      expect(url).toBe('https://planit2.vercel.app/trips/join?code=TRIP1234')
    })

    it('handles origin with trailing slashes correctly', () => {
      const url = buildInviteUrl('http://localhost:3000///', 'TRIP1234')
      expect(url).toBe('http://localhost:3000/trips/join?code=TRIP1234')
    })

    it('trims and normalizes lowercase code in URL', () => {
      const url = buildInviteUrl('http://localhost:3000', '  abc12345  ')
      expect(url).toBe('http://localhost:3000/trips/join?code=ABC12345')
    })
  })
})
