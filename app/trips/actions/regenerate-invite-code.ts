'use server'

/**
 * @file app/trips/actions/regenerate-invite-code.ts
 * @brief Server action for regenerating a trip's invite code.
 */

import { createClient } from '@/utils/supabase/server'
import { generateInviteCode } from '@/utils/invite-code'
import { revalidatePath } from 'next/cache'

export type RegenerateCodeResult = {
  success?: boolean
  error?: string
  newCode?: string
}

/**
 * @brief Regenerates the invite code for a trip. The previous code stops working immediately.
 * Only the trip organizer is authorized to perform this operation.
 * @param tripId The unique identifier of the trip.
 * @return RegenerateCodeResult containing new code or error message.
 */
export async function regenerateInviteCode(tripId: string): Promise<RegenerateCodeResult> {
  if (!tripId) {
    return { error: 'Trip ID is required.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Authentication required.' }
  }

  // Verify that the caller is the organizer
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, organizer_id')
    .eq('id', tripId)
    .maybeSingle()

  if (tripError || !trip) {
    return { error: 'Trip not found.' }
  }

  if (trip.organizer_id !== user.id) {
    return { error: 'Only the organizer can regenerate the invite code.' }
  }

  const newCode = generateInviteCode()

  const { error: updateError } = await supabase
    .from('trips')
    .update({
      invite_code: newCode,
      updated_at: new Date().toISOString(),
    })
    .eq('id', tripId)

  if (updateError) {
    console.error('Error updating invite code:', updateError)
    return { error: 'Failed to update invite code.' }
  }

  revalidatePath(`/trips/${tripId}`)
  return { success: true, newCode }
}
