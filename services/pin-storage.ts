/**
 * @file services/pin-storage.ts
 * @brief Service layer for persisting and retrieving trip map pins.
 */

import { Pin } from '@/types/map'

const STORAGE_KEY_PREFIX = 'planit_trip_pins_'

/**
 * @brief Default initial pins for demo trips in Portugal.
 */
export const DEFAULT_PORTUGAL_PINS: Pin[] = [
  {
    id: 'pin-default-1',
    tripId: 'default',
    name: 'Torre de Belém',
    description: 'Iconic 16th-century fortified tower on the northern bank of the Tagus River.',
    date: '2026-11-15',
    category: 'sightseeing',
    lat: 38.6916,
    lng: -9.216,
    proposedBy: 'pedro@example.com',
    createdAt: new Date().toISOString(),
    votes: [
      {
        id: 'vote-default-1',
        pinId: 'pin-default-1',
        userId: 'pedro@example.com',
        userEmail: 'pedro@example.com',
        date: '2026-11-15',
        createdAt: new Date().toISOString(),
      },
    ],
  },
  {
    id: 'pin-default-2',
    tripId: 'default',
    name: 'Livraria Lello',
    description: 'Historical bookstore in Porto known for its magnificent neo-gothic wooden staircase.',
    date: '2026-11-17',
    category: 'sightseeing',
    lat: 41.1469,
    lng: -8.6148,
    proposedBy: 'daniel@example.com',
    createdAt: new Date().toISOString(),
    votes: [],
  },
  {
    id: 'pin-default-3',
    tripId: 'default',
    name: 'Pastéis de Belém',
    description: 'Famous historic bakery serving traditional Portuguese custard tarts since 1837.',
    date: '2026-11-15',
    category: 'food',
    lat: 38.6975,
    lng: -9.2032,
    proposedBy: 'cassia@example.com',
    createdAt: new Date().toISOString(),
    votes: [],
  },
]

/**
 * @brief Resolves the localStorage key for a specific trip.
 * @param tripId The unique identifier of the trip.
 * @return Local storage key string.
 */
export function getStorageKey(tripId: string): string {
  return `${STORAGE_KEY_PREFIX}${tripId}`
}

/**
 * @brief Loads all pins associated with a given trip ID.
 * @param tripId The unique identifier of the trip.
 * @return Array of pins.
 */
export function loadPinsForTrip(tripId: string): Pin[] {
  if (typeof window === 'undefined') {
    return tripId === 'default' ? DEFAULT_PORTUGAL_PINS : []
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(tripId))
    if (!raw) {
      // Seed default pins for default/demo trips if empty
      if (tripId === 'default') {
        savePinsForTrip(tripId, DEFAULT_PORTUGAL_PINS)
        return DEFAULT_PORTUGAL_PINS
      }
      return []
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    console.error('Failed to load pins from storage:', error)
    return []
  }
}

/**
 * @brief Saves the full list of pins for a given trip ID to local storage.
 * @param tripId The unique identifier of the trip.
 * @param pins Array of pins to persist.
 */
export function savePinsForTrip(tripId: string, pins: Pin[]): void {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(getStorageKey(tripId), JSON.stringify(pins))
  } catch (error) {
    console.error('Failed to save pins to storage:', error)
  }
}

/**
 * @brief Adds a new pin to a trip.
 * @param tripId The unique identifier of the trip.
 * @param newPin Pin creation data (without id/createdAt if auto-generated).
 * @return The created pin with unique ID and timestamp.
 */
export function addPinToTrip(tripId: string, newPin: Omit<Pin, 'id' | 'createdAt'>): Pin {
  const current = loadPinsForTrip(tripId)
  const pin: Pin = {
    ...newPin,
    id: `pin-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
  }

  const updated = [...current, pin]
  savePinsForTrip(tripId, updated)
  return pin
}

/**
 * @brief Removes a pin from a trip by its ID.
 * @param tripId The unique identifier of the trip.
 * @param pinId The unique identifier of the pin to remove.
 * @return Updated array of pins.
 */
export function removePinFromTrip(tripId: string, pinId: string): Pin[] {
  const current = loadPinsForTrip(tripId)
  const updated = current.filter((p) => p.id !== pinId)
  savePinsForTrip(tripId, updated)
  return updated
}
