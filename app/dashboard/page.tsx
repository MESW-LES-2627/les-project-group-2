import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { TripMapContainer } from '@/components/map/TripMapContainer'
import { getUserMemberTrips } from '@/app/trips/actions/get-member-trips'
import { getTripPins } from '@/app/trips/actions/get-trip-pins'

/**
 * @file app/dashboard/page.tsx
 * @brief Full-screen interactive map with search bar displayed directly upon user login.
 */

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="w-screen h-screen flex items-center justify-center bg-slate-950 text-white text-sm">
          A carregar mapa...
        </div>
      }
    >
      <Content />
    </Suspense>
  )
}

async function fetchUserProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  if (typeof supabase.from !== 'function') {
    return { username: undefined, avatarUrl: null }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', userId)
    .single()

  return {
    username: profile?.username ?? undefined,
    avatarUrl: profile?.avatar_url ?? null,
  }
}

/**
 * @brief Authenticated server component rendering the map for the logged-in user.
 */
async function Content() {
  await connection()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/entry')

  const { username, avatarUrl } = await fetchUserProfile(supabase, user.id)

  const memberTrips = await getUserMemberTrips()
  // Prefer a trip the user organizes, so organizer actions are available from the landing map.
  const activeTrip =
    memberTrips.find((trip) => trip.organizer_id === user.id) ?? memberTrips[0]
  const isOrganizer = Boolean(activeTrip && activeTrip.organizer_id === user.id)
  const initialPins = activeTrip ? await getTripPins(activeTrip.id) : []
  const cartoApiKey = process.env.NEXT_PUBLIC_CARTO_API_KEY || process.env.CARTO_API_KEY

  return (
    <main className="w-screen h-screen overflow-hidden">
      <TripMapContainer
        key={user.id}
        tripId={activeTrip?.id}
        currentUserEmail={user.email}
        currentUsername={username}
        currentUserAvatar={avatarUrl}
        cartoApiKey={cartoApiKey}
        initialTrips={memberTrips}
        initialPins={initialPins}
        isOrganizer={isOrganizer}
      />
    </main>
  )
}
