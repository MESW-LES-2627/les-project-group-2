'use server'

/**
 * @file app/trips/actions/join-trip.ts
 * @brief Server action for joining a trip via an invite code.
 */

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export type JoinTripResult = {
  success?: boolean
  error?: string
  tripId?: string
}

/**
 * @brief Joins a trip using an invite code.
 * @param code The trip invite code.
 * @return JoinTripResult object or redirects on success.
 */
export async function joinTripByCode(code: string): Promise<JoinTripResult> {
  const trimmed = (code ?? '').trim().toUpperCase()
  if (!trimmed) {
    return { error: 'Please enter an invite code.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect(`/entry?redirectTo=${encodeURIComponent(`/trips/join?code=${trimmed}`)}`)
  }

  // Find trip by invite code
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, name, organizer_id')
    .eq('invite_code', trimmed)
    .maybeSingle()

  if (tripError || !trip) {
    return { error: 'Invalid or revoked invite code.' }
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('trip_members')
    .select('id')
    .eq('trip_id', trip.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!existingMember) {
    const { error: joinError } = await supabase.from('trip_members').insert({
      trip_id: trip.id,
      user_id: user.id,
      role: trip.organizer_id === user.id ? 'organizer' : 'member',
    })

    if (joinError) {
      console.error('Error joining trip:', joinError)
      return { error: 'Failed to join trip. Please try again.' }
    }
  }

  try {
    revalidatePath(`/trips/${trip.id}`)
  } catch {
    // revalidatePath cannot be called during a page render pass
  }
  redirect(`/trips/${trip.id}`)
}

/**
 * @brief Server action wrapper for FormData submission to join a trip.
 * @param prevState Previous state.
 * @param formData FormData containing 'code'.
 */
export async function joinTripFormAction(
  prevState: JoinTripResult | null,
  formData: FormData
): Promise<JoinTripResult> {
  const code = String(formData.get('code') ?? '')
  return joinTripByCode(code)
}
