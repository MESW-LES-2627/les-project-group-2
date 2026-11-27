/**
 * @file tests/pin-management.test.ts
 * @brief Unit tests for pin management service functions (permissions, edit, delete).
 */

import { describe, it, expect } from 'vitest'
import {
  canEditPin,
  canDeletePin,
  applyPinUpdate,
  applyPinDeletion,
} from '@/services/pin-management'
import { Pin } from '@/types/map'

describe('Pin Management Service', () => {
  const proposedPin: Pin = {
    id: 'pin-1',
    tripId: 'trip-1',
    name: 'Belém Tower',
    category: 'visit',
    lat: 38.6916,
    lng: -9.216,
    proposedBy: 'author@planit.app',
    createdAt: '2026-11-15T00:00:00Z',
    votes: [],
    isConfirmed: false,
  }

  const confirmedPin: Pin = {
    ...proposedPin,
    id: 'pin-confirmed',
    isConfirmed: true,
  }

  describe('canEditPin', () => {
    it('returns false when userEmail is empty or undefined', () => {
      expect(canEditPin(proposedPin, undefined, false)).toBe(false)
      expect(canEditPin(proposedPin, '', false)).toBe(false)
    })

    it('allows author to edit their own proposed pin', () => {
      expect(canEditPin(proposedPin, 'author@planit.app', false)).toBe(true)
    })

    it('allows organizer to edit any proposed pin', () => {
      expect(canEditPin(proposedPin, 'organizer@planit.app', true)).toBe(true)
    })

    it('denies other members from editing someone else proposed pin', () => {
      expect(canEditPin(proposedPin, 'other@planit.app', false)).toBe(false)
    })

    it('only allows organizer to edit confirmed pins', () => {
      // Author who proposed it cannot edit once confirmed
      expect(canEditPin(confirmedPin, 'author@planit.app', false)).toBe(false)
      // Other member cannot edit
      expect(canEditPin(confirmedPin, 'other@planit.app', false)).toBe(false)
      // Organizer can edit
      expect(canEditPin(confirmedPin, 'organizer@planit.app', true)).toBe(true)
    })
  })

  describe('canDeletePin', () => {
    it('returns false when userEmail is empty or undefined', () => {
      expect(canDeletePin(proposedPin, undefined, false)).toBe(false)
    })

    it('allows author to delete their own proposed pin', () => {
      expect(canDeletePin(proposedPin, 'author@planit.app', false)).toBe(true)
    })

    it('allows organizer to delete a proposed pin', () => {
      expect(canDeletePin(proposedPin, 'organizer@planit.app', true)).toBe(true)
    })

    it('denies other members from deleting someone else proposed pin', () => {
      expect(canDeletePin(proposedPin, 'other@planit.app', false)).toBe(false)
    })

    it('only allows organizer to delete confirmed pins', () => {
      expect(canDeletePin(confirmedPin, 'author@planit.app', false)).toBe(false)
      expect(canDeletePin(confirmedPin, 'organizer@planit.app', true)).toBe(true)
    })
  })

  describe('applyPinUpdate', () => {
    it('updates name, description, category, and valid coordinates', () => {
      const pins = [proposedPin]
      const updated = applyPinUpdate(pins, 'pin-1', {
        name: 'New Tower Name',
        description: 'New Description',
        category: 'activity',
        lat: 38.7,
        lng: -9.2,
      })

      expect(updated[0].name).toBe('New Tower Name')
      expect(updated[0].description).toBe('New Description')
      expect(updated[0].category).toBe('activity')
      expect(updated[0].lat).toBe(38.7)
      expect(updated[0].lng).toBe(-9.2)
    })

    it('preserves existing values when invalid or undefined updates provided', () => {
      const pins = [proposedPin]
      const updated = applyPinUpdate(pins, 'pin-1', {
        name: '   ',
        lat: 999, // invalid latitude
      })

      expect(updated[0].name).toBe(proposedPin.name)
      expect(updated[0].lat).toBe(proposedPin.lat)
    })

    it('leaves other pins unchanged', () => {
      const pin2: Pin = { ...proposedPin, id: 'pin-2', name: 'Other' }
      const updated = applyPinUpdate([proposedPin, pin2], 'pin-1', { name: 'Updated' })

      expect(updated[0].name).toBe('Updated')
      expect(updated[1].name).toBe('Other')
    })
  })

  describe('applyPinDeletion', () => {
    it('removes the specified pin by ID', () => {
      const pin2: Pin = { ...proposedPin, id: 'pin-2' }
      const updated = applyPinDeletion([proposedPin, pin2], 'pin-1')

      expect(updated).toHaveLength(1)
      expect(updated[0].id).toBe('pin-2')
    })
  })
})
