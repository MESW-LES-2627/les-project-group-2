import {Suspense} from 'react'
import Link from 'next/link'
import {redirect} from 'next/navigation'
import {connection} from 'next/server'
import {createClient} from '@/utils/supabase/server'

import {updateTrip} from '../actions/update-trip'
import {deleteTrip} from '../actions/delete-trip'
import {leaveTrip, removeTripMember} from '../actions/manage-trip-members'
import {InviteSettings} from './invite-settings'
import {DateWindows} from './date-windows'
import {AvailabilityCalendar} from './availability-calendar'
import {LockDates} from './lock-dates'
import {PromoteToOrganizerButton} from './promote-member-button'
import type {DateWindow} from '@/utils/date-windows'
import {buildAvailabilityCalendar, type AvailabilityRow} from '@/utils/availability'
import {groupAvailableByDay} from '@/utils/best-dates'

type TripWorkspacePageProps = {
    params: Promise<{ id: string }>
}

type TripMember = {
    user_id: string
    email: string | null
    display_name: string
    role: 'organizer' | 'member'
}

type TripData = {
    id: string
    name: string
    destination: string | null
    description: string | null
    organizer_id: string
    invite_code: string
    locked_start_date?: string | null
    locked_end_date?: string | null
}

const sections = [
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

function getOrganizer(trips){
  for(const mem of trips){
    if (mem.role = 'organizer') return mem.display_name
  }
}

export default function TripWorkspacePage({
                                              params,
                                          }: TripWorkspacePageProps) {
    return (
        <Suspense
            fallback={
                <main className="min-h-screen bg-gray-50 px-6 py-12">
                    <div className="mx-auto max-w-5xl text-gray-500">
                        Loading trip...
                    </div>
                </main>
            }
        >
            <TripWorkspaceContent params={params}/>
        </Suspense>
    )
}

function WorkspaceErrorView({ title, message }: { title: string; message: string }) {
    return (
        <main className="min-h-screen bg-gray-50 px-6 py-12">
            <div className="mx-auto max-w-5xl">
                <h1 className="text-2xl font-semibold text-gray-900">
                    {title}
                </h1>
                <p className="mt-2 text-gray-500">{message}</p>
            </div>
        </main>
    )
}

function TripNotFoundView() {
    return (
        <main className="min-h-screen bg-gray-50 px-6 py-12">
            <div className="mx-auto max-w-5xl">
                <h1 className="text-2xl font-semibold text-gray-900">
                    Trip not found
                </h1>
                <p className="mt-2 text-gray-500">
                    This trip does not exist or you don&apos;t have permission
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

async function fetchAvailabilityRows(
    supabase: Awaited<ReturnType<typeof createClient>>,
    tripId: string
): Promise<{ rows: AvailabilityRow[]; error: { message: string } | null }> {
    const availabilityRows: AvailabilityRow[] = []
    const pageSize = 1000

    for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
            .from('trip_availability')
            .select('user_id, day, status')
            .eq('trip_id', tripId)
            .order('day', { ascending: true })
            .order('user_id', { ascending: true })
            .range(from, from + pageSize - 1)

        if (error) {
            return { rows: availabilityRows, error }
        }

        availabilityRows.push(...(data ?? []))
        if ((data?.length ?? 0) < pageSize) break
    }

    return { rows: availabilityRows, error: null }
}

function TripOrganizerForm({ trip }: { trip: TripData }) {
    return (
        <div className="mt-8 border-t border-gray-100 pt-6">
            <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-gray-600 transition hover:text-blue-700">
                    Edit trip details
                    <span className="transition group-open:rotate-180">↓</span>
                </summary>

                <form action={updateTrip} className="mt-6 grid gap-5 sm:grid-cols-2">
                    <input type="hidden" name="id" value={trip.id} />

                    <div>
                        <label htmlFor="name" className="mb-2 block text-sm font-medium text-gray-700">
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
                        <label htmlFor="destination" className="mb-2 block text-sm font-medium text-gray-700">
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
                        <label htmlFor="description" className="mb-2 block text-sm font-medium text-gray-700">
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

            <InviteSettings tripId={trip.id} initialInviteCode={trip.invite_code} />
        </div>
    )
}

function TripHeader({ trip, isOrganizer }: { trip: TripData; isOrganizer: boolean }) {
    return (
        <header className="mt-8 rounded-3xl bg-white p-7 shadow-sm sm:p-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-700">
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

            {isOrganizer && <TripOrganizerForm trip={trip} />}
        </header>
    )
}

function TripMemberItem({
    member,
    isOrganizer,
    currentUserId,
    tripId,
}: {
    member: TripMember
    isOrganizer: boolean
    currentUserId: string
    tripId: string
}) {
    const isCurrentUser = member.user_id === currentUserId
    const canRemove = isOrganizer && member.role === 'member'

    return (
        <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <p className="font-medium text-gray-900">
                    {member.display_name}
                    {isCurrentUser ? ' (You)' : ''}
                </p>
                {member.email && (
                    <p className="mt-1 text-sm text-gray-500">{member.email}</p>
                )}
                <span className="mt-2 inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-600">
                    {member.role}
                </span>
            </div>
            {canRemove && (
                <form action={removeTripMember}>
                    <input type="hidden" name="tripId" value={tripId} />
                    <input type="hidden" name="memberId" value={member.user_id} />
                    <button
                        type="submit"
                        className="text-sm font-semibold text-red-700 transition hover:text-red-900"
                    >
                        Remove member
                    </button>
                </form>
            )}
        </li>
    )
}

function TripMembersSection({
    tripMembers,
    isOrganizer,
    currentUserId,
    tripId,
}: {
    tripMembers: TripMember[]
    isOrganizer: boolean
    currentUserId: string
    tripId: string
}) {
    return (
        <section className="mt-8 rounded-3xl bg-white p-7 shadow-sm sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Trip members</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        {tripMembers.length} {tripMembers.length === 1 ? 'member' : 'members'}
                    </p>
                </div>
                {!isOrganizer && (
                    <form action={leaveTrip}>
                        <input type="hidden" name="tripId" value={tripId} />
                        <button
                            type="submit"
                            className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-red-200 hover:text-red-700"
                        >
                            Leave trip
                        </button>
                    </form>
                )}
            </div>

            <ul className="mt-5 divide-y divide-gray-100">
                {tripMembers.map((member) => (
                    <TripMemberItem
                        key={member.user_id}
                        member={member}
                        isOrganizer={isOrganizer}
                        currentUserId={currentUserId}
                        tripId={tripId}
                    />
                ))}
            </ul>

            {isOrganizer && (
                <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                    As the organizer, you can’t leave while you’re the only
                    organizer. Transfer the organizer role or delete the trip
                    first.
                </p>
            )}
        </section>
    )
}

function TripSectionsList({ tripId }: { tripId: string }) {
    return (
        <section className="mt-10">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900">Plan your trip</h2>
                <p className="mt-1 text-sm text-gray-500">
                    Everything you need to organize your adventure.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <Link
                    href={`/trips/${tripId}/map`}
                    className="group flex items-center gap-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-6 transition hover:-translate-y-1 hover:border-blue-200 hover:bg-blue-50 hover:shadow-md"
                >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                        🗺️
                    </div>

                    <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900">Map</h3>
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
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gray-50 text-2xl">
                            {section.icon}
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-semibold text-gray-900">
                                    {section.title}
                                </h3>
                                <span className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-medium text-gray-500">
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
    )
}

function TripDangerZone({ tripId, isOrganizer }: { tripId: string; isOrganizer: boolean }) {
    if (!isOrganizer) return null

    return (
        <section className="mt-14 border-t border-gray-200 pt-8">
            <details className="group">
                <summary className="cursor-pointer list-none text-sm font-medium text-gray-400 transition hover:text-red-600">
                    Advanced settings · Delete trip
                </summary>

                <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-red-100 bg-red-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="font-semibold text-red-800">Delete this trip</h3>
                        <p className="mt-1 text-sm text-red-700/70">
                            This action cannot be undone.
                        </p>
                    </div>

                    <form action={deleteTrip}>
                        <input type="hidden" name="id" value={tripId} />
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
    )
}

async function loadWorkspaceData(
    supabase: Awaited<ReturnType<typeof createClient>>,
    tripId: string
): Promise<
    | { errorView: React.ReactNode }
    | {
          trip: TripData
          members: TripMember[]
          dateWindows: DateWindow[]
          itineraryDays: Array<{ day: string }>
          availabilityRows: AvailabilityRow[]
      }
> {
    const { data: trip, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .maybeSingle()

    if (error) {
        console.error('Error fetching trip:', error)
        return { errorView: <WorkspaceErrorView title="Could not load trip" message={error.message} /> }
    }

    if (!trip) {
        return { errorView: <TripNotFoundView /> }
    }

    const { data: members, error: membersError } = await supabase.rpc(
        'get_trip_members',
        { p_trip_id: tripId }
    )

    if (membersError) {
        console.error('Error fetching trip members:', membersError)
        return { errorView: <WorkspaceErrorView title="Could not load trip members" message={membersError.message} /> }
    }

    const { data: dateWindows, error: dateWindowsError } = await supabase
        .from('trip_date_windows')
        .select('id, trip_id, start_date, end_date')
        .eq('trip_id', tripId)
        .order('start_date', { ascending: true })

    if (dateWindowsError) {
        console.error('Error fetching date windows:', dateWindowsError)
        return { errorView: <WorkspaceErrorView title="Could not load candidate dates" message={dateWindowsError.message} /> }
    }

    const { data: itineraryDays, error: itineraryDaysError } = await supabase
        .from('trip_itinerary_days')
        .select('day')
        .eq('trip_id', tripId)
        .order('day', { ascending: true })

    if (itineraryDaysError) {
        console.error('Error fetching itinerary days:', itineraryDaysError)
        return { errorView: <WorkspaceErrorView title="Could not load trip dates" message={itineraryDaysError.message} /> }
    }

    const { rows: availabilityRows, error: availabilityError } = await fetchAvailabilityRows(supabase, tripId)

    if (availabilityError) {
        console.error('Error fetching availability:', availabilityError)
        return { errorView: <WorkspaceErrorView title="Could not load availability" message={availabilityError.message} /> }
    }

    return {
        trip: trip as TripData,
        members: (members ?? []) as TripMember[],
        dateWindows: (dateWindows ?? []) as DateWindow[],
        itineraryDays: (itineraryDays ?? []) as Array<{ day: string }>,
        availabilityRows,
    }
}

interface TripWorkspaceBodyProps {
    tripId: string
    trip: TripData
    tripMembers: TripMember[]
    dateWindows: DateWindow[]
    itineraryDays: Array<{ day: string }>
    availabilityRows: AvailabilityRow[]
    currentUserId: string
}

async function TripWorkspaceContent({params}: TripWorkspacePageProps) {
    await connection()
    const {id} = await params

    const supabase = await createClient()

    const {
        data: {user},
        error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
        redirect('/entry')
    }

    const load = await loadWorkspaceData(supabase, id)
    if ('errorView' in load) { return load.errorView }

    const trip = load.trip
    const isOrganizer = user.id === trip.organizer_id
    const tripMembers = load.members
    const dateWindows = load.dateWindows
    const itineraryDays = load.itineraryDays
    const availabilityRows = load.availabilityRows

    const calendar = buildAvailabilityCalendar(
        (dateWindows ?? []) as DateWindow[],
        availabilityRows,
        tripMembers
    )

    const myAnswers = Object.fromEntries(
      availabilityRows
          .filter((row) => row.user_id === user.id)
          .map((row) => [row.day, row.status])
    )

    console.log(load)

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
                                {isOrganizer ? 'You' : getOrganizer(tripMembers)}
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

                            {/* Trip Onboarding & Invite Link/Code */}
                            <InviteSettings tripId={trip.id} initialInviteCode={trip.invite_code} />
                        </div>
                    )}
                </header>

                <section className="mt-8 rounded-3xl bg-white p-7 shadow-sm sm:p-8">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">
                                Trip members
                            </h2>
                            <p className="mt-1 text-sm text-gray-500">
                                {tripMembers.length} {tripMembers.length === 1 ? 'member' : 'members'}
                            </p>
                        </div>
                        {!isOrganizer && (
                            <form action={leaveTrip}>
                                <input type="hidden" name="tripId" value={id}/>
                                <button
                                    type="submit"
                                    className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-red-200 hover:text-red-700"
                                >
                                    Leave trip
                                </button>
                            </form>
                        )}
                    </div>

                    <ul className="mt-5 divide-y divide-gray-100">
                        {tripMembers.map((member) => (
                            <li
                                key={member.user_id}
                                className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <p className="font-medium text-gray-900">
                                        {member.display_name}
                                        {member.user_id === user.id ? ' (You)' : ''}
                                    </p>
                                    {member.email && (
                                        <p className="mt-1 text-sm text-gray-500">
                                            {member.email}
                                        </p>
                                    )}
                                    <span className="mt-2 inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium capitalize text-gray-600">
                                        {member.role}
                                    </span>
                                </div>
                                {isOrganizer && member.role === 'member' && (
                                    <div className="flex items-center gap-4">
                                        <PromoteToOrganizerButton
                                            tripId={id}
                                            memberId={member.user_id}
                                        />
                                        <form action={removeTripMember}>
                                            <input type="hidden" name="tripId" value={id}/>
                                            <input
                                                type="hidden"
                                                name="memberId"
                                                value={member.user_id}
                                            />
                                            <button
                                                type="submit"
                                                className="text-sm font-semibold text-red-700 transition hover:text-red-900"
                                            >
                                                Remove member
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>

                    {isOrganizer && (
                        <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                            As the organizer, you can’t leave while you’re the only
                            organizer. Transfer the organizer role or delete the trip
                            first.
                        </p>
                    )}
                </section>

                <LockDates
                    tripId={id}
                    isOrganizer={isOrganizer}
                    windows={(dateWindows ?? []) as DateWindow[]}
                    lockedStart={trip.locked_start_date ?? null}
                    lockedEnd={trip.locked_end_date ?? null}
                    itineraryDayCount={itineraryDays?.length ?? 0}
                    members={tripMembers.map(({user_id, display_name}) => ({user_id, display_name}))}
                    availableByDay={groupAvailableByDay(availabilityRows)}
                    hasAnswers={availabilityRows.length > 0}
                />

                <DateWindows
                    tripId={id}
                    windows={(dateWindows ?? []) as DateWindow[]}
                    isOrganizer={isOrganizer}
                    locked={Boolean(trip.locked_start_date)}
                />

                {calendar.days.length > 0 && (
                    <AvailabilityCalendar
                        tripId={id}
                        days={calendar.days}
                        missing={calendar.missing}
                        memberCount={tripMembers.length}
                        myAnswers={myAnswers}
                        locked={Boolean(trip.locked_start_date)}
                    />
                )}

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
