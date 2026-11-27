'use server'

/**
 * @file app/trips/actions/manage-pins.ts
 * @brief Server actions for editing and deleting trip pins.
 */

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { PinCategory, isPinCategory, isValidCoordinate } from '@/types/map'

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

function isValidAuthContext(context: Awaited<ReturnType<typeof getAuthAndPin>>): context is {
  supabase: NonNullable<Awaited<ReturnType<typeof getAuthAndPin>>['supabase']>
  user: NonNullable<Awaited<ReturnType<typeof getAuthAndPin>>['user']>
  trip: NonNullable<Awaited<ReturnType<typeof getAuthAndPin>>['trip']>
  pin: NonNullable<Awaited<ReturnType<typeof getAuthAndPin>>['pin']>
} {
  return !context.error && Boolean(context.supabase && context.user && context.trip && context.pin)
}

function checkPinPermission(
  trip: { organizer_id: string },
  pin: { proposed_by: string; is_confirmed?: boolean | null },
  user: { id: string; email?: string | null },
  action: 'edit' | 'delete'
): string | null {
  const isOrganizer = trip.organizer_id === user.id
  const userEmail = user.email || ''
  const isCreator = pin.proposed_by === userEmail || pin.proposed_by === user.id

  if (pin.is_confirmed && !isOrganizer) {
    return action === 'edit'
      ? 'Only the trip organizer can edit a confirmed pin.'
      : 'Only the trip organizer can delete a confirmed pin.'
  }

  if (!isCreator && !isOrganizer) {
    return action === 'edit'
      ? 'You do not have permission to edit this pin.'
      : 'You do not have permission to delete this pin.'
  }

  return null
}

function validatePinUpdateInput(input: PinUpdateInput): string | null {
  if (input.lat !== undefined && input.lng !== undefined) {
    if (!isValidCoordinate(input.lat, input.lng)) {
      return 'Invalid geographical coordinates.'
    }
  }

  if (input.name !== undefined && !input.name.trim()) {
    return 'Pin name cannot be empty.'
  }

  if (input.category !== undefined && !isPinCategory(input.category)) {
    return 'Choose a valid category for the pin.'
  }

  return null
}

function buildPinUpdatePayload(input: PinUpdateInput): Record<string, unknown> {
  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name.trim()
  if (input.description !== undefined) updates.description = input.description
  if (input.category !== undefined) updates.category = input.category
  if (input.lat !== undefined) updates.lat = input.lat
  if (input.lng !== undefined) updates.lng = input.lng
  if (input.date !== undefined) updates.date = input.date
  return updates
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
  if (!isValidAuthContext(context)) {
    return { error: context.error }
  }

  const permError = checkPinPermission(context.trip, context.pin, context.user, 'edit')
  if (permError) {
    return { error: permError }
  }

  const inputError = validatePinUpdateInput(input)
  if (inputError) {
    return { error: inputError }
  }

  const updates = buildPinUpdatePayload(input)

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
  if (!isValidAuthContext(context)) {
    return { error: context.error }
  }

  const permError = checkPinPermission(context.trip, context.pin, context.user, 'delete')
  if (permError) {
    return { error: permError }
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
