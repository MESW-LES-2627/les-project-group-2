import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import Link from 'next/link'
import { Map, MapPin, Plus, LogOut, Compass } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { logout } from '../entry/actions/auth'

/**
 * @file app/dashboard/page.tsx
 * @brief User dashboard page with quick access to the interactive map and trip tools.
 */

export default function Dashboard() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
          <p>A carregar dashboard...</p>
        </div>
      }
    >
      <Content />
    </Suspense>
  )
}

/**
 * @brief Dynamic content component rendering user greeting and navigation cards.
 */
async function Content() {
  await connection()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/entry')

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2.5 text-blue-400 mb-1">
              <Compass className="h-6 w-6" />
              <span className="text-sm font-semibold tracking-wide uppercase">PlanIt Workspace</span>
            </div>
            <h1 className="text-3xl font-bold">Welcome back!</h1>
            <p className="text-slate-400 text-sm mt-1">Logged in as {user.email}</p>
          </div>

          <form action={logout}>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 transition-colors flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Interactive Map Card */}
          <Link
            href="/map"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-850 p-6 border border-white/10 hover:border-blue-500/50 shadow-xl transition-all hover:scale-[1.01]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                <Map className="h-6 w-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold">
                US 3.1
              </span>
            </div>
            <h2 className="text-xl font-bold group-hover:text-blue-400 transition-colors">
              Interactive Trip Map
            </h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Full-screen Carto Leaflet map. Search places throughout Portugal, drop pins, propose spots, and view group suggestions.
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-blue-400 group-hover:translate-x-1 transition-transform">
              Open Full-Screen Map &rarr;
            </div>
          </Link>

          {/* Quick Demo Pins Card */}
          <Link
            href="/trips/1/map"
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-850 p-6 border border-white/10 hover:border-emerald-500/50 shadow-xl transition-all hover:scale-[1.01]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                <MapPin className="h-6 w-6" />
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
                Workspace Map
              </span>
            </div>
            <h2 className="text-xl font-bold group-hover:text-emerald-400 transition-colors">
              Trip Workspace Map
            </h2>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Open the dedicated workspace map for trip #1 with collaborative pin dropping and categorized itinerary points.
            </p>
            <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
              Open Workspace #1 &rarr;
            </div>
          </Link>
        </section>
      </div>
    </main>
  )
}
