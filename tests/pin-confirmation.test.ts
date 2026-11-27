/**
 * @file tests/pin-confirmation.test.ts
 * @brief Unit tests for pin confirmation service functions.
 */

import { describe, it, expect } from 'vitest'
import {
  isPinConfirmed,
  confirmPin,
  revertPin,
  getConfirmedPins,
  getProposedPins,
} from '@/services/pin-confirmation'
import { Pin } from '@/types/map'

describe('Pin Confirmation Service', () => {
  const basePin: Pin = {
    id: 'pin-1',
    tripId: 'trip-1',
    name: 'Belém Tower',
    category: 'visit',
    lat: 38.6916,
    lng: -9.216,
    proposedBy: 'pedro@planit.app',
    createdAt: '2026-11-15T00:00:00Z',
    votes: [],
    isConfirmed: false,
  }

  it('correctly detects whether a pin is confirmed', () => {
    expect(isPinConfirmed(basePin)).toBe(false)
    expect(isPinConfirmed({ ...basePin, isConfirmed: true })).toBe(true)
    expect(isPinConfirmed({ ...basePin, isConfirmed: undefined })).toBe(false)
  })

  it('confirms a pin', () => {
    const confirmed = confirmPin(basePin)
    expect(confirmed.isConfirmed).toBe(true)
    expect(confirmed.id).toBe(basePin.id)
    expect(confirmed.name).toBe(basePin.name)
  })

  it('reverts a confirmed pin back to proposed state', () => {
    const confirmed = confirmPin(basePin)
    const reverted = revertPin(confirmed)
    expect(reverted.isConfirmed).toBe(false)
  })

  it('filters confirmed and proposed pins from a list', () => {
    const pin2: Pin = { ...basePin, id: 'pin-2', isConfirmed: true }
    const pin3: Pin = { ...basePin, id: 'pin-3', isConfirmed: false }

    const list = [basePin, pin2, pin3]
    const confirmed = getConfirmedPins(list)
    const proposed = getProposedPins(list)

    expect(confirmed).toHaveLength(1)
    expect(confirmed[0].id).toBe('pin-2')

    expect(proposed).toHaveLength(2)
    expect(proposed.map((p) => p.id)).toEqual(['pin-1', 'pin-3'])
  })
})
