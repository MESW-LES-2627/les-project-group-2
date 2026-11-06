'use server'

/**
 * @file app/trips/actions/date-windows.ts
 * @brief Server actions for proposing, editing and deleting candidate date windows (US-2.1).
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { validateDateWindow } from '@/utils/date-windows'

export type DateWindowResult = {
  success?: boolean
  error?: string
}

/**
 * @brief Checks that the caller is authenticated and is the organizer of the trip.
 * @param tripId The unique identifier of the trip.
 * @return The Supabase client and user on success, or an error message.
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
    return { error: 'Only the organizer can manage date windows.' }
  }

  return { supabase, user }
}

/**
 * @brief Proposes a new candidate date window. Only the trip organizer may do this.
 * @param tripId The unique identifier of the trip.
 * @param startDate The first day of the window (YYYY-MM-DD).
 * @param endDate The last day of the window (YYYY-MM-DD).
 * @return DateWindowResult with success flag or an error message.
 */
export async function addDateWindow(
  tripId: string,
  startDate: string,
  endDate: string
): Promise<DateWindowResult> {
  if (!tripId) {
    return { error: 'Trip ID is required.' }
  }

  const validationError = validateDateWindow(startDate, endDate)
  if (validationError) {
    return { error: validationError }
  }

  const auth = await authorizeOrganizer(tripId)
  if ('error' in auth) {
    return { error: auth.error }
  }

  const { error } = await auth.supabase.from('trip_date_windows').insert({
    trip_id: tripId,
    start_date: startDate,
    end_date: endDate,
    created_by: auth.user.id,
  })

  if (error) {
    console.error('Error adding date window:', error)
    return { error: 'Failed to add the date window.' }
  }

  revalidatePath(`/trips/${tripId}`)
  return { success: true }
}

/**
 * @brief Edits an existing candidate date window. Only the trip organizer may do this.
 * @param tripId The unique identifier of the trip.
 * @param windowId The unique identifier of the date window.
 * @param startDate The new first day of the window (YYYY-MM-DD).
 * @param endDate The new last day of the window (YYYY-MM-DD).
 * @return DateWindowResult with success flag or an error message.
 */
export async function updateDateWindow(
  tripId: string,
  windowId: string,
  startDate: string,
  endDate: string
): Promise<DateWindowResult> {
  if (!tripId || !windowId) {
    return { error: 'Trip ID and window ID are required.' }
  }

  const validationError = validateDateWindow(startDate, endDate)
  if (validationError) {
    return { error: validationError }
  }

  const auth = await authorizeOrganizer(tripId)
  if ('error' in auth) {
    return { error: auth.error }
  }

  const { data, error } = await auth.supabase
    .from('trip_date_windows')
    .update({
      start_date: startDate,
      end_date: endDate,
    })
    .eq('id', windowId)
    .eq('trip_id', tripId)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('Error updating date window:', error)
    return { error: 'Failed to update the date window.' }
  }

  if (!data) {
    return { error: 'Date window not found.' }
  }

  revalidatePath(`/trips/${tripId}`)
  return { success: true }
}

/**
 * @brief Deletes a candidate date window. Only the trip organizer may do this.
 * @param tripId The unique identifier of the trip.
 * @param windowId The unique identifier of the date window.
 * @return DateWindowResult with success flag or an error message.
 */
export async function deleteDateWindow(
  tripId: string,
  windowId: string
): Promise<DateWindowResult> {
  if (!tripId || !windowId) {
    return { error: 'Trip ID and window ID are required.' }
  }

  const auth = await authorizeOrganizer(tripId)
  if ('error' in auth) {
    return { error: auth.error }
  }

  const { data, error } = await auth.supabase
    .from('trip_date_windows')
    .delete()
    .eq('id', windowId)
    .eq('trip_id', tripId)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('Error deleting date window:', error)
    return { error: 'Failed to delete the date window.' }
  }

  if (!data) {
    return { error: 'Date window not found.' }
  }

  revalidatePath(`/trips/${tripId}`)
  return { success: true }
}
