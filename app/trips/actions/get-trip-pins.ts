'use server'

/**
 * @file app/trips/actions/get-trip-pins.ts
 * @brief Loads a trip's pins (with votes) from Supabase for server components.
 */

import { createClient } from '@/utils/supabase/server'
import { mapPinRows, type PinRow } from '@/services/pin-mappers'
import type { Pin } from '@/types/map'

const PIN_SELECT = `
  id,
  trip_id,
  name,
  description,
  date,
  category,
  lat,
  lng,
  proposed_by,
  created_at,
  is_confirmed,
  pin_votes (
    id,
    pin_id,
    user_id,
    user_email,
    trip_date,
    created_at
  ),
  pin_comments (
    id,
    pin_id,
    user_id,
    author_name,
    body,
    created_at
  )
`

/**
 * @brief Fetches every pin belonging to a trip, including its votes.
 * @param tripId The unique identifier of the trip.
 * @return Array of Pin objects, or an empty array when the trip has no pins.
 */
export async function getTripPins(tripId: string): Promise<Pin[]> {
  if (!tripId) {
    return []
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('pins')
      .select(PIN_SELECT)
      .eq('trip_id', tripId)

    if (error) {
      console.error('Error loading trip pins:', error)
      return []
    }

    return mapPinRows(Array.isArray(data) ? (data as PinRow[]) : [])
  } catch (error) {
    console.error('Unexpected error loading trip pins:', error)
    return []
  }
}
