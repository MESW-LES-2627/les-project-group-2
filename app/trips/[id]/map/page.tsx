import { Suspense } from 'react'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { TripMapContainer } from '@/components/map/TripMapContainer'
import { getTripPins } from '@/app/trips/actions/get-trip-pins'

/**
 * @file app/trips/[id]/map/page.tsx
 * @brief Dynamic route for a specific trip workspace interactive map.
 */

interface TripMapPageProps {
  params: Promise<{ id: string }>
}

export default async function TripMapPage({ params }: TripMapPageProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen flex items-center justify-center bg-slate-950 text-white text-sm">
          A carregar mapa da viagem...
        </div>
      }
    >
      <TripMapContent params={params} />
    </Suspense>
  )
}

async function fetchUserProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ username?: string; avatarUrl: string | null }> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .single()

    if (profile) {
      return {
        username: profile.username ?? undefined,
        avatarUrl: profile.avatar_url ?? null,
      }
    }
  } catch {
    // Keep the map usable when profile data is unavailable.
  }
  return { avatarUrl: null }
}

async function fetchTrip(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string
) {
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, organizer_id')
    .eq('id', id)
    .maybeSingle()

  if (tripError) {
    console.error('Error checking trip access:', tripError)
    throw new Error(`Could not check trip access: ${tripError.message}`)
  }

  return trip
}

/**
 * @brief Dynamic server component loading trip workspace map content.
 */
async function TripMapContent({ params }: TripMapPageProps) {
  await connection()
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/entry')
  }

  const trip = await fetchTrip(supabase, id)
  if (!trip) {
    redirect('/dashboard')
  }

  const isOrganizer = trip.organizer_id === user.id
  const userEmail = user.email ?? 'member@planit.app'
  const initialPins = await getTripPins(id)
  const { username, avatarUrl } = await fetchUserProfile(supabase, user.id)
  const cartoApiKey = process.env.NEXT_PUBLIC_CARTO_API_KEY || process.env.CARTO_API_KEY

  return (
    <main className="w-screen h-screen overflow-hidden">
      <TripMapContainer
        tripId={id}
        currentUserId={user.id}
        currentUserEmail={userEmail}
        currentUsername={username}
        currentUserAvatar={avatarUrl}
        cartoApiKey={cartoApiKey}
        initialPins={initialPins}
        isOrganizer={isOrganizer}
      />
    </main>
  )
}
