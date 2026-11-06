'use server'

/**
 * @file app/trips/actions/availability.ts
 * @brief Server action for saving a member's availability over the candidate dates (US-2.2).
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { isValidIsoDate } from '@/utils/date-windows'
import type { AvailabilityChoice } from '@/utils/availability'

export type AvailabilityAnswer = {
  day: string
  choice: AvailabilityChoice
}

export type AvailabilityResult = {
  success?: boolean
  error?: string
}

const CHOICES: AvailabilityChoice[] = ['available', 'unavailable', 'none']

/**
 * @brief Saves the caller's availability. Days marked `none` have their answer removed.
 * Only members of the trip can answer, and only for days inside a candidate window.
 * @param tripId The unique identifier of the trip.
 * @param answers The days to update with the chosen availability for each.
 * @return AvailabilityResult with success flag or an error message.
 */
export async function saveAvailability(
  tripId: string,
  answers: AvailabilityAnswer[]
): Promise<AvailabilityResult> {
  if (!tripId) {
    return { error: 'Trip ID is required.' }
  }

  if (answers.length === 0) {
    return { error: 'Choose your availability for at least one day.' }
  }

  if (answers.some((answer) => !isValidIsoDate(answer.day) || !CHOICES.includes(answer.choice))) {
    return { error: 'Invalid availability answer.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Authentication required.' }
  }

  const { data: membership, error: membershipError } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (membershipError || !membership) {
    return { error: 'Only trip members can submit availability.' }
  }

  const { data: windows, error: windowsError } = await supabase
    .from('trip_date_windows')
    .select('start_date, end_date')
    .eq('trip_id', tripId)

  if (windowsError) {
    console.error('Error fetching date windows:', windowsError)
    return { error: 'Failed to load the candidate dates.' }
  }

  const insideWindow = (day: string) =>
    (windows ?? []).some((window) => day >= window.start_date && day <= window.end_date)

  if (answers.some((answer) => !insideWindow(answer.day))) {
    return { error: 'Availability can only be set for days inside a candidate window.' }
  }

  const answered = answers.filter(
    (answer): answer is { day: string; choice: 'available' | 'unavailable' } =>
      answer.choice !== 'none'
  )
  const cleared = answers.filter((answer) => answer.choice === 'none').map((answer) => answer.day)

  if (answered.length > 0) {
    const { error } = await supabase.from('trip_availability').upsert(
      answered.map((answer) => ({
        trip_id: tripId,
        user_id: user.id,
        day: answer.day,
        status: answer.choice,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'trip_id,user_id,day' }
    )

    if (error) {
      console.error('Error saving availability:', error)
      return { error: 'Failed to save your availability.' }
    }
  }

  if (cleared.length > 0) {
    const { error } = await supabase
      .from('trip_availability')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .in('day', cleared)

    if (error) {
      console.error('Error clearing availability:', error)
      return { error: 'Failed to save your availability.' }
    }
  }

  revalidatePath(`/trips/${tripId}`)
  return { success: true }
}
