import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { TripMapContainer } from '@/components/map/TripMapContainer'

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

  let currentUsername: string | undefined
  let currentUserAvatar: string | null = null

  if (typeof supabase.from === 'function') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single()

    if (profile) {
      currentUsername = profile.username ?? undefined
      currentUserAvatar = profile.avatar_url ?? null
    }
  }

  return (
    <main className="w-screen h-screen overflow-hidden">
      <TripMapContainer
        currentUserEmail={user.email}
        currentUsername={currentUsername}
        currentUserAvatar={currentUserAvatar}
        cartoApiKey={process.env.NEXT_PUBLIC_CARTO_API_KEY || process.env.CARTO_API_KEY}
      />
    </main>
  )
}
