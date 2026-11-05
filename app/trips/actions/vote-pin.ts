'use server'

/**
 * @file app/trips/actions/vote-pin.ts
 * @brief Server action for in-place pin voting and vote removal.
 */

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface VotePinResult {
  success?: boolean
  error?: string
  voted?: boolean
  voteCount?: number
  voters?: string[]
}

/**
 * @brief Server action to toggle a vote on a proposed pin.
 * Enforces authentication, date scoping, and idempotency (prevents duplicate votes).
 * @param tripId The ID of the associated trip.
 * @param pinId The unique ID of the pin being voted on.
 * @param targetDate Optional trip date string (if pin is scoped to a specific date).
 * @return VotePinResult object.
 */
export async function togglePinVoteAction(
  tripId: string,
  pinId: string,
  targetDate?: string
): Promise<VotePinResult> {
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

  const userEmail = user.email || 'anonymous@planit.app'

  // Query existing vote for this user, pin, and targetDate
  let query = supabase
    .from('pin_votes')
    .select('id')
    .eq('pin_id', pinId)
    .eq('user_id', user.id)

  if (targetDate) {
    query = query.eq('trip_date', targetDate)
  }

  const { data: existingVote, error: queryError } = await query.maybeSingle()

  if (queryError) {
    console.error('Error querying pin vote:', queryError)
    return { error: 'Failed to query vote status.' }
  }

  let voted = false
  if (existingVote) {
    // Remove vote (AC 1)
    const { error: deleteError } = await supabase
      .from('pin_votes')
      .delete()
      .eq('id', existingVote.id)

    if (deleteError) {
      console.error('Error removing pin vote:', deleteError)
      return { error: 'Failed to remove vote.' }
    }
    voted = false
  } else {
    // Insert new vote (AC 1 & AC 2)
    const { error: insertError } = await supabase.from('pin_votes').insert({
      pin_id: pinId,
      user_id: user.id,
      user_email: userEmail,
      trip_date: targetDate || null,
    })

    if (insertError) {
      console.error('Error casting pin vote:', insertError)
      return { error: 'Failed to cast vote.' }
    }
    voted = true
  }

  // Fetch updated votes for this pin and date
  let countQuery = supabase
    .from('pin_votes')
    .select('user_email')
    .eq('pin_id', pinId)

  if (targetDate) {
    countQuery = countQuery.eq('trip_date', targetDate)
  }

  const { data: allVotes } = await countQuery
  const voters = (allVotes || []).map((v) => v.user_email)

  revalidatePath(`/trips/${tripId}/map`)
  return {
    success: true,
    voted,
    voteCount: voters.length,
    voters,
  }
}
