'use server'

/**
 * @file app/trips/actions/pins.ts
 * @brief Server actions for creating pins, committing them to the itinerary, and fetching pins (US-3.3).
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { Pin, PinCategory } from '@/types/map'

export interface CreatePinResult {
  pin?: Pin
  error?: string
}

export interface ToggleCommitResult {
  success?: boolean
  commited?: boolean
  error?: string
}

export interface GetPinsResult {
  pins?: Pin[]
  error?: string
}

/**
 * @brief Creates a new proposed pin in the database associated with a trip.
 * @param tripId The ID of the target trip.
 * @param pinData Geographical and descriptive metadata of the pin.
 * @return CreatePinResult containing the saved Pin or an error message.
 */
export async function createPinAction(
  tripId: string,
  pinData: {
    name: string
    lat: number
    lng: number
    category?: PinCategory
    description?: string
    date?: string
  }
): Promise<CreatePinResult> {
  if (!tripId) {
    return { error: 'Trip ID is required.' }
  }

  if (
    !pinData ||
    !pinData.name ||
    typeof pinData.lat !== 'number' ||
    typeof pinData.lng !== 'number' ||
    Number.isNaN(pinData.lat) ||
    Number.isNaN(pinData.lng)
  ) {
    return { error: 'Pin name, latitude, and longitude are required.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Authentication required.' }
  }

  const userEmail = user.email || 'member@planit.app'
  const category = pinData.category || 'sightseeing'

  const { data, error } = await supabase
    .from('pins')
    .insert({
      trip_id: tripId,
      name: pinData.name,
      category,
      lat: pinData.lat,
      lng: pinData.lng,
      description: pinData.description || null,
      date: pinData.date || null,
      proposed_by: userEmail,
      commited: false,
    })
    .select('*')
    .single()

  if (error) {
    console.error('Error creating pin:', error)
    return { error: `Could not create pin: ${error.message}` }
  }

  revalidatePath(`/trips/${tripId}/itinerary`)

  const newPin: Pin = {
    id: data.id,
    tripId: data.trip_id,
    name: data.name,
    description: data.description || undefined,
    date: data.date || undefined,
    category: data.category as PinCategory,
    lat: data.lat,
    lng: data.lng,
    proposedBy: data.proposed_by,
    createdAt: data.created_at,
    commited: Boolean(data.commited),
    committed: Boolean(data.commited),
    votes: [],
  }

  return { pin: newPin }
}

/**
 * @brief Toggles the "commited" state of a pin. Only the trip organizer can perform this.
 * When committed, the pin officially becomes part of the trip itinerary.
 * @param tripId The unique identifier of the trip.
 * @param pinId The unique identifier of the pin.
 * @return ToggleCommitResult containing the updated state or an error.
 */
export async function toggleCommitPinAction(
  tripId: string,
  pinId: string
): Promise<ToggleCommitResult> {
  if (!tripId || !pinId) {
    return { error: 'Trip ID and Pin ID are required.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Authentication required.' }
  }

  // Verify that the current user is the trip organizer
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('organizer_id')
    .eq('id', tripId)
    .maybeSingle()

  if (tripError) {
    console.error('Error verifying trip organizer:', tripError)
    return { error: `Could not verify trip organizer: ${tripError.message}` }
  }

  if (!trip || trip.organizer_id !== user.id) {
    return { error: 'Only the trip organizer can commit pins to the itinerary.' }
  }

  // Fetch current commited state of the pin
  const { data: pin, error: pinError } = await supabase
    .from('pins')
    .select('commited')
    .eq('id', pinId)
    .eq('trip_id', tripId)
    .maybeSingle()

  if (pinError || !pin) {
    console.error('Error fetching pin:', pinError)
    return { error: 'Pin not found.' }
  }

  const nextStatus = !pin.commited

  const { error: updateError } = await supabase
    .from('pins')
    .update({ commited: nextStatus })
    .eq('id', pinId)
    .eq('trip_id', tripId)

  if (updateError) {
    console.error('Error updating pin commit status:', updateError)
    return { error: `Could not update pin status: ${updateError.message}` }
  }

  revalidatePath(`/trips/${tripId}/itinerary`)
  return { success: true, commited: nextStatus }
}

/**
 * @brief Fetches all pins and their associated votes for a given trip.
 * @param tripId The unique identifier of the trip.
 * @return GetPinsResult containing an array of formatted Pin objects.
 */
export async function getPinsAction(tripId: string): Promise<GetPinsResult> {
  if (!tripId) {
    return { error: 'Trip ID is required.' }
  }

  const supabase = await createClient()
  const { data: dbPins, error: pinsError } = await supabase
    .from('pins')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true })

  if (pinsError) {
    console.error('Error fetching trip pins:', pinsError)
    return { error: `Could not fetch pins: ${pinsError.message}` }
  }

  const pinIds = (dbPins || []).map((p) => p.id)
  let dbVotes: Array<{
    id: string
    pin_id: string
    user_id: string
    user_email: string
    trip_date: string | null
    created_at: string
  }> = []

  if (pinIds.length > 0) {
    const { data: votes, error: votesError } = await supabase
      .from('pin_votes')
      .select('*')
      .in('pin_id', pinIds)

    if (votesError) {
      console.error('Error fetching pin votes:', votesError)
    } else {
      dbVotes = votes || []
    }
  }

  const pins: Pin[] = (dbPins || []).map((row) => ({
    id: row.id,
    tripId: row.trip_id,
    name: row.name,
    description: row.description || undefined,
    date: row.date || undefined,
    category: (row.category || 'sightseeing') as PinCategory,
    lat: row.lat,
    lng: row.lng,
    proposedBy: row.proposed_by,
    createdAt: row.created_at,
    commited: Boolean(row.commited),
    committed: Boolean(row.commited),
    votes: dbVotes
      .filter((v) => v.pin_id === row.id)
      .map((v) => ({
        id: v.id,
        pinId: v.pin_id,
        userId: v.user_id,
        userEmail: v.user_email,
        date: v.trip_date || undefined,
        createdAt: v.created_at,
      })),
  }))

  return { pins }
}
