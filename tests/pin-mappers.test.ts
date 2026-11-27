/**
 * @file tests/pin-mappers.test.ts
 * @brief Unit tests for mapping Supabase pin rows to client pin models.
 */

import { describe, it, expect } from 'vitest'
import {
  mapPinRow,
  mapPinRows,
  mapPinVoteRow,
  toPinCategory,
  type PinRow,
} from '@/services/pin-mappers'

describe('pin-mappers', () => {
  const voteRow = {
    id: 'vote-1',
    pin_id: 'pin-1',
    user_id: 'user-1',
    user_email: 'member@planit.app',
    trip_date: '2026-11-15',
    created_at: '2026-11-01T00:00:00Z',
  }

  const pinRow: PinRow = {
    id: 'pin-1',
    trip_id: 'trip-1',
    name: 'Torre de Belém',
    description: 'Iconic tower',
    date: '2026-11-15',
    category: 'visit',
    lat: 38.6916,
    lng: -9.216,
    proposed_by: 'organizer@planit.app',
    created_at: '2026-11-01T00:00:00Z',
    is_confirmed: true,
    pin_votes: [voteRow],
  }

  it('normalises supported and unsupported categories', () => {
    expect(toPinCategory('food')).toBe('food')
    expect(toPinCategory('meeting_point')).toBe('meeting_point')
    expect(toPinCategory('unknown')).toBe('visit')
    expect(toPinCategory(null)).toBe('visit')
  })

  it('maps the categories used before US-3.4 to the closest current one', () => {
    expect(toPinCategory('sightseeing')).toBe('visit')
    expect(toPinCategory('lodging')).toBe('stay')
    expect(toPinCategory('other')).toBe('visit')
  })

  it('maps a vote row', () => {
    expect(mapPinVoteRow(voteRow)).toEqual({
      id: 'vote-1',
      pinId: 'pin-1',
      userId: 'user-1',
      userEmail: 'member@planit.app',
      date: '2026-11-15',
      createdAt: '2026-11-01T00:00:00Z',
    })
  })

  it('maps a pin row including nested votes', () => {
    expect(mapPinRow(pinRow)).toEqual({
      id: 'pin-1',
      tripId: 'trip-1',
      name: 'Torre de Belém',
      description: 'Iconic tower',
      date: '2026-11-15',
      category: 'visit',
      lat: 38.6916,
      lng: -9.216,
      proposedBy: 'organizer@planit.app',
      createdAt: '2026-11-01T00:00:00Z',
      votes: [
        {
          id: 'vote-1',
          pinId: 'pin-1',
          userId: 'user-1',
          userEmail: 'member@planit.app',
          date: '2026-11-15',
          createdAt: '2026-11-01T00:00:00Z',
        },
      ],
      isConfirmed: true,
    })
  })

  it('applies defaults for optional fields and missing votes', () => {
    const mapped = mapPinRow({
      id: 'pin-2',
      trip_id: 'trip-1',
      name: 'Mystery place',
      category: null,
      lat: 0,
      lng: 0,
      proposed_by: 'member@planit.app',
    })

    expect(mapped.category).toBe('visit')
    expect(mapped.description).toBeUndefined()
    expect(mapped.date).toBeUndefined()
    expect(mapped.votes).toEqual([])
    expect(mapped.isConfirmed).toBe(false)
    expect(mapped.createdAt).toBe('')
  })

  it('maps arrays of rows', () => {
    expect(mapPinRows([pinRow])).toHaveLength(1)
    expect(mapPinRows([])).toEqual([])
  })
})
