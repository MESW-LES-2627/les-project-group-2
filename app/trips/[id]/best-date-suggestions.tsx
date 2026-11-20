'use client'

/**
 * @file app/trips/[id]/best-date-suggestions.tsx
 * @brief Ranked best-date suggestions the organizer can use to pre-fill the lock dates form (US-2.4).
 */

import type { DateSuggestion } from '@/utils/best-dates'

interface BestDateSuggestionsProps {
  suggestions: DateSuggestion[]
  tripLength: number
  hasAnswers: boolean
  onLengthChange: (length: number) => void
  onSelect: (suggestion: DateSuggestion) => void
}

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
 * @brief Lists the best date ranges for the chosen trip length, with who cannot attend each one.
 * @param props Component properties with the ranked suggestions and the callbacks to change the length or pick one.
 */
export function BestDateSuggestions({
  suggestions,
  tripLength,
  hasAnswers,
  onLengthChange,
  onSelect,
}: BestDateSuggestionsProps) {
  return (
    <div className="mt-8 border-t border-gray-100 pt-6">
      <h3 className="text-base font-bold text-gray-900">Suggested dates</h3>
      <p className="mt-1 text-sm text-gray-500">
        Ranges ranked by how many members are available on every day. Ties go to the earliest start.
      </p>

      <div className="mt-4 max-w-[12rem]">
        <label htmlFor="trip-length" className="mb-2 block text-sm font-medium text-gray-700">
          Trip length (days)
        </label>
        <input
          id="trip-length"
          type="number"
          min={1}
          step={1}
          value={tripLength}
          onChange={(event) => onLengthChange(Number(event.target.value))}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {!hasAnswers ? (
        <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Suggestions appear once members submit their availability.
        </p>
      ) : !Number.isInteger(tripLength) || tripLength < 1 ? (
        <p className="mt-4 text-sm text-gray-500">Enter a trip length of at least 1 day.</p>
      ) : suggestions.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No range of {tripLength} {tripLength === 1 ? 'day' : 'days'} fits inside the candidate windows.
        </p>
      ) : (
        <ol className="mt-4 space-y-3">
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.start}
              className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-gray-900">
                  <span className="mr-2 text-gray-400">#{index + 1}</span>
                  {formatDate(suggestion.start)} → {formatDate(suggestion.end)}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  {suggestion.attending.length}/{suggestion.attending.length + suggestion.notAttending.length} can attend
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {suggestion.notAttending.length > 0
                    ? `Cannot attend: ${suggestion.notAttending.join(', ')}`
                    : 'Everyone can attend'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelect(suggestion)}
                className="rounded-full border border-blue-200 px-5 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
              >
                Use these dates
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
