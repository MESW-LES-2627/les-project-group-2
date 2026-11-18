'use client'

/**
 * @file app/trips/[id]/date-windows.tsx
 * @brief Candidate date windows section: visible to every member, editable by the organizer.
 */

import { useState, useTransition } from 'react'
import {
  addDateWindow,
  deleteDateWindow,
  updateDateWindow,
  type DateWindowResult,
} from '@/app/trips/actions/date-windows'
import { toIsoDate, validateDateWindow, type DateWindow } from '@/utils/date-windows'

interface DateWindowsProps {
  tripId: string
  windows: DateWindow[]
  isOrganizer: boolean
  locked?: boolean
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
 * @brief Lists the candidate date windows of a trip and lets the organizer add, edit and delete them.
 * @param props Component properties containing the trip id, its windows and the viewer's role.
 */
export function DateWindows({ tripId, windows, isOrganizer, locked = false }: DateWindowsProps) {
  const canEdit = isOrganizer && !locked
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<'add' | 'update' | 'delete' | null>(null)
  const [isPending, startTransition] = useTransition()
  const today = toIsoDate()

  /**
   * @brief Validates the submitted window, runs the matching server action and reports the outcome.
   */
  const handleSubmit = (windowId: string | null) => (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const startDate = String(formData.get('startDate') ?? '')
    const endDate = String(formData.get('endDate') ?? '')

    const validationError = validateDateWindow(startDate, endDate)
    if (validationError) {
      setError(validationError)
      return
    }

    setPendingAction(windowId ? 'update' : 'add')
    startTransition(async () => {
      const result: DateWindowResult = windowId
        ? await updateDateWindow(tripId, windowId, startDate, endDate)
        : await addDateWindow(tripId, startDate, endDate)

      if (result.error) {
        setError(result.error)
        return
      }
      setError(null)
      setEditingId(null)
      if (!windowId) {
        form.reset()
      }
    })
  }

  /**
   * @brief Confirms before deleting a window on the server.
   */
  const handleDelete = (windowId: string) => {
    if (!window.confirm('Delete this date window? This action cannot be undone.')) {
      return
    }

    setPendingAction('delete')
    startTransition(async () => {
      const result = await deleteDateWindow(tripId, windowId)
      setError(result.error ?? null)
    })
  }

  return (
    <section className="mt-8 rounded-3xl bg-white p-7 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-gray-900">Candidate dates</h2>
      <p className="mt-1 text-sm text-gray-500">
        {windows.length === 0
          ? 'No date windows have been proposed yet.'
          : locked
            ? 'The trip dates are locked, so the candidate windows can no longer be changed.'
            : 'The organizer proposed these windows. Pick the ones that work for you.'}
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      )}

      <ul className="mt-5 divide-y divide-gray-100">
        {windows.map((window) => (
          <li key={window.id} className="py-4">
            {editingId === window.id ? (
              <form noValidate onSubmit={handleSubmit(window.id)} className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`start-${window.id}`}
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    Start date
                  </label>
                  <input
                    id={`start-${window.id}`}
                    name="startDate"
                    type="date"
                    min={today}
                    defaultValue={window.start_date}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`end-${window.id}`}
                    className="mb-2 block text-sm font-medium text-gray-700"
                  >
                    End date
                  </label>
                  <input
                    id={`end-${window.id}`}
                    name="endDate"
                    type="date"
                    min={today}
                    defaultValue={window.end_date}
                    className={inputClass}
                  />
                </div>
                <div className="flex gap-3 sm:col-span-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
                  >
                    {isPending && pendingAction === 'update' ? 'Saving…' : 'Save window'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null)
                      setError(null)
                    }}
                    className="rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-medium text-gray-900">
                  {formatDate(window.start_date)} → {formatDate(window.end_date)}
                </p>
                {canEdit && (
                  <div className="flex gap-4">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => {
                        setEditingId(window.id)
                        setError(null)
                      }}
                      className="text-sm font-semibold text-blue-700 transition hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(window.id)}
                      className="text-sm font-semibold text-red-700 transition hover:text-red-900 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {canEdit && (
        <form
          noValidate
          onSubmit={handleSubmit(null)}
          className="mt-6 grid gap-4 border-t border-gray-100 pt-6 sm:grid-cols-2"
        >
          <div>
            <label htmlFor="new-start" className="mb-2 block text-sm font-medium text-gray-700">
              Start date
            </label>
            <input id="new-start" name="startDate" type="date" min={today} className={inputClass} />
          </div>
          <div>
            <label htmlFor="new-end" className="mb-2 block text-sm font-medium text-gray-700">
              End date
            </label>
            <input id="new-end" name="endDate" type="date" min={today} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
            >
              {isPending && pendingAction === 'add' ? 'Adding…' : 'Add date window'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
