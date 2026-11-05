/**
 * @file services/pin-votes.ts
 * @brief Service layer for in-place pin voting logic, ensuring idempotency and date scoping.
 */

import { Pin, PinVote, hasUserVoted } from '@/types/map'

export interface VoterIdentity {
  id?: string
  email: string
}

/**
 * @brief Toggles a vote on a pin for a user. If voted, removes vote; otherwise casts vote.
 * Prevents duplicate voting and scopes votes to the specific trip date if applicable.
 * @param pin The target pin.
 * @param voter The voter's identity (id and email).
 * @param targetDate Optional trip date context (defaults to pin.date).
 * @return Updated Pin instance with modified votes.
 */
export function toggleVoteOnPin(
  pin: Pin,
  voter: VoterIdentity,
  targetDate?: string
): Pin {
  if (!voter.email) return pin

  const effectiveDate = targetDate || pin.date
  const currentVotes = pin.votes ? [...pin.votes] : []
  const alreadyVoted = hasUserVoted(pin, voter.email, effectiveDate)

  if (alreadyVoted) {
    // Remove vote for this user and effective date
    const updatedVotes = currentVotes.filter((vote) => {
      const voteDate = vote.date || pin.date
      const isMatch = vote.userEmail === voter.email && voteDate === effectiveDate
      return !isMatch
    })
    return {
      ...pin,
      votes: updatedVotes,
    }
  }

  // Add new vote ensuring uniqueness
  const newVote: PinVote = {
    id: `vote-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    pinId: pin.id,
    userId: voter.id || voter.email,
    userEmail: voter.email,
    date: effectiveDate,
    createdAt: new Date().toISOString(),
  }

  return {
    ...pin,
    votes: [...currentVotes, newVote],
  }
}

/**
 * @brief Adds a vote to a pin idempotently. If already voted, returns unchanged pin.
 * @param pin The target pin.
 * @param voter The voter's identity.
 * @param targetDate Optional trip date context.
 * @return Updated or unchanged Pin instance.
 */
export function addVoteToPin(
  pin: Pin,
  voter: VoterIdentity,
  targetDate?: string
): Pin {
  const effectiveDate = targetDate || pin.date
  if (hasUserVoted(pin, voter.email, effectiveDate)) {
    return pin
  }
  return toggleVoteOnPin(pin, voter, effectiveDate)
}

/**
 * @brief Removes an existing vote from a pin for a specific user and date.
 * @param pin The target pin.
 * @param userEmail The email of the voter whose vote should be removed.
 * @param targetDate Optional trip date context.
 * @return Updated Pin instance.
 */
export function removeVoteFromPin(
  pin: Pin,
  userEmail: string,
  targetDate?: string
): Pin {
  const effectiveDate = targetDate || pin.date
  if (!hasUserVoted(pin, userEmail, effectiveDate)) {
    return pin
  }
  return toggleVoteOnPin(pin, { email: userEmail }, effectiveDate)
}
