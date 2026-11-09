import React, {isValidElement, type ReactNode} from 'react'
import {cleanup, render, screen} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import TripWorkspacePage from '@/app/trips/[id]/page'
import * as navigation from 'next/navigation'
import * as supabaseServer from '@/utils/supabase/server'

vi.mock('next/navigation', () => ({
    redirect: vi.fn(),
}))

vi.mock('next/server', () => ({
    connection: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(),
}))

vi.mock('@/app/trips/actions/update-trip', () => ({
    updateTrip: vi.fn(),
}))

vi.mock('@/app/trips/actions/delete-trip', () => ({
    deleteTrip: vi.fn(),
}))

vi.mock('@/app/trips/actions/manage-trip-members', () => ({
    leaveTrip: vi.fn(),
    removeTripMember: vi.fn(),
}))

vi.mock('@/app/trips/actions/date-windows', () => ({
    addDateWindow: vi.fn(),
    updateDateWindow: vi.fn(),
    deleteDateWindow: vi.fn(),
}))

vi.mock('@/app/trips/actions/availability', () => ({
    saveAvailability: vi.fn(),
}))

type TripWorkspacePageProps = {
    params: Promise<{id: string}>
}

type Query = {
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    maybeSingle: ReturnType<typeof vi.fn>
    order: ReturnType<typeof vi.fn>
    range: ReturnType<typeof vi.fn>
}

const trip = {
    id: 'trip-1',
    name: 'Weekend away',
    destination: 'Porto',
    description: 'A short break',
    organizer_id: 'user-1',
}

describe('Trip workspace page', () => {
    let query: Query
    let availabilityQuery: Query
    let itineraryQuery: Query
    let getUser: ReturnType<typeof vi.fn>
    let getTripMembers: ReturnType<typeof vi.fn>

    beforeEach(() => {
        vi.clearAllMocks()

        query = {
            select: vi.fn(),
            eq: vi.fn(),
            maybeSingle: vi.fn(),
            order: vi.fn(),
            range: vi.fn(),
        }
        query.select.mockReturnValue(query)
        query.eq.mockReturnValue(query)
        query.maybeSingle.mockResolvedValue({data: trip, error: null})
        query.order.mockResolvedValue({
            data: [
                {
                    id: 'window-1',
                    trip_id: 'trip-1',
                    start_date: '2099-07-01',
                    end_date: '2099-07-10',
                },
            ],
            error: null,
        })

        availabilityQuery = {
            select: vi.fn(),
            eq: vi.fn(),
            maybeSingle: vi.fn(),
            order: vi.fn(),
            range: vi.fn(),
        }
        availabilityQuery.select.mockReturnValue(availabilityQuery)
        availabilityQuery.eq.mockReturnValue(availabilityQuery)
        availabilityQuery.order.mockReturnValue(availabilityQuery)
        availabilityQuery.range.mockResolvedValue({
            data: [
                {user_id: 'user-1', day: '2099-07-02', status: 'available'},
                {user_id: 'user-1', day: '2099-07-03', status: 'unavailable'},
            ],
            error: null,
        })

        itineraryQuery = {
            select: vi.fn(),
            eq: vi.fn(),
            maybeSingle: vi.fn(),
            order: vi.fn(),
            range: vi.fn(),
        }
        itineraryQuery.select.mockReturnValue(itineraryQuery)
        itineraryQuery.eq.mockReturnValue(itineraryQuery)
        itineraryQuery.order.mockResolvedValue({data: [], error: null})

        getUser = vi.fn().mockResolvedValue({
            data: {user: {id: 'user-1'}},
            error: null,
        })
        getTripMembers = vi.fn().mockResolvedValue({
            data: [
                {
                    user_id: 'user-1',
                    email: 'organizer@example.com',
                    display_name: 'Organizer',
                    role: 'organizer',
                },
                {
                    user_id: 'member-2',
                    email: 'member@example.com',
                    display_name: 'Trip Member',
                    role: 'member',
                },
            ],
            error: null,
        })

        vi.mocked(supabaseServer.createClient).mockResolvedValue({
            auth: {getUser},
            from: vi.fn((table: string) => {
                if (table === 'trip_availability') return availabilityQuery
                if (table === 'trip_itinerary_days') return itineraryQuery
                return query
            }),
            rpc: getTripMembers,
        } as never)
        vi.mocked(navigation.redirect).mockImplementation(() => {
            throw new Error('NEXT_REDIRECT')
        })
    })

    afterEach(() => {
        cleanup()
        vi.restoreAllMocks()
    })

    async function renderContent(
        params: TripWorkspacePageProps['params'] = Promise.resolve({id: 'trip-1'})
    ) {
        const page = TripWorkspacePage({params})
        const suspense = page as React.ReactElement<{children: ReactNode}>
        const content = suspense.props.children

        if (!isValidElement(content) || typeof content.type !== 'function') {
            throw new Error('Expected the page to render its async content')
        }

        const renderContent = content.type as (
            props: TripWorkspacePageProps
        ) => Promise<ReactNode>
        return render(await renderContent(content.props as TripWorkspacePageProps))
    }

    it('redirects unauthenticated users without querying trips', async () => {
        getUser.mockResolvedValueOnce({
            data: {user: null},
            error: null,
        })

        await expect(renderContent()).rejects.toThrow('NEXT_REDIRECT')

        expect(navigation.redirect).toHaveBeenCalledWith('/entry')
        expect(query.select).not.toHaveBeenCalled()
    })

    it('renders a not-found message when the trip does not exist', async () => {
        query.maybeSingle.mockResolvedValueOnce({data: null, error: null})

        await renderContent()

        expect(screen.getByText('Trip not found')).toBeTruthy()
        expect(
            screen.getByRole('link', {name: /back to dashboard/i}).getAttribute('href')
        ).toBe('/dashboard')
    })

    it('renders the trip workspace and organizer controls', async () => {
        await renderContent()

        expect(screen.getByRole('heading', {name: 'Weekend away'})).toBeTruthy()
        expect(screen.getByText('Porto')).toBeTruthy()
        expect(screen.getAllByText('A short break')).toHaveLength(2)
        expect(screen.getByText('You')).toBeTruthy()
        expect(screen.getByText('Edit trip details')).toBeTruthy()
        expect(screen.getByText('Trip members')).toBeTruthy()
        expect(screen.getByText('Trip Member', {selector: 'p'})).toBeTruthy()
        expect(screen.getByText('member@example.com')).toBeTruthy()
        expect(screen.getByText('organizer')).toBeTruthy()
        expect(screen.getByRole('button', {name: 'Remove member'})).toBeTruthy()
        expect(screen.getByRole('link', {name: /map/i}).getAttribute('href')).toBe(
            '/trips/trip-1/map'
        )
        expect(screen.getByText('Delete this trip')).toBeTruthy()
        expect(
            screen.getByText(/transfer the organizer role or delete the trip first/i)
        ).toBeTruthy()
    })

    it('hides organizer controls from other trip members', async () => {
        getUser.mockResolvedValueOnce({
            data: {user: {id: 'member-2'}},
            error: null,
        })

        await renderContent()

        expect(screen.getByText('Trip organizer')).toBeTruthy()
        expect(screen.queryByText('Edit trip details')).toBeNull()
        expect(screen.queryByText('Delete this trip')).toBeNull()
        expect(screen.getByRole('button', {name: 'Leave trip'})).toBeTruthy()
        expect(screen.queryByRole('button', {name: 'Remove member'})).toBeNull()
    })

    it('shows the candidate date windows to every member', async () => {
        getUser.mockResolvedValueOnce({
            data: {user: {id: 'member-2'}},
            error: null,
        })

        await renderContent()

        expect(screen.getByText('Candidate dates')).toBeTruthy()
        expect(screen.getByText(/1 Jul 2099 → 10 Jul 2099/, {selector: 'p'})).toBeTruthy()
        expect(screen.queryByRole('button', {name: 'Add date window'})).toBeNull()
    })

    it('lets the organizer add date windows', async () => {
        await renderContent()

        expect(screen.getByRole('button', {name: 'Add date window'})).toBeTruthy()
    })

    it('renders an error message when the date windows query fails', async () => {
        const databaseError = {message: 'Windows unavailable'}
        query.order.mockResolvedValueOnce({data: null, error: databaseError})
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

        await renderContent()

        expect(screen.getByText('Could not load candidate dates')).toBeTruthy()
        expect(screen.getByText('Windows unavailable')).toBeTruthy()
        expect(consoleError).toHaveBeenCalledWith(
            'Error fetching date windows:',
            databaseError
        )
    })

    it('shows the availability calendar with overlaps and who is still missing', async () => {
        await renderContent()

        expect(screen.getByText('Availability')).toBeTruthy()
        expect(screen.getAllByText(/\/2 available/)).toHaveLength(10)
        expect(screen.getByText('1/2 available', {selector: 'span'})).toBeTruthy()
        expect(screen.getByText('Trip Member', {selector: 'span'})).toBeTruthy()
        expect(screen.getByRole('button', {name: 'Save my availability'})).toBeTruthy()
    })

    it('hides the availability calendar when there are no date windows', async () => {
        query.order.mockResolvedValueOnce({data: [], error: null})

        await renderContent()

        expect(screen.queryByText('Availability')).toBeNull()
    })

    it('includes answers beyond the first 1000 rows in overlaps and the missing list', async () => {
        const members = Array.from({length: 1001}, (_, index) => ({
            user_id: `member-${index}`,
            email: null,
            display_name: `Member ${index}`,
            role: 'member',
        }))
        getTripMembers.mockResolvedValueOnce({data: members, error: null})
        const rows = members.map((member) => ({
            user_id: member.user_id,
            day: '2099-07-01',
            status: 'available',
        }))
        availabilityQuery.range
            .mockResolvedValueOnce({data: rows.slice(0, 1000), error: null})
            .mockResolvedValueOnce({data: rows.slice(1000), error: null})

        await renderContent()

        expect(availabilityQuery.range.mock.calls).toEqual([[0, 999], [1000, 1999]])
        expect(availabilityQuery.order).toHaveBeenCalledWith('user_id', {ascending: true})
        expect(screen.getByText('1001/1001 available')).toBeTruthy()
        expect(screen.queryByText(/still waiting for/i)).toBeNull()
    })

    it('requests an empty final page when the answer count is exactly a full page', async () => {
        availabilityQuery.range
            .mockResolvedValueOnce({
                data: Array.from({length: 1000}, () => ({
                    user_id: 'user-1', day: '2099-07-01', status: 'available',
                })),
                error: null,
            })
            .mockResolvedValueOnce({data: [], error: null})

        await renderContent()

        expect(availabilityQuery.range.mock.calls).toEqual([[0, 999], [1000, 1999]])
    })

    it('reports a later-page failure instead of displaying partial overlaps', async () => {
        availabilityQuery.range
            .mockResolvedValueOnce({
                data: Array.from({length: 1000}, () => ({
                    user_id: 'user-1', day: '2099-07-01', status: 'available',
                })),
                error: null,
            })
            .mockResolvedValueOnce({data: null, error: {message: 'Second page failed'}})
        vi.spyOn(console, 'error').mockImplementation(() => {})

        await renderContent()

        expect(screen.getByText('Could not load availability')).toBeTruthy()
        expect(screen.queryByText('Availability')).toBeNull()
    })

    it('renders an error message when the availability query fails', async () => {
        const databaseError = {message: 'Availability unavailable'}
        availabilityQuery.range.mockResolvedValueOnce({data: null, error: databaseError})
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

        await renderContent()

        expect(screen.getByText('Could not load availability')).toBeTruthy()
        expect(consoleError).toHaveBeenCalledWith(
            'Error fetching availability:',
            databaseError
        )
    })

    it('shows the locked dates and makes dates and availability read-only', async () => {
        query.maybeSingle.mockResolvedValue({
            data: {
                ...trip,
                state: 'Dates locked',
                locked_start_date: '2099-07-02',
                locked_end_date: '2099-07-05',
            },
            error: null,
        })
        itineraryQuery.order.mockResolvedValue({
            data: [
                {day: '2099-07-02'},
                {day: '2099-07-03'},
                {day: '2099-07-04'},
                {day: '2099-07-05'},
            ],
            error: null,
        })

        await renderContent()

        expect(screen.getByText('Dates locked')).toBeTruthy()
        expect(screen.getByText('2 Jul 2099 → 5 Jul 2099')).toBeTruthy()
        expect(screen.getByText(/4 itinerary days created/)).toBeTruthy()
        expect(screen.getByRole('button', {name: 'Unlock dates'})).toBeTruthy()
        expect(screen.queryByRole('button', {name: 'Add date window'})).toBeNull()
        expect(screen.queryByRole('button', {name: 'Save my availability'})).toBeNull()
    })

    it('lets the organizer lock the dates while they are unlocked', async () => {
        await renderContent()

        expect(screen.getByRole('button', {name: 'Lock dates'})).toBeTruthy()
        expect(screen.getByRole('button', {name: 'Save my availability'})).toBeTruthy()
    })

    it('renders an error message when the itinerary days query fails', async () => {
        const databaseError = {message: 'Itinerary unavailable'}
        itineraryQuery.order.mockResolvedValueOnce({data: null, error: databaseError})
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

        await renderContent()

        expect(screen.getByText('Could not load trip dates')).toBeTruthy()
        expect(consoleError).toHaveBeenCalledWith(
            'Error fetching itinerary days:',
            databaseError
        )
    })

    it('renders an error message when the trip query fails', async () => {
        const databaseError = {message: 'Database unavailable'}
        query.maybeSingle.mockResolvedValueOnce({data: null, error: databaseError})
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

        await renderContent()

        expect(screen.getByText('Could not load trip')).toBeTruthy()
        expect(screen.getByText('Database unavailable')).toBeTruthy()
        expect(consoleError).toHaveBeenCalledWith('Error fetching trip:', databaseError)
    })
})
