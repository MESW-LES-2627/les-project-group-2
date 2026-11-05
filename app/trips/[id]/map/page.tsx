import { Suspense } from 'react'
import { connection } from 'next/server'
import { redirect } from 'next/navigation'
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
    .select('id')
    .eq('id', id)
    .maybeSingle()

  if (tripError) {
    console.error('Error checking trip access:', tripError)
    throw new Error(`Could not check trip access: ${tripError.message}`)
  }

  if (!trip) {
    redirect('/dashboard')
  }

  return (
    <main className="w-screen h-screen overflow-hidden">
      <TripMapContainer
        currentUserEmail={user.email}
        cartoApiKey={process.env.NEXT_PUBLIC_CARTO_API_KEY || process.env.CARTO_API_KEY}
      />
    </main>
  )
}
