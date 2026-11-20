'use server'

/**
 * @file app/trips/actions/manage-pins.ts
 * @brief Server actions for editing and deleting trip pins.
 */

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { PinCategory, isValidCoordinate } from '@/types/map'

export interface PinUpdateInput {
  name?: string
  description?: string
  category?: PinCategory
  lat?: number
  lng?: number
  date?: string
}

export interface PinOperationResult {
  success?: boolean
  error?: string
}

/**
 * @brief Verifies caller authentication and fetches trip and pin records.
 * @param tripId The trip ID.
 * @param pinId The pin ID.
 * @return Auth context or error.
 */
async function getAuthAndPin(tripId: string, pinId: string) {
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

  const { data: pin, error: pinError } = await supabase
    .from('pins')
    .select('id, trip_id, proposed_by, is_confirmed')
    .eq('id', pinId)
    .maybeSingle()

  if (pinError || !pin) {
    return { error: 'Pin not found.' }
  }

  return { supabase, user, trip, pin }
}

/**
 * @brief Updates an existing pin's properties (name, description, category, location, date).
 * Ensures only the creator (for proposed pins) or the trip organizer (for proposed and confirmed pins) can edit.
 * @param tripId The ID of the trip.
 * @param pinId The ID of the pin to edit.
 * @param input The updated fields.
 * @return PinOperationResult object.
 */
export async function updatePinAction(
  tripId: string,
  pinId: string,
  input: PinUpdateInput
): Promise<PinOperationResult> {
  if (!tripId || !pinId) {
    return { error: 'Trip ID and Pin ID are required.' }
  }

  const context = await getAuthAndPin(tripId, pinId)
  if (context.error || !context.supabase || !context.user || !context.trip || !context.pin) {
    return { error: context.error }
  }

  const isOrganizer = context.trip.organizer_id === context.user.id
  const isCreator =
    context.pin.proposed_by === (context.user.email || '') ||
    context.pin.proposed_by === context.user.id

  // Rule: If pin is confirmed, only organizer can edit.
  if (context.pin.is_confirmed && !isOrganizer) {
    return { error: 'Only the trip organizer can edit a confirmed pin.' }
  }

  // Rule: If proposed, only creator or organizer can edit.
  if (!isCreator && !isOrganizer) {
    return { error: 'You do not have permission to edit this pin.' }
  }

  // Validate coordinates if provided
  if (input.lat !== undefined && input.lng !== undefined) {
    if (!isValidCoordinate(input.lat, input.lng)) {
      return { error: 'Invalid geographical coordinates.' }
    }
  }

  // Validate name if provided
  if (input.name !== undefined && !input.name.trim()) {
    return { error: 'Pin name cannot be empty.' }
  }

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.description !== undefined) updates.description = input.description
  if (input.category !== undefined) updates.category = input.category
  if (input.lat !== undefined) updates.lat = input.lat
  if (input.lng !== undefined) updates.lng = input.lng
  if (input.date !== undefined) updates.date = input.date

  const { error: updateError } = await context.supabase
    .from('pins')
    .update(updates)
    .eq('id', pinId)
    .eq('trip_id', tripId)

  if (updateError) {
    console.error('Error updating pin:', updateError)
    return { error: 'Failed to update pin.' }
  }

  revalidatePath(`/trips/${tripId}/map`)
  return { success: true }
}

/**
 * @brief Deletes a pin and its associated votes from the trip.
 * Ensures creator or organizer can delete proposed pins, but only organizer can delete confirmed pins.
 * @param tripId The ID of the trip.
 * @param pinId The ID of the pin to delete.
 * @return PinOperationResult object.
 */
export async function deletePinAction(
  tripId: string,
  pinId: string
): Promise<PinOperationResult> {
  if (!tripId || !pinId) {
    return { error: 'Trip ID and Pin ID are required.' }
  }

  const context = await getAuthAndPin(tripId, pinId)
  if (context.error || !context.supabase || !context.user || !context.trip || !context.pin) {
    return { error: context.error }
  }

  const isOrganizer = context.trip.organizer_id === context.user.id
  const isCreator =
    context.pin.proposed_by === (context.user.email || '') ||
    context.pin.proposed_by === context.user.id

  // Rule: If pin is confirmed, only organizer can delete.
  if (context.pin.is_confirmed && !isOrganizer) {
    return { error: 'Only the trip organizer can delete a confirmed pin.' }
  }

  // Rule: If proposed, creator or organizer can delete.
  if (!isCreator && !isOrganizer) {
    return { error: 'You do not have permission to delete this pin.' }
  }

  // Delete votes associated with the pin first
  const { error: votesError } = await context.supabase
    .from('pin_votes')
    .delete()
    .eq('pin_id', pinId)

  if (votesError) {
    console.error('Error deleting pin votes:', votesError)
    return { error: 'Failed to delete pin votes.' }
  }

  // Delete pin
  const { error: deleteError } = await context.supabase
    .from('pins')
    .delete()
    .eq('id', pinId)
    .eq('trip_id', tripId)

  if (deleteError) {
    console.error('Error deleting pin:', deleteError)
    return { error: 'Failed to delete pin.' }
  }

  revalidatePath(`/trips/${tripId}/map`)
  return { success: true }
}
