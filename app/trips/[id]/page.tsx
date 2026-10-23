'use client'

import { Suspense, use, useEffect, useState } from 'react'
import type { MockTrip } from '../new/page'

type TripWorkspacePageProps = {
    params: Promise<{ id: string }>
}

const sections = [
    {
        title: 'Dates',
        description: 'Plan when your trip will take place.',
    },
    {
        title: 'Itinerary',
        description: 'Organize activities and places.',
    },
    {
        title: 'Expenses',
        description: 'Track and share trip expenses.',
    },
]

export default function TripWorkspacePage({
                                              params,
                                          }: TripWorkspacePageProps) {
    return (
        <Suspense
            fallback={
                <main className="mx-auto max-w-5xl p-8">
                    <p className="text-gray-500">
                        Loading trip workspace...
                    </p>
                </main>
            }
        >
            <TripWorkspaceContent params={params} />
        </Suspense>
    )
}

function TripWorkspaceContent({
                                  params,
                              }: TripWorkspacePageProps) {
    const { id } = use(params)

    const [trip, setTrip] = useState<MockTrip | null>(null)
    const [loaded, setLoaded] = useState(false)

    useEffect(() => {
        const savedTrip = sessionStorage.getItem(`mock-trip-${id}`)

        if (savedTrip) {
            try {
                setTrip(JSON.parse(savedTrip) as MockTrip)
            } catch {
                setTrip(null)
            }
        } else {
            setTrip(null)
        }

        setLoaded(true)
    }, [id])

    if (!loaded) {
        return (
            <main className="mx-auto max-w-5xl p-8">
                <p className="text-gray-500">
                    Loading trip workspace...
                </p>
            </main>
        )
    }

    if (!trip) {
        return (
            <main className="mx-auto max-w-5xl p-8">
                <h1 className="text-2xl font-semibold">
                    Trip not found
                </h1>

                <p className="mt-2 text-gray-600">
                    This mock trip is not available in this browser session.
                </p>

                <a
                    href="/trips/new"
                    className="mt-4 inline-block text-blue-700 underline"
                >
                    Create a trip
                </a>
            </main>
        )
    }

    return (
        <main className="mx-auto max-w-5xl p-8">
            <a
                href="/dashboard"
                className="text-sm text-blue-700 hover:underline"
            >
                ← Back to dashboard
            </a>

            <header className="my-8">
                <p className="text-sm text-gray-500">
                    Trip workspace
                </p>

                <h1 className="text-3xl font-bold">
                    {trip.name}
                </h1>

                {trip.destination && (
                    <p className="mt-2 text-gray-600">
                        Destination: {trip.destination}
                    </p>
                )}

                {trip.description && (
                    <p className="mt-2 text-gray-600">
                        {trip.description}
                    </p>
                )}

                <p className="mt-4 text-sm text-gray-500">
                    Organizer: {trip.organizer}
                </p>
            </header>

            <div className="grid gap-4 sm:grid-cols-2">
                <section className="rounded-xl border p-6">
                    <h2 className="text-xl font-semibold">Map</h2>

                    <p className="mt-2 text-gray-600">
                        Explore places for your trip.
                    </p>

                    <a
                        href={`/trips/${id}/map`}
                        className="mt-4 inline-block text-blue-700 underline hover:text-blue-900"
                    >
                        Open map →
                    </a>
                </section>

                {sections.map((section) => (
                    <section
                        key={section.title}
                        className="rounded-xl border p-6"
                    >
                        <h2 className="text-xl font-semibold">
                            {section.title}
                        </h2>

                        <p className="mt-2 text-gray-600">
                            {section.description}
                        </p>
                    </section>
                ))}
            </div>
        </main>
    )
}