'use server'

/**
 * @file app/trips/actions/pin-confirmation.ts
 * @brief Server actions for confirming and reverting trip itinerary pins.
 */

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface PinConfirmationResult {
  success?: boolean
  error?: string
}

/**
 * @brief Verifies that the caller is authenticated and is the organizer of the trip.
 * @param tripId The ID of the target trip.
 * @return Object with supabase client, user, trip or error message.
 */
async function authorizeOrganizer(tripId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Authentication required.' }
  }

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, organizer_id')
    .eq('id', tripId)
    .maybeSingle()

  if (tripError || !trip) {
    return { error: 'Trip not found.' }
  }

  if (trip.organizer_id !== user.id) {
    return { error: 'Only the trip organizer can confirm or revert pins.' }
  }

  return { supabase, user, trip }
}

/**
 * @brief Confirms a proposed pin to become part of the official trip itinerary.
 * Only the trip organizer is authorized to perform this operation.
 * @param tripId The unique identifier of the trip.
 * @param pinId The unique identifier of the pin.
 * @return PinConfirmationResult with success flag or error message.
 */
export async function confirmPinAction(
  tripId: string,
  pinId: string
): Promise<PinConfirmationResult> {
  if (!tripId || !pinId) {
    return { error: 'Trip ID and Pin ID are required.' }
  }

  const auth = await authorizeOrganizer(tripId)
  if (auth.error || !auth.supabase) {
    return { error: auth.error }
  }

  const { data, error } = await auth.supabase
    .from('pins')
    .update({ is_confirmed: true })
    .eq('id', pinId)
    .eq('trip_id', tripId)
    .select('id')

  if (error || !data || data.length === 0) {
    console.error('Error confirming pin:', error)
    return { error: 'Failed to confirm pin.' }
  }

  revalidatePath(`/trips/${tripId}/map`)
  return { success: true }
}

/**
 * @brief Reverts a confirmed pin back to proposed status, reopening voting.
 * Only the trip organizer is authorized to perform this operation.
 * @param tripId The unique identifier of the trip.
 * @param pinId The unique identifier of the pin.
 * @return PinConfirmationResult with success flag or error message.
 */
export async function revertPinAction(
  tripId: string,
  pinId: string
): Promise<PinConfirmationResult> {
  if (!tripId || !pinId) {
    return { error: 'Trip ID and Pin ID are required.' }
  }

  const auth = await authorizeOrganizer(tripId)
  if (auth.error || !auth.supabase) {
    return { error: auth.error }
  }

  const { data, error } = await auth.supabase
    .from('pins')
    .update({ is_confirmed: false })
    .eq('id', pinId)
    .eq('trip_id', tripId)
    .select('id')

  if (error || !data || data.length === 0) {
    console.error('Error reverting pin:', error)
    return { error: 'Failed to revert pin.' }
  }

  revalidatePath(`/trips/${tripId}/map`)
  return { success: true }
}
