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

function validateAnswers(tripId: string, answers: AvailabilityAnswer[]): string | null {
  if (!tripId) {
    return 'Trip ID is required.'
  }

  if (answers.length === 0) {
    return 'Choose your availability for at least one day.'
  }

  const hasInvalid = answers.some(
    (answer) => !isValidIsoDate(answer.day) || !CHOICES.includes(answer.choice)
  )
  if (hasInvalid) {
    return 'Invalid availability answer.'
  }

  return null
}

async function verifyMemberAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tripId: string,
  userId: string
): Promise<string | null> {
  const { data: membership, error: membershipError } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', tripId)
    .eq('user_id', userId)
    .maybeSingle()

  if (membershipError || !membership) {
    return 'Only trip members can submit availability.'
  }

  return null
}

async function validateAgainstCandidateWindows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tripId: string,
  answers: AvailabilityAnswer[]
): Promise<string | null> {
  const { data: windows, error: windowsError } = await supabase
    .from('trip_date_windows')
    .select('start_date, end_date')
    .eq('trip_id', tripId)

  if (windowsError) {
    console.error('Error fetching date windows:', windowsError)
    return 'Failed to load the candidate dates.'
  }

  const windowList = windows ?? []
  const isInsideWindow = (day: string) =>
    windowList.some((w) => day >= w.start_date && day <= w.end_date)

  if (answers.some((answer) => !isInsideWindow(answer.day))) {
    return 'Availability can only be set for days inside a candidate window.'
  }

  return null
}

async function persistAvailability(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tripId: string,
  userId: string,
  answers: AvailabilityAnswer[]
): Promise<string | null> {
  const answered = answers.filter(
    (answer): answer is { day: string; choice: 'available' | 'unavailable' } =>
      answer.choice !== 'none'
  )
  const cleared = answers
    .filter((answer) => answer.choice === 'none')
    .map((answer) => answer.day)

  if (answered.length > 0) {
    const { error } = await supabase.from('trip_availability').upsert(
      answered.map((answer) => ({
        trip_id: tripId,
        user_id: userId,
        day: answer.day,
        status: answer.choice,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'trip_id,user_id,day' }
    )

    if (error) {
      console.error('Error saving availability:', error)
      return 'Failed to save your availability.'
    }
  }

  if (cleared.length > 0) {
    const { error } = await supabase
      .from('trip_availability')
      .delete()
      .eq('trip_id', tripId)
      .eq('user_id', userId)
      .in('day', cleared)

    if (error) {
      console.error('Error clearing availability:', error)
      return 'Failed to save your availability.'
    }
  }

  return null
}

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
  const validationError = validateAnswers(tripId, answers)
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

  const memberError = await verifyMemberAccess(supabase, tripId, user.id)
  if (memberError) {
    return { error: memberError }
  }

  const windowError = await validateAgainstCandidateWindows(supabase, tripId, answers)
  if (windowError) {
    return { error: windowError }
  }

  const saveError = await persistAvailability(supabase, tripId, user.id, answers)
  if (saveError) {
    return { error: saveError }
  }

  revalidatePath(`/trips/${tripId}`)
  return { success: true }
}
