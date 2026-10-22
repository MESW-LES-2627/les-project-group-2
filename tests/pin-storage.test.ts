/**
 * @file tests/pin-storage.test.ts
 * @brief Unit tests for pin local storage persistence and manipulation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getStorageKey,
  loadPinsForTrip,
  savePinsForTrip,
  addPinToTrip,
  removePinFromTrip,
  DEFAULT_PORTUGAL_PINS,
} from '@/services/pin-storage'
import { Pin } from '@/types/map'

describe('Pin Storage Service', () => {
  let mockStore: Record<string, string> = {}

  beforeEach(() => {
    mockStore = {}
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => mockStore[key] || null,
      setItem: (key: string, val: string) => {
        mockStore[key] = val
      },
      removeItem: (key: string) => {
        delete mockStore[key]
      },
      clear: () => {
        mockStore = {}
      },
    })
  })

  it('computes correct storage key prefix for trip', () => {
    expect(getStorageKey('trip-123')).toBe('planit_trip_pins_trip-123')
  })

  it('loads default pins for default trip when storage is empty', () => {
    const pins = loadPinsForTrip('default')
    expect(pins.length).toBeGreaterThan(0)
    expect(pins[0].name).toBe(DEFAULT_PORTUGAL_PINS[0].name)
  })

  it('returns empty array for an empty non-default trip', () => {
    const pins = loadPinsForTrip('custom-trip')
    expect(pins).toEqual([])
  })

  it('handles invalid JSON gracefully', () => {
    mockStore[getStorageKey('custom-trip')] = 'invalid-json'
    const pins = loadPinsForTrip('custom-trip')
    expect(pins).toEqual([])
  })

  it('saves and loads pins accurately', () => {
    const samplePins: Pin[] = [
      {
        id: 'p-1',
        tripId: 'trip-abc',
        name: 'Miradouro de Santa Luzia',
        description: 'Great viewpoint in Alfama',
        category: 'sightseeing',
        lat: 38.7116,
        lng: -9.1303,
        proposedBy: 'pedro@example.com',
        createdAt: '2026-10-22T10:00:00Z',
      },
    ]

    savePinsForTrip('trip-abc', samplePins)
    const loaded = loadPinsForTrip('trip-abc')
    expect(loaded).toEqual(samplePins)
  })

  it('adds a new pin and assigns unique ID and timestamp', () => {
    const added = addPinToTrip('trip-xyz', {
      tripId: 'trip-xyz',
      name: 'Pena Palace',
      category: 'sightseeing',
      lat: 38.7876,
      lng: -9.3906,
      proposedBy: 'cassia@example.com',
    })

    expect(added.id).toBeDefined()
    expect(added.createdAt).toBeDefined()
    expect(added.name).toBe('Pena Palace')

    const current = loadPinsForTrip('trip-xyz')
    expect(current).toHaveLength(1)
    expect(current[0].name).toBe('Pena Palace')
  })

  it('removes a pin correctly by id', () => {
    const p1 = addPinToTrip('trip-del', {
      tripId: 'trip-del',
      name: 'Place 1',
      category: 'food',
      lat: 38.7,
      lng: -9.1,
      proposedBy: 'daniel@example.com',
    })

    const p2 = addPinToTrip('trip-del', {
      tripId: 'trip-del',
      name: 'Place 2',
      category: 'activity',
      lat: 38.8,
      lng: -9.2,
      proposedBy: 'goncalo@example.com',
    })

    expect(loadPinsForTrip('trip-del')).toHaveLength(2)

    const updated = removePinFromTrip('trip-del', p1.id)
    expect(updated).toHaveLength(1)
    expect(updated[0].id).toBe(p2.id)
  })
})
