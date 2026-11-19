import { Suspense } from 'react'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { TripMapContainer } from '@/components/map/TripMapContainer'
import { Pin, PinCategory } from '@/types/map'

/**
 * @file app/trips/[id]/itinerary/page.tsx
 * @brief Dynamic route for the trip itinerary map workspace (US-3.3).
 */

interface TripItineraryPageProps {
  params: Promise<{ id: string }>
}

export default async function TripItineraryPage({ params }: TripItineraryPageProps) {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen flex items-center justify-center bg-slate-950 text-white text-sm">
          A carregar itinerário...
        </div>
      }
    >
      <TripItineraryContent params={params} />
    </Suspense>
  )
}

/**
 * @brief Authenticated server component loading trip itinerary map content and pins from database.
 */
async function TripItineraryContent({ params }: TripItineraryPageProps) {
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

  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select('id, name, organizer_id')
    .eq('id', id)
    .maybeSingle()

  if (tripError) {
    console.error('Error checking trip access:', tripError)
    throw new Error(`Could not check trip access: ${tripError.message}`)
  }

  if (!trip) {
    redirect('/dashboard')
  }

  const isOrganizer = trip.organizer_id === user.id
  const userEmail = user.email ?? 'member@planit.app'
  let currentUsername: string | undefined
  let currentUserAvatar: string | null = null

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single()

    if (profile) {
      currentUsername = profile.username ?? undefined
      currentUserAvatar = profile.avatar_url ?? null
    }
  } catch {
    // Keep page usable even if profile data is unavailable
  }

  // Fetch all pins for this trip from the database
  const { data: dbPins, error: pinsError } = await supabase
    .from('pins')
    .select('*')
    .eq('trip_id', id)
    .order('created_at', { ascending: true })

  if (pinsError) {
    console.error('Error fetching trip pins:', pinsError)
  }

  const pinIds = (dbPins ?? []).map((p) => p.id)
  let dbVotes: Array<{
    id: string
    pin_id: string
    user_id: string
    user_email: string
    trip_date: string | null
    created_at: string
  }> = []

  if (pinIds.length > 0) {
    const { data: votes, error: votesError } = await supabase
      .from('pin_votes')
      .select('*')
      .in('pin_id', pinIds)

    if (votesError) {
      console.error('Error fetching pin votes:', votesError)
    } else {
      dbVotes = votes ?? []
    }
  }

  const initialPins: Pin[] = (dbPins ?? []).map((p) => {
    const pVotes = dbVotes.filter((v) => v.pin_id === p.id)
    return {
      id: p.id,
      tripId: p.trip_id,
      name: p.name,
      description: p.description ?? undefined,
      date: p.date ?? undefined,
      category: (p.category ?? 'sightseeing') as PinCategory,
      lat: p.lat,
      lng: p.lng,
      proposedBy: p.proposed_by,
      createdAt: p.created_at,
      commited: Boolean(p.commited),
      committed: Boolean(p.commited),
      votes: pVotes.map((v) => ({
        id: v.id,
        pinId: v.pin_id,
        userId: v.user_id,
        userEmail: v.user_email,
        date: v.trip_date ?? undefined,
        createdAt: v.created_at,
      })),
    }
  })

  return (
    <main className="w-screen h-screen overflow-hidden">
      <TripMapContainer
        mode="itinerary"
        tripId={trip.id}
        tripName={trip.name}
        isOrganizer={isOrganizer}
        currentUserEmail={userEmail}
        currentUsername={currentUsername}
        currentUserAvatar={currentUserAvatar}
        cartoApiKey={process.env.NEXT_PUBLIC_CARTO_API_KEY || process.env.CARTO_API_KEY}
        initialPins={initialPins}
        allowPinCreation={true}
      />
    </main>
  )
}
