'use server'

/**
 * @file app/trips/actions/pin-comments.ts
 * @brief Server actions for commenting on a pin and deleting one's own comments.
 */

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { mapPinCommentRow, type PinCommentRow } from '@/services/pin-mappers'
import { MAX_COMMENT_LENGTH } from '@/utils/pin-comments'
import type { PinComment } from '@/types/map'

export interface PinCommentResult {
  success?: boolean
  error?: string
  comment?: PinComment
}

type ServerClient = Awaited<ReturnType<typeof createClient>>

const COMMENT_SELECT = 'id, pin_id, user_id, author_name, body, created_at'

/**
 * @brief Resolves the name shown next to a comment: the username, or the part of the email before the @.
 */
async function resolveAuthorName(
  supabase: ServerClient,
  user: { id: string; email?: string | null }
): Promise<string> {
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  const username = typeof data?.username === 'string' ? data.username.trim() : ''
  if (username) return username
  return user.email ? user.email.split('@')[0] : 'Traveler'
}

/**
 * @brief Adds a comment under a pin. Only members of the pin's trip can comment, as themselves.
 * @param tripId The trip the pin belongs to.
 * @param pinId The pin being commented on.
 * @param body The comment text (1 to 1000 characters once trimmed).
 * @return PinCommentResult with the saved comment or an error message.
 */
export async function addPinCommentAction(
  tripId: string,
  pinId: string,
  body: string
): Promise<PinCommentResult> {
  const text = typeof body === 'string' ? body.trim() : ''

  if (!tripId || !pinId) {
    return { error: 'Trip ID and Pin ID are required.' }
  }
  if (!text) {
    return { error: 'Write a comment before sending it.' }
  }
  if (text.length > MAX_COMMENT_LENGTH) {
    return { error: `Comments can have at most ${MAX_COMMENT_LENGTH} characters.` }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Authentication required.' }
  }

  const authorName = await resolveAuthorName(supabase, user)

  const { data, error } = await supabase
    .from('pin_comments')
    .insert({ pin_id: pinId, user_id: user.id, author_name: authorName, body: text })
    .select(COMMENT_SELECT)
    .single()

  if (error || !data) {
    console.error('Error adding pin comment:', error)
    return { error: 'Failed to add the comment.' }
  }

  revalidatePath(`/trips/${tripId}/map`)
  return { success: true, comment: mapPinCommentRow(data as PinCommentRow) }
}

/**
 * @brief Deletes a comment. Only its author can delete it, and it disappears for every member.
 * @param tripId The trip the pin belongs to.
 * @param commentId The comment to delete.
 * @return PinCommentResult with success or an error message.
 */
export async function deletePinCommentAction(
  tripId: string,
  commentId: string
): Promise<PinCommentResult> {
  if (!tripId || !commentId) {
    return { error: 'Trip ID and comment ID are required.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Authentication required.' }
  }

  const { data: existing, error: lookupError } = await supabase
    .from('pin_comments')
    .select('id, user_id')
    .eq('id', commentId)
    .maybeSingle()

  if (lookupError) {
    console.error('Error loading pin comment:', lookupError)
    return { error: 'Failed to delete the comment.' }
  }
  if (!existing) {
    return { error: 'Comment not found.' }
  }
  if (existing.user_id !== user.id) {
    return { error: 'You can only delete your own comments.' }
  }

  const { error: deleteError } = await supabase
    .from('pin_comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id)

  if (deleteError) {
    console.error('Error deleting pin comment:', deleteError)
    return { error: 'Failed to delete the comment.' }
  }

  revalidatePath(`/trips/${tripId}/map`)
  return { success: true }
}
