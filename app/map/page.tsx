import { Suspense } from 'react'
import { connection } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { TripMapContainer } from '@/components/map/TripMapContainer'

/**
 * @file app/map/page.tsx
 * @brief Full-screen interactive map page with Carto Leaflet and place search.
 */

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen flex items-center justify-center bg-slate-950 text-white text-sm">
          A carregar mapa...
        </div>
      }
    >
      <MapContent />
    </Suspense>
  )
}

/**
 * @brief Dynamic server component fetching user context and rendering the trip map container.
 */
async function MapContent() {
  await connection()

  let userEmail = 'explorer@planit.app'
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user?.email) {
      userEmail = user.email
    }
  } catch {
    // Fallback if supabase is unreachable
  }

  return (
    <main className="w-screen h-screen overflow-hidden">
      <TripMapContainer
        tripId="default"
        tripName="Portugal Roadtrip"
        currentUserEmail={userEmail}
        cartoApiKey={process.env.NEXT_PUBLIC_CARTO_API_KEY || process.env.CARTO_API_KEY}
      />
    </main>
  )
}
