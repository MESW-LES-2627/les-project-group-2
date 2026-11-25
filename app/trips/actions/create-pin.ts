'use server'

/**
 * @file app/trips/actions/create-pin.ts
 * @brief Server action that persists a proposed map pin for a trip.
 */

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { isPinCategory, isValidCoordinate, type Pin, type PinCategory } from '@/types/map'
import { mapPinRow, type PinRow } from '@/services/pin-mappers'

export interface CreatePinInput {
  name: string
  description?: string
  date?: string
  category: PinCategory
  lat: number
  lng: number
}

export interface CreatePinResult {
  success?: boolean
  error?: string
  pin?: Pin
}

function validatePinInput(tripId: string, input: CreatePinInput): string | null {
  if (!tripId || !input?.name?.trim()) {
    return 'Trip ID and pin name are required.'
  }
  if (!isValidCoordinate(input.lat, input.lng)) {
    return 'Pin coordinates are invalid.'
  }
  if (!isPinCategory(input.category)) {
    return 'Choose a category for the pin.'
  }
  return null
}

function buildPinInsertPayload(tripId: string, input: CreatePinInput, userEmail: string) {
  return {
    trip_id: tripId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    date: input.date || null,
    category: input.category,
    lat: input.lat,
    lng: input.lng,
    proposed_by: userEmail,
  }
}

/**
 * @brief Inserts a new proposed pin for a trip.
 * @param tripId The trip receiving the pin.
 * @param input Pin details collected from the map or search bar.
 * @return CreatePinResult containing the persisted pin or an error message.
 */
export async function createPinAction(
  tripId: string,
  input: CreatePinInput
): Promise<CreatePinResult> {
  const validationError = validatePinInput(tripId, input)
  if (validationError) {
    return { error: validationError }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Authentication required.' }
  }

  const payload = buildPinInsertPayload(tripId, input, user.email ?? 'member@planit.app')

  const { data, error } = await supabase
    .from('pins')
    .insert(payload)
    .select(
      'id, trip_id, name, description, date, category, lat, lng, proposed_by, created_at, is_confirmed'
    )
    .single()

  if (error) {
    console.error('Error creating pin:', error)
    return { error: 'Failed to create pin.' }
  }

  revalidatePath(`/trips/${tripId}/map`)
  return { success: true, pin: mapPinRow(data as PinRow) }
}
