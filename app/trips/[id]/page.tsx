import Link from 'next/link'
import {redirect} from 'next/navigation'
import {createClient} from '@/utils/supabase/server'

import {updateTrip} from '../actions/update-trip'
import {deleteTrip} from '../actions/delete-trip'

type TripWorkspacePageProps = {
    params: Promise<{ id: string }>
}

const sections = [
    {
        title: 'Dates',
        description: 'Choose your travel dates and manage your schedule.',
        icon: '📅',
        status: 'Coming soon',
    },
    {
        title: 'Itinerary',
        description: 'Build your plans and organize activities.',
        icon: '🧭',
        status: 'Coming soon',
    },
    {
        title: 'Expenses',
        description: 'Keep track of costs and shared expenses.',
        icon: '💳',
        status: 'Coming soon',
    },
]

export default async function TripWorkspacePage({
                                                    params,
                                                }: TripWorkspacePageProps) {
    const {id} = await params

    const supabase = await createClient()

    const {
        data: {user},
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        redirect('/entry')
    }

    const {data: trip, error} = await supabase
        .from('trips')
        .select('*')
        .eq('id', id)
        .maybeSingle()

    if (error) {
        console.error('Error fetching trip:', error)

        return (
            <main className="min-h-screen bg-gray-50 px-6 py-12">
                <div className="mx-auto max-w-5xl">
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Could not load trip
                    </h1>
                    <p className="mt-2 text-gray-500">{error.message}</p>
                </div>
            </main>
        )
    }

    if (!trip) {
        return (
            <main className="min-h-screen bg-gray-50 px-6 py-12">
                <div className="mx-auto max-w-5xl">
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Trip not found
                    </h1>
                    <p className="mt-2 text-gray-500">
                        This trip does not exist or you don't have permission
                        to access it.
                    </p>
                    <Link
                        href="/dashboard"
                        className="mt-5 inline-block text-blue-700 hover:underline"
                    >
                        ← Back to dashboard
                    </Link>
                </div>
            </main>
        )
    }

    const isOrganizer = trip.organizer_id === user.id

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-6xl px-6 py-8 sm:px-8">

                {/* Navigation */}
                <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-blue-700"
                >
                    <span>←</span>
                    Back to my trips
                </Link>

                {/* Trip header */}
                <header className="mt-8 rounded-3xl bg-white p-7 shadow-sm sm:p-10">
                    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                            <span
                                className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
                                Trip workspace
                            </span>

                            <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                                {trip.name}
                            </h1>

                            {trip.destination && (
                                <p className="mt-3 flex items-center gap-2 text-gray-500">
                                    <span>📍</span>
                                    {trip.destination}
                                </p>
                            )}

                            {trip.description && (
                                <p className="mt-5 max-w-2xl leading-relaxed text-gray-600">
                                    {trip.description}
                                </p>
                            )}
                        </div>

                        <div className="shrink-0 rounded-2xl bg-gray-50 px-5 py-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                                Organizer
                            </p>
                            <p className="mt-1 font-semibold text-gray-800">
                                {isOrganizer ? 'You' : 'Trip organizer'}
                            </p>
                        </div>
                    </div>

                    {isOrganizer && (
                        <div className="mt-8 border-t border-gray-100 pt-6">
                            <details className="group">
                                <summary
                                    className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-gray-600 transition hover:text-blue-700">
                                    Edit trip details
                                    <span className="transition group-open:rotate-180">
                                        ↓
                                    </span>
                                </summary>

                                <form
                                    action={updateTrip}
                                    className="mt-6 grid gap-5 sm:grid-cols-2"
                                >
                                    <input
                                        type="hidden"
                                        name="id"
                                        value={trip.id}
                                    />

                                    <div>
                                        <label
                                            htmlFor="name"
                                            className="mb-2 block text-sm font-medium text-gray-700"
                                        >
                                            Trip name
                                        </label>
                                        <input
                                            id="name"
                                            name="name"
                                            required
                                            defaultValue={trip.name}
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="destination"
                                            className="mb-2 block text-sm font-medium text-gray-700"
                                        >
                                            Destination
                                        </label>
                                        <input
                                            id="destination"
                                            name="destination"
                                            defaultValue={trip.destination ?? ''}
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <label
                                            htmlFor="description"
                                            className="mb-2 block text-sm font-medium text-gray-700"
                                        >
                                            Description
                                        </label>
                                        <textarea
                                            id="description"
                                            name="description"
                                            rows={3}
                                            defaultValue={trip.description ?? ''}
                                            className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                                        />
                                    </div>

                                    <div className="sm:col-span-2">
                                        <button
                                            type="submit"
                                            className="rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                                        >
                                            Save changes
                                        </button>
                                    </div>
                                </form>
                            </details>
                        </div>
                    )}
                </header>

                {/* Workspace sections */}
                <section className="mt-10">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-gray-900">
                            Plan your trip
                        </h2>
                        <p className="mt-1 text-sm text-gray-500">
                            Everything you need to organize your adventure.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        {/* Map */}
                        <Link
                            href={`/trips/${id}/map`}
                            className="group flex items-center gap-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-6 transition hover:-translate-y-1 hover:border-blue-200 hover:bg-blue-50 hover:shadow-md"
                        >
                            <div
                                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                                🗺️
                            </div>

                            <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-gray-900">
                                    Map
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Discover places and explore destinations.
                                </p>
                            </div>

                            <span className="text-xl text-blue-600 transition group-hover:translate-x-1">
                                →
                            </span>
                        </Link>

                        {sections.map((section) => (
                            <div
                                key={section.title}
                                className="flex items-center gap-5 rounded-2xl border border-gray-100 bg-white p-6 transition hover:-translate-y-1 hover:border-gray-200 hover:shadow-md"
                            >
                                <div
                                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gray-50 text-2xl">
                                    {section.icon}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-semibold text-gray-900">
                                            {section.title}
                                        </h3>
                                        <span
                                            className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-500">
                                            {section.status}
                                        </span>
                                    </div>

                                    <p className="mt-1 text-sm leading-relaxed text-gray-500">
                                        {section.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Danger zone */}
                {isOrganizer && (
                    <section className="mt-14 border-t border-gray-200 pt-8">
                        <details className="group">
                            <summary
                                className="cursor-pointer list-none text-sm font-medium text-gray-400 transition hover:text-red-600">
                                Advanced settings · Delete trip
                            </summary>

                            <div
                                className="mt-5 flex flex-col gap-4 rounded-2xl border border-red-100 bg-red-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="font-semibold text-red-800">
                                        Delete this trip
                                    </h3>
                                    <p className="mt-1 text-sm text-red-700/70">
                                        This action cannot be undone.
                                    </p>
                                </div>

                                <form action={deleteTrip}>
                                    <input
                                        type="hidden"
                                        name="id"
                                        value={trip.id}
                                    />
                                    <button
                                        type="submit"
                                        className="rounded-full border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-600 hover:text-white"
                                    >
                                        Delete trip
                                    </button>
                                </form>
                            </div>
                        </details>
                    </section>
                )}
            </div>
        </main>
    )
}