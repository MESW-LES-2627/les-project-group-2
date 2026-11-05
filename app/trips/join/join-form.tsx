'use client'

/**
 * @file app/trips/join/join-form.tsx
 * @brief Interactive client form for entering a trip invite code.
 */

import { useActionState } from 'react'
import { joinTripFormAction } from '@/app/trips/actions/join-trip'

interface JoinTripFormProps {
  defaultCode?: string
}

/**
 * @brief Client form component for submitting an invite code to join a trip.
 * @param props Component properties containing optional default code.
 */
export function JoinTripForm({ defaultCode = '' }: JoinTripFormProps) {
  const [state, formAction, isPending] = useActionState(joinTripFormAction, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="code" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
          Invite Code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          defaultValue={defaultCode}
          placeholder="e.g. TRIP8A2B"
          className="w-full uppercase font-mono tracking-wider rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {state?.error && (
        <p data-testid="form-error-message" className="text-sm text-red-600">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-blue-700 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
      >
        {isPending ? 'Joining trip...' : 'Join Trip'}
      </button>
    </form>
  )
}
