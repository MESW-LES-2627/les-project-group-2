'use client'

/**
 * @file app/trips/[id]/availability-calendar.tsx
 * @brief Calendar where members mark their availability and see everyone's overlaps (US-2.2).
 */

import { useState, useTransition } from 'react'
import { saveAvailability } from '@/app/trips/actions/availability'
import type { AvailabilityChoice, CalendarDay } from '@/utils/availability'

interface AvailabilityCalendarProps {
  tripId: string
  days: CalendarDay[]
  missing: string[]
  memberCount: number
  myAnswers: Record<string, 'available' | 'unavailable'>
}

const choices: { value: AvailabilityChoice; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'unavailable', label: 'Unavailable' },
  { value: 'none', label: 'No answer' },
]

/**
 * @brief Formats a YYYY-MM-DD day for display.
 * @param value The ISO calendar date.
 * @return A human readable day such as "Wed, 1 Jul 2099".
 */
function formatDay(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/**
 * @brief Shows one card per candidate day with who is available, plus the caller's own answer.
 * @param props Component properties with the calendar days, missing members and the caller's answers.
 */
export function AvailabilityCalendar({
  tripId,
  days,
  missing,
  memberCount,
  myAnswers,
}: AvailabilityCalendarProps) {
  const [draft, setDraft] = useState<Record<string, AvailabilityChoice>>(myAnswers)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  /**
   * @brief Sends only the days whose answer differs from the saved one.
   */
  const handleSave = () => {
    const changed = days
      .map(({ day }) => ({ day, choice: draft[day] ?? 'none' }))
      .filter(({ day, choice }) => choice !== (myAnswers[day] ?? 'none'))

    if (changed.length === 0) {
      setMessage({ type: 'success', text: 'No changes to save.' })
      return
    }

    startTransition(async () => {
      const result = await saveAvailability(tripId, changed)
      setMessage(
        result.error
          ? { type: 'error', text: result.error }
          : { type: 'success', text: 'Your availability was saved.' }
      )
    })
  }

  return (
    <section className="mt-8 rounded-3xl bg-white p-7 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-gray-900">Availability</h2>
      <p className="mt-1 text-sm text-gray-500">
        Mark the days that work for you and see where the group overlaps.
      </p>

      {missing.length > 0 && (
        <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Still waiting for: <span className="font-semibold">{missing.join(', ')}</span>
        </p>
      )}

      {message && (
        <p
          role={message.type === 'error' ? 'alert' : 'status'}
          className={`mt-4 rounded-xl p-4 text-sm ${
            message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'
          }`}
        >
          {message.text}
        </p>
      )}

      <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {days.map(({ day, available, unavailable }) => (
          <li key={day} className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-gray-900">{formatDay(day)}</h3>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {available.length}/{memberCount} available
              </span>
            </div>

            <p className="mt-2 text-sm text-gray-600">
              {available.length > 0 ? available.join(', ') : 'Nobody yet'}
            </p>
            {unavailable.length > 0 && (
              <p className="mt-1 text-xs text-gray-400">Unavailable: {unavailable.join(', ')}</p>
            )}

            <label htmlFor={`answer-${day}`} className="sr-only">
              Your availability on {formatDay(day)}
            </label>
            <select
              id={`answer-${day}`}
              value={draft[day] ?? 'none'}
              onChange={(event) =>
                setDraft({ ...draft, [day]: event.target.value as AvailabilityChoice })
              }
              className="mt-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {choices.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="mt-6 rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
      >
        Save my availability
      </button>
    </section>
  )
}
