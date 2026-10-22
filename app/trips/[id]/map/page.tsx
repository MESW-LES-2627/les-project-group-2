import { Suspense } from 'react'
import { connection } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { TripMapContainer } from '@/components/map/TripMapContainer'

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

/**
 * @brief Dynamic server component loading trip workspace map content.
 */
async function TripMapContent({ params }: TripMapPageProps) {
  await connection()
  const { id } = await params

  let userEmail = 'member@planit.app'
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
        tripId={id}
        tripName={`Trip Workspace #${id}`}
        currentUserEmail={userEmail}
      />
    </main>
  )
}
