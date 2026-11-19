'use server'

/**
 * @file app/trips/actions/lock-dates.ts
 * @brief Server actions for locking and unlocking the official trip dates (US-2.3).
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { isValidIsoDate } from '@/utils/date-windows'

export type LockDatesResult = {
  success?: boolean
  error?: string
}

/** Postgres code raised by the `raise exception` statements of the lock functions. */
const RAISED_EXCEPTION = 'P0001'

/**
 * @brief Checks that the caller is authenticated.
 * @return The Supabase client on success, or an error message.
 */
async function authenticate() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Authentication required.' }
  }

  return { supabase }
}

/**
 * @brief Locks the official trip dates. Only the trip organizer may do this.
 * Locking creates one itinerary day per day of the range and freezes availability.
 * @param tripId The unique identifier of the trip.
 * @param startDate The first day of the trip (YYYY-MM-DD).
 * @param endDate The last day of the trip (YYYY-MM-DD).
 * @return LockDatesResult with success flag or an error message.
 */
export async function lockTripDates(
  tripId: string,
  startDate: string,
  endDate: string
): Promise<LockDatesResult> {
  if (!tripId) {
    return { error: 'Trip ID is required.' }
  }

  if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
    return { error: 'Dates must be valid calendar dates.' }
  }

  if (endDate < startDate) {
    return { error: 'The end date cannot be before the start date.' }
  }

  const auth = await authenticate()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const { error } = await auth.supabase.rpc('lock_trip_dates', {
    p_trip_id: tripId,
    p_start: startDate,
    p_end: endDate,
  })

  if (error) {
    console.error('Error locking trip dates:', error)
    return {
      error: error.code === RAISED_EXCEPTION ? error.message : 'Failed to lock the trip dates.',
    }
  }

  revalidatePath(`/trips/${tripId}`)
  return { success: true }
}

/**
 * @brief Unlocks the trip dates so members can edit their availability again.
 * Only the trip organizer may do this.
 * @param tripId The unique identifier of the trip.
 * @return LockDatesResult with success flag or an error message.
 */
export async function unlockTripDates(tripId: string): Promise<LockDatesResult> {
  if (!tripId) {
    return { error: 'Trip ID is required.' }
  }

  const auth = await authenticate()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const { error } = await auth.supabase.rpc('unlock_trip_dates', { p_trip_id: tripId })

  if (error) {
    console.error('Error unlocking trip dates:', error)
    return {
      error: error.code === RAISED_EXCEPTION ? error.message : 'Failed to unlock the trip dates.',
    }
  }

  revalidatePath(`/trips/${tripId}`)
  return { success: true }
}
