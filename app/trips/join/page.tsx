import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { joinTripByCode } from '@/app/trips/actions/join-trip'
import { JoinTripForm } from './join-form'

interface JoinTripPageProps {
  searchParams: Promise<{ code?: string }>
}

/**
 * @brief Dynamic route for joining a trip via invite link or entering an invite code.
 */
export default async function JoinTripPage({ searchParams }: JoinTripPageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="text-gray-500">Loading trip invite...</div>
        </main>
      }
    >
      <JoinTripContent searchParams={searchParams} />
    </Suspense>
  )
}

async function JoinTripContent({ searchParams }: JoinTripPageProps) {
  await connection()
  const { code } = await searchParams
  const trimmedCode = code?.trim().toUpperCase()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // AC 3: If not logged in, redirect to login/signup with return URL
  if (!user) {
    const returnUrl = trimmedCode ? `/trips/join?code=${encodeURIComponent(trimmedCode)}` : '/trips/join'
    redirect(`/entry?redirectTo=${encodeURIComponent(returnUrl)}`)
  }

  let errorMessage: string | null = null

  // If a code was supplied in the URL, attempt auto-join
  if (trimmedCode) {
    const result = await joinTripByCode(trimmedCode)
    if (result?.error) {
      errorMessage = result.error
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-xs font-medium text-gray-500 transition hover:text-blue-700 mb-6"
        >
          <span>←</span> Back to dashboard
        </Link>

        <h1 className="text-2xl font-bold text-gray-900">Join a Trip</h1>
        <p className="mt-2 text-sm text-gray-500">
          Enter an invite code or use an invite link shared by the organizer.
        </p>

        {errorMessage && (
          <div
            data-testid="join-error-message"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-700"
          >
            {errorMessage}
          </div>
        )}

        <div className="mt-6">
          <JoinTripForm defaultCode={trimmedCode || ''} />
        </div>
      </div>
    </main>
  )
}
