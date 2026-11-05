"use client"

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CalendarDays, Heart, Map, Users } from 'lucide-react'
import { LoginBox } from './boxes/login'
import { SignUpBox } from './boxes/signup'

const features = [
  { icon: Users, text: 'Create or join groups' },
  { icon: Map, text: 'Plan iteneraries' },
  { icon: CalendarDays, text: 'Organize dates and spendings' },
  { icon: Heart, text: 'Live new adventures' },
]

export default function EntryPage() {
  return (
    <Suspense fallback={null}>
      <EntryPageContent />
    </Suspense>
  )
}

function EntryPageContent() {
  const [view, setView] = useState('login')
  const searchParams = useSearchParams()
  const redirectTo = searchParams?.get('redirectTo') || undefined

  return (
    <main className="relative min-h-screen bg-slate-950 bg-[url('/background.png')] bg-cover bg-center text-white">
      <div className="absolute inset-0 bg-slate-950/50" />

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-12 px-6 py-12 lg:grid-cols-2 lg:gap-24">
        <section className="max-w-md">
          <div className="mb-16 flex items-center gap-3">
            <Map className="h-9 w-9" />
            <span className="text-2xl font-semibold">PlanIt!</span>
          </div>

          <h1 className="text-4xl font-bold leading-tight">
            Great trips 
            <br />
            get better
            <br />
            <span className="text-slate-400">in groups.</span>
          </h1>

          <p className="mt-8 text-lg leading-relaxed text-slate-300">
            Get togheter with your friends, plan routes, share ideas and turn plans intro memories.
          </p>

          <ul className="mt-10 hidden flex-col gap-5 lg:flex">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-4 text-slate-300">
                <Icon className="h-5 w-5 text-slate-400" />
                {text}
              </li>
            ))}
          </ul>
        </section>

        <>
          {view === 'login' && <LoginBox onSwitch={() => setView('signup')} redirectTo={redirectTo} />}
          {view === 'signup' && <SignUpBox onSwitch={() => setView('login')} redirectTo={redirectTo} />}
        </>

      </div>
    </main>
  )
}
