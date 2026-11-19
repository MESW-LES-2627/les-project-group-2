'use client'

/**
 * @file components/map/PinVoteCard.tsx
 * @brief Interactive card for viewing pin details, casting and removing votes directly on the map.
 */

import React, { useState } from 'react'
import {
  Pin,
  getCategoryLabel,
  getCategoryColor,
  getPinVoteCount,
  getPinVoters,
  hasUserVoted,
  isPinCommitted,
} from '@/types/map'
import { toggleVoteOnPin } from '@/services/pin-votes'
import { toggleCommitPinAction } from '@/app/trips/actions/pins'
import { togglePinVoteAction } from '@/app/trips/actions/vote-pin'

interface PinVoteCardProps {
  pin: Pin
  currentUserEmail?: string
  currentUserId?: string
  isOrganizer?: boolean
  tripId?: string
  onVoteChange?: (updatedPin: Pin) => void
  onClose?: () => void
}

/**
 * @brief In-place pin details and voting card rendered directly over the map workspace.
 * @param props Component properties containing target pin and callbacks.
 */
export function PinVoteCard({
  pin,
  currentUserEmail = 'member@planit.app',
  currentUserId,
  isOrganizer = false,
  tripId,
  onVoteChange,
  onClose,
}: PinVoteCardProps) {
  const [currentPin, setCurrentPin] = useState<Pin>(pin)
  const [isCommitting, setIsCommitting] = useState(false)

  const voteCount = getPinVoteCount(currentPin)
  const voters = getPinVoters(currentPin)
  const userHasVoted = hasUserVoted(currentPin, currentUserEmail)
  const isCommitted = isPinCommitted(currentPin)

  /**
   * @brief Handles toggling vote on the pin for the current user and persisting to database.
   */
  const handleToggleVote = () => {
    const updated = toggleVoteOnPin(
      currentPin,
      {
        id: currentUserId || currentUserEmail,
        email: currentUserEmail,
      },
      currentPin.date
    )
    setCurrentPin(updated)
    onVoteChange?.(updated)

    const effectiveTripId = tripId
    if (effectiveTripId && effectiveTripId !== 'default') {
      togglePinVoteAction(effectiveTripId, currentPin.id, currentPin.date).catch((err) => {
        console.error('Failed to cast vote on database:', err)
      })
    }
  }

  /**
   * @brief Handles toggling the commit status of the pin for trip organizers.
   */
  const handleToggleCommit = async () => {
    setIsCommitting(true)
    const nextStatus = !isCommitted
    const effectiveTripId = tripId

    if (effectiveTripId && effectiveTripId !== 'default') {
      try {
        await toggleCommitPinAction(effectiveTripId, currentPin.id)
      } catch (err) {
        console.error('Failed to toggle commit status:', err)
      }
    }

    const updated: Pin = {
      ...currentPin,
      commited: nextStatus,
      committed: nextStatus,
    }
    setCurrentPin(updated)
    onVoteChange?.(updated)
    setIsCommitting(false)
  }

  const categoryColor = isCommitted ? '#ef4444' : getCategoryColor(currentPin.category)

  return (
    <div
      data-testid="pin-vote-card"
      className="absolute bottom-6 left-6 z-[850] w-80 max-w-[calc(100vw-3rem)] rounded-2xl bg-white/95 p-5 shadow-2xl backdrop-blur-md border border-slate-200 transition-all text-slate-900"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: categoryColor }}
            />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {getCategoryLabel(currentPin.category)}
            </span>
            {isCommitted && (
              <span
                data-testid="pin-committed-badge"
                className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700"
              >
                In itinerary
              </span>
            )}
          </div>
          <h3
            data-testid="pin-name"
            className="text-base font-bold text-slate-900 truncate"
            title={currentPin.name}
          >
            {currentPin.name}
          </h3>
        </div>

        {onClose && (
          <button
            type="button"
            data-testid="close-pin-card"
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Close pin card"
          >
            ✕
          </button>
        )}
      </div>

      {/* Date badge if pin is scoped to a specific date */}
      {currentPin.date && (
        <div
          data-testid="pin-date-badge"
          className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
        >
          <span>📅</span>
          <span>{currentPin.date}</span>
        </div>
      )}

      {currentPin.description && (
        <p className="mt-2 text-xs text-slate-600 leading-relaxed line-clamp-2">
          {currentPin.description}
        </p>
      )}

      {/* Organizer Commit Section */}
      {isOrganizer && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-slate-700">
              Itinerary:
            </span>
            <p className="text-[11px] text-slate-500">
              {isCommitted ? 'Part of itinerary' : 'Not committed'}
            </p>
          </div>

          <button
            type="button"
            data-testid="toggle-commit-pin-button"
            onClick={handleToggleCommit}
            disabled={isCommitting}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-sm transition ${
              isCommitted
                ? 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {isCommitted ? 'Uncommit' : 'Commit'}
          </button>
        </div>
      )}

      {/* Voting Section */}
      <div className="mt-3.5 pt-3 border-t border-slate-100">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span
              data-testid="pin-vote-count"
              className="text-sm font-bold text-slate-900"
            >
              {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
            </span>
            <p
              data-testid="pin-voters"
              className="text-[11px] text-slate-500 truncate max-w-[170px]"
              title={voters.length > 0 ? voters.join(', ') : 'No votes yet'}
            >
              {voters.length > 0 ? `Voted by: ${voters.join(', ')}` : 'No votes yet'}
            </p>
          </div>

          <button
            type="button"
            data-testid="vote-pin-button"
            onClick={handleToggleVote}
            className={`rounded-full px-4 py-2 text-xs font-semibold shadow-sm transition ${
              userHasVoted
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {userHasVoted ? 'Remove vote' : 'Vote'}
          </button>
        </div>
      </div>
    </div>
  )
}
