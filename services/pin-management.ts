/**
 * @file services/pin-management.ts
 * @brief Service layer for editing, deleting, and checking authorization on trip pins.
 */

import { Pin, isValidCoordinate } from '@/types/map'

export interface PinUpdateData {
  name?: string
  description?: string
  category?: Pin['category']
  lat?: number
  lng?: number
  date?: string
}

/**
 * @brief Checks if a specific user has permission to edit a pin.
 * For confirmed pins, only organizers can edit.
 * For proposed pins, the user who proposed the pin (or an organizer) can edit.
 * @param pin The target pin.
 * @param userEmail The user's email.
 * @param isOrganizer Whether the user is the trip organizer.
 * @return True if permitted to edit, false otherwise.
 */
export function canEditPin(
  pin: Pin,
  userEmail?: string,
  isOrganizer = false
): boolean {
  if (!userEmail) return false
  if (pin.isConfirmed) {
    return isOrganizer
  }
  return pin.proposedBy === userEmail || isOrganizer
}

/**
 * @brief Checks if a specific user has permission to delete a pin.
 * For confirmed pins, only organizers can delete.
 * For proposed pins, the user who proposed the pin or an organizer can delete.
 * @param pin The target pin.
 * @param userEmail The user's email.
 * @param isOrganizer Whether the user is the trip organizer.
 * @return True if permitted to delete, false otherwise.
 */
export function canDeletePin(
  pin: Pin,
  userEmail?: string,
  isOrganizer = false
): boolean {
  if (!userEmail) return false
  if (pin.isConfirmed) {
    return isOrganizer
  }
  return pin.proposedBy === userEmail || isOrganizer
}

/**
 * @brief Updates a pin's fields in a list of pins.
 * @param pins Array of pins.
 * @param pinId The identifier of the pin to update.
 * @param data New pin data fields.
 * @return New array of pins with the target pin updated.
 */
export function applyPinUpdate(
  pins: Pin[],
  pinId: string,
  data: PinUpdateData
): Pin[] {
  return pins.map((p) => {
    if (p.id !== pinId) return p

    const updatedLat = data.lat !== undefined && isValidCoordinate(data.lat, p.lng) ? data.lat : p.lat
    const updatedLng = data.lng !== undefined && isValidCoordinate(p.lat, data.lng) ? data.lng : p.lng

    return {
      ...p,
      name: data.name !== undefined && data.name.trim() ? data.name.trim() : p.name,
      description: data.description !== undefined ? data.description : p.description,
      category: data.category || p.category,
      lat: updatedLat,
      lng: updatedLng,
      date: data.date !== undefined ? data.date : p.date,
    }
  })
}

/**
 * @brief Deletes a pin from a list of pins.
 * @param pins Array of pins.
 * @param pinId The identifier of the pin to delete.
 * @return New array of pins with the target pin removed.
 */
export function applyPinDeletion(pins: Pin[], pinId: string): Pin[] {
  return pins.filter((p) => p.id !== pinId)
}
