'use client'

/**
 * @file app/trips/[id]/lock-dates.tsx
 * @brief Official trip dates: shown to every member, locked and unlocked by the organizer (US-2.3).
 */

import { useState, useTransition } from 'react'
import { lockTripDates, unlockTripDates } from '@/app/trips/actions/lock-dates'
import { DATES_LOCKED_STATE, validateLockRange } from '@/utils/trip-lock'
import type { DateWindow } from '@/utils/date-windows'

interface LockDatesProps {
  tripId: string
  isOrganizer: boolean
  windows: DateWindow[]
  lockedStart: string | null
  lockedEnd: string | null
  itineraryDayCount: number
}

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 [color-scheme:light] outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100'

/**
 * @brief Formats a YYYY-MM-DD date for display.
 * @param value The ISO calendar date.
 * @return A human readable date such as "12 Dec 2026".
 */
function formatDate(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * @brief Shows the official dates of the trip and lets the organizer lock or unlock them.
 * @param props Component properties with the lock state, the candidate windows and the viewer's role.
 */
export function LockDates({
  tripId,
  isOrganizer,
  windows,
  lockedStart,
  lockedEnd,
  itineraryDayCount,
}: LockDatesProps) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const isLocked = lockedStart !== null && lockedEnd !== null

  /**
   * @brief Validates the chosen range, asks for confirmation and locks the dates.
   */
  const handleLock = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const startDate = String(formData.get('startDate') ?? '')
    const endDate = String(formData.get('endDate') ?? '')

    const validationError = validateLockRange(startDate, endDate, windows)
    if (validationError) {
      setError(validationError)
      return
    }

    if (
      !window.confirm(
        `Lock the trip dates from ${formatDate(startDate)} to ${formatDate(endDate)}? ` +
          'Members will no longer be able to change their availability.'
      )
    ) {
      return
    }

    startTransition(async () => {
      const result = await lockTripDates(tripId, startDate, endDate)
      setError(result.error ?? null)
    })
  }

  /**
   * @brief Asks for confirmation and unlocks the dates.
   */
  const handleUnlock = () => {
    if (
      !window.confirm(
        'Unlock the trip dates? The itinerary days will be removed and members can edit their availability again.'
      )
    ) {
      return
    }

    startTransition(async () => {
      const result = await unlockTripDates(tripId)
      setError(result.error ?? null)
    })
  }

  return (
    <section className="mt-8 rounded-3xl bg-white p-7 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold text-gray-900">Trip dates</h2>
        {isLocked && (
          <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            {DATES_LOCKED_STATE}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      )}

      {isLocked ? (
        <div className="mt-4">
          <p className="text-lg font-semibold text-gray-900">
            {formatDate(lockedStart)} → {formatDate(lockedEnd)}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {itineraryDayCount} itinerary {itineraryDayCount === 1 ? 'day' : 'days'} created.
            Availability and candidate dates are read-only.
          </p>
          {isOrganizer && (
            <button
              type="button"
              disabled={isPending}
              onClick={handleUnlock}
              className="mt-5 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-red-200 hover:text-red-700 disabled:opacity-50"
            >
              {isPending ? 'Unlocking…' : 'Unlock dates'}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-2">
          <p className="text-sm text-gray-500">
            {isOrganizer
              ? 'Once the group has answered, lock the final dates to start planning the itinerary.'
              : 'The organizer has not locked the trip dates yet.'}
          </p>

          {isOrganizer && (
            <form
              noValidate
              onSubmit={handleLock}
              className="mt-5 grid gap-4 sm:grid-cols-2"
            >
              <div>
                <label htmlFor="lock-start" className="mb-2 block text-sm font-medium text-gray-700">
                  Trip start
                </label>
                <input id="lock-start" name="startDate" type="date" className={inputClass} />
              </div>
              <div>
                <label htmlFor="lock-end" className="mb-2 block text-sm font-medium text-gray-700">
                  Trip end
                </label>
                <input id="lock-end" name="endDate" type="date" className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
                >
                  {isPending ? 'Locking…' : 'Lock dates'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </section>
  )
}
