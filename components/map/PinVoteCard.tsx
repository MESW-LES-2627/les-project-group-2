'use client'

/**
 * @file components/map/PinVoteCard.tsx
 * @brief Interactive card for viewing pin details, casting votes, editing/deleting pins, and confirming to the itinerary.
 */

import React, { useState } from 'react'
import {
  Pin,
  getCategoryLabel,
  getCategoryColor,
  getPinVoteCount,
  getPinVoters,
  hasUserVoted,
} from '@/types/map'
import { toggleVoteOnPin } from '@/services/pin-votes'
import { canEditPin, canDeletePin } from '@/services/pin-management'
import { Edit2, Trash2 } from 'lucide-react'

interface PinVoteCardProps {
  pin: Pin
  currentUserEmail?: string
  currentUserId?: string
  isOrganizer?: boolean
  onVoteChange?: (updatedPin: Pin) => void
  onConfirmToggle?: (updatedPin: Pin) => void
  onEdit?: (pin: Pin) => void
  onDelete?: (pinId: string) => void
  onClose?: () => void
}

/**
 * @brief In-place pin details, voting, edit, delete, and confirmation card rendered over the map workspace.
 * @param props Component properties containing target pin and callbacks.
 */
export function PinVoteCard({
  pin,
  currentUserEmail = 'member@planit.app',
  currentUserId,
  isOrganizer = false,
  onVoteChange,
  onConfirmToggle,
  onEdit,
  onDelete,
  onClose,
}: PinVoteCardProps) {
  const [prevPin, setPrevPin] = useState<Pin>(pin)
  const [currentPin, setCurrentPin] = useState<Pin>(pin)

  if (pin !== prevPin) {
    setPrevPin(pin)
    setCurrentPin(pin)
  }

  const voteCount = getPinVoteCount(currentPin)
  const voters = getPinVoters(currentPin)
  const userHasVoted = hasUserVoted(currentPin, currentUserEmail)
  const isConfirmed = Boolean(currentPin.isConfirmed)
  const canEdit = canEditPin(currentPin, currentUserEmail, isOrganizer)
  const canDelete = canDeletePin(currentPin, currentUserEmail, isOrganizer)

  /**
   * @brief Handles toggling vote on the pin for the current user.
   */
  const handleToggleVote = () => {
    if (isConfirmed) return
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
  }

  /**
   * @brief Handles confirming the pin to become part of the official itinerary.
   */
  const handleConfirm = () => {
    const updated: Pin = {
      ...currentPin,
      isConfirmed: true,
    }
    setCurrentPin(updated)
    onConfirmToggle?.(updated)
  }

  /**
   * @brief Handles reverting a confirmed pin back to proposed state.
   */
  const handleRevert = () => {
    const updated: Pin = {
      ...currentPin,
      isConfirmed: false,
    }
    setCurrentPin(updated)
    onConfirmToggle?.(updated)
  }

  const categoryColor = getCategoryColor(currentPin.category)

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

            {isConfirmed && (
              <span
                data-testid="pin-confirmed-badge"
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 border border-amber-300"
              >
                ★ Confirmed Spot
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

      {/* Voting Section */}
      <div className="mt-4 pt-3.5 border-t border-slate-100">
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

          {isConfirmed ? (
            <span
              data-testid="voting-closed-badge"
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500 border border-slate-200"
            >
              Voting closed
            </span>
          ) : (
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
          )}
        </div>
      </div>

      {/* Edit and Delete Actions */}
      {(canEdit || canDelete) && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          {canEdit && (
            <button
              type="button"
              data-testid="edit-pin-button"
              onClick={() => onEdit?.(currentPin)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              title="Edit pin details"
            >
              <Edit2 className="h-3 w-3" />
              <span>Edit</span>
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              data-testid="delete-pin-button"
              onClick={() => onDelete?.(currentPin.id)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 transition"
              title="Delete pin"
            >
              <Trash2 className="h-3 w-3" />
              <span>Delete</span>
            </button>
          )}
        </div>
      )}

      {/* Organizer Action: Confirm or Revert Pin */}
      {isOrganizer && (
        <div className="mt-3.5 pt-3 border-t border-slate-100">
          {!isConfirmed ? (
            <button
              type="button"
              data-testid="confirm-pin-button"
              onClick={handleConfirm}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3 py-2 text-xs font-bold text-white shadow-sm transition"
            >
              <span>★</span>
              <span>Confirm Spot</span>
            </button>
          ) : (
            <button
              type="button"
              data-testid="revert-pin-button"
              onClick={handleRevert}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 border border-slate-300 transition"
            >
              <span>↺</span>
              <span>Revert to Proposed</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
