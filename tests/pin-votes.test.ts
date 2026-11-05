/**
 * @file tests/pin-votes.test.ts
 * @brief Unit tests for pin voting business logic, duplicate prevention, and date scoping.
 */

import { describe, it, expect } from 'vitest'
import { Pin } from '@/types/map'
import {
  toggleVoteOnPin,
  addVoteToPin,
  removeVoteFromPin,
} from '@/services/pin-votes'
import {
  getPinVoteCount,
  getPinVoters,
  hasUserVoted,
  getPinVotes,
} from '@/types/map'

describe('Pin Voting Logic (US-3.2)', () => {
  const basePin: Pin = {
    id: 'pin-bel-1',
    tripId: 'trip-lisbon',
    name: 'Belém Tower',
    category: 'sightseeing',
    lat: 38.6916,
    lng: -9.216,
    proposedBy: 'organizer@planit.app',
    createdAt: '2026-11-01T10:00:00Z',
    date: '2026-11-15',
    votes: [],
  }

  describe('Casting and Removing Votes (AC 1)', () => {
    it('casts a vote for a user when they have not voted yet', () => {
      const updated = toggleVoteOnPin(basePin, { email: 'alice@planit.app' })

      expect(getPinVoteCount(updated)).toBe(1)
      expect(hasUserVoted(updated, 'alice@planit.app')).toBe(true)
      expect(getPinVoters(updated)).toEqual(['alice@planit.app'])
    })

    it('removes vote when the user votes again on the same pin', () => {
      // Vote first time
      const voted = toggleVoteOnPin(basePin, { email: 'alice@planit.app' })
      expect(getPinVoteCount(voted)).toBe(1)

      // Vote second time -> toggles off (removes vote)
      const unvoted = toggleVoteOnPin(voted, { email: 'alice@planit.app' })
      expect(getPinVoteCount(unvoted)).toBe(0)
      expect(hasUserVoted(unvoted, 'alice@planit.app')).toBe(false)
      expect(getPinVoters(unvoted)).toEqual([])
    })

    it('ignores vote toggle if voter email is missing or empty', () => {
      const res = toggleVoteOnPin(basePin, { email: '' })
      expect(res).toBe(basePin)
    })
  })

  describe('Preventing Duplicate Votes (AC 2)', () => {
    it('does not count a vote twice when addVoteToPin is called multiple times', () => {
      const voter = { email: 'bob@planit.app' }
      const first = addVoteToPin(basePin, voter)
      expect(getPinVoteCount(first)).toBe(1)

      const second = addVoteToPin(first, voter)
      expect(getPinVoteCount(second)).toBe(1)
      expect(getPinVoters(second)).toEqual(['bob@planit.app'])
    })

    it('removeVoteFromPin removes vote only if previously voted', () => {
      const removedWithoutVote = removeVoteFromPin(basePin, 'unknown@planit.app')
      expect(removedWithoutVote).toBe(basePin)

      const voted = addVoteToPin(basePin, { email: 'charlie@planit.app' })
      const removed = removeVoteFromPin(voted, 'charlie@planit.app')
      expect(getPinVoteCount(removed)).toBe(0)
    })
  })

  describe('Vote Count and Voter Listing (AC 3)', () => {
    it('accurately counts multiple votes from distinct users and lists voters', () => {
      let pin = basePin
      pin = toggleVoteOnPin(pin, { email: 'voter1@planit.app' })
      pin = toggleVoteOnPin(pin, { email: 'voter2@planit.app' })
      pin = toggleVoteOnPin(pin, { email: 'voter3@planit.app' })

      expect(getPinVoteCount(pin)).toBe(3)
      expect(getPinVoters(pin)).toEqual([
        'voter1@planit.app',
        'voter2@planit.app',
        'voter3@planit.app',
      ])
    })

    it('returns empty voter list and 0 count when pin has no votes', () => {
      const emptyPin: Pin = { ...basePin, votes: undefined }
      expect(getPinVoteCount(emptyPin)).toBe(0)
      expect(getPinVoters(emptyPin)).toEqual([])
      expect(hasUserVoted(emptyPin, 'any@planit.app')).toBe(false)
    })

    it('hasUserVoted returns false for empty email', () => {
      expect(hasUserVoted(basePin, '')).toBe(false)
    })
  })

  describe('Date Scoping (AC 4)', () => {
    it('counts votes for the specific trip date of the pin only', () => {
      // Pin is for 2026-11-15
      const pinDate1: Pin = {
        ...basePin,
        date: '2026-11-15',
        votes: [
          {
            id: 'v1',
            pinId: basePin.id,
            userId: 'u1',
            userEmail: 'alice@planit.app',
            date: '2026-11-15',
            createdAt: '2026-11-01T00:00:00Z',
          },
          {
            id: 'v2',
            pinId: basePin.id,
            userId: 'u2',
            userEmail: 'bob@planit.app',
            date: '2026-11-16', // Different date!
            createdAt: '2026-11-01T00:00:00Z',
          },
        ],
      }

      // Votes counted for 2026-11-15 should be 1 (alice only)
      expect(getPinVoteCount(pinDate1, '2026-11-15')).toBe(1)
      expect(getPinVoters(pinDate1, '2026-11-15')).toEqual(['alice@planit.app'])

      // Votes counted for 2026-11-16 should be 1 (bob only)
      expect(getPinVoteCount(pinDate1, '2026-11-16')).toBe(1)
      expect(getPinVoters(pinDate1, '2026-11-16')).toEqual(['bob@planit.app'])

      // Votes for 2026-11-17 should be 0
      expect(getPinVoteCount(pinDate1, '2026-11-17')).toBe(0)
    })

    it('returns all votes when pin has no specific date and no filterDate provided', () => {
      const undatedPin: Pin = {
        ...basePin,
        date: undefined,
        votes: [
          {
            id: 'v1',
            pinId: basePin.id,
            userId: 'u1',
            userEmail: 'alice@planit.app',
            createdAt: '2026-11-01T00:00:00Z',
          },
        ],
      }

      expect(getPinVotes(undatedPin)).toHaveLength(1)
      expect(getPinVoteCount(undatedPin)).toBe(1)
    })
  })
})
