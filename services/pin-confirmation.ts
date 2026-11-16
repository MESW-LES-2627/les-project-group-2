/**
 * @file services/pin-confirmation.ts
 * @brief Service layer for committing winning pins to trip itinerary and reverting them.
 */

import { Pin } from '@/types/map'

/**
 * @brief Checks whether a pin is confirmed.
 * @param pin The target pin.
 * @return True if confirmed, false otherwise.
 */
export function isPinConfirmed(pin: Pin): boolean {
  return Boolean(pin.isConfirmed)
}

/**
 * @brief Confirms a pin so it becomes part of the official trip itinerary.
 * @param pin The target pin to confirm.
 * @return Updated Pin object with isConfirmed set to true.
 */
export function confirmPin(pin: Pin): Pin {
  return {
    ...pin,
    isConfirmed: true,
  }
}

/**
 * @brief Reverts a confirmed pin back to proposed state so voting reopens.
 * @param pin The target pin to revert.
 * @return Updated Pin object with isConfirmed set to false.
 */
export function revertPin(pin: Pin): Pin {
  return {
    ...pin,
    isConfirmed: false,
  }
}

/**
 * @brief Filters an array of pins to only those that are confirmed.
 * @param pins Array of pins.
 * @return Array of confirmed pins.
 */
export function getConfirmedPins(pins: Pin[]): Pin[] {
  return pins.filter(isPinConfirmed)
}

/**
 * @brief Filters an array of pins to only those that are proposed (not confirmed).
 * @param pins Array of pins.
 * @return Array of proposed pins.
 */
export function getProposedPins(pins: Pin[]): Pin[] {
  return pins.filter((p) => !p.isConfirmed)
}
