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

async function findExistingVote(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pinId: string,
  userId: string,
  targetDate?: string
) {
  let query = supabase
    .from('pin_votes')
    .select('id')
    .eq('pin_id', pinId)
    .eq('user_id', userId)

  if (targetDate) {
    query = query.eq('trip_date', targetDate)
  }

  return await query.maybeSingle()
}

async function applyVoteToggle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  existingVoteId: string | null,
  pinId: string,
  user: { id: string; email?: string | null },
  targetDate?: string
): Promise<{ error?: string; voted?: boolean }> {
  if (existingVoteId) {
    const { error: deleteError } = await supabase
      .from('pin_votes')
      .delete()
      .eq('id', existingVoteId)

    if (deleteError) {
      console.error('Error removing pin vote:', deleteError)
      return { error: 'Failed to remove vote.' }
    }
    return { voted: false }
  }

  const userEmail = user.email ? user.email : 'anonymous@planit.app'
  const { error: insertError } = await supabase.from('pin_votes').insert({
    pin_id: pinId,
    user_id: user.id,
    user_email: userEmail,
    trip_date: targetDate ? targetDate : null,
  })

  if (insertError) {
    console.error('Error casting pin vote:', insertError)
    return { error: 'Failed to cast vote.' }
  }
  return { voted: true }
}

async function fetchPinVoters(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pinId: string,
  targetDate?: string
): Promise<string[]> {
  let countQuery = supabase
    .from('pin_votes')
    .select('user_email')
    .eq('pin_id', pinId)

  if (targetDate) {
    countQuery = countQuery.eq('trip_date', targetDate)
  }

  const { data: allVotes } = await countQuery
  if (!allVotes) {
    return []
  }
  return allVotes.map((v) => v.user_email)
}

async function checkPinConfirmed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pinId: string
): Promise<string | null> {
  const { data: pinRecord, error: pinError } = await supabase
    .from('pins')
    .select('is_confirmed')
    .eq('id', pinId)
    .maybeSingle()

  if (pinError) {
    console.error('Error checking pin status:', pinError)
    return 'Failed to verify pin status.'
  }

  if (pinRecord?.is_confirmed) {
    return 'Voting is closed because this pin has been confirmed.'
  }

  return null
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

  const confirmError = await checkPinConfirmed(supabase, pinId)
  if (confirmError) {
    return { error: confirmError }
  }

  const { data: existingVote, error: queryError } = await findExistingVote(
    supabase,
    pinId,
    user.id,
    targetDate
  )

  if (queryError) {
    console.error('Error querying pin vote:', queryError)
    return { error: 'Failed to query vote status.' }
  }

  const existingVoteId = existingVote ? existingVote.id : null
  const toggleRes = await applyVoteToggle(
    supabase,
    existingVoteId,
    pinId,
    user,
    targetDate
  )

  if (toggleRes.error) {
    return { error: toggleRes.error }
  }

  const voters = await fetchPinVoters(supabase, pinId, targetDate)

  revalidatePath(`/trips/${tripId}/map`)
  return {
    success: true,
    voted: toggleRes.voted,
    voteCount: voters.length,
    voters,
  }
}
