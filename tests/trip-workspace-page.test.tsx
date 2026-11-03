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

type TripWorkspacePageProps = {
    params: Promise<{id: string}>
}

type Query = {
    select: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    maybeSingle: ReturnType<typeof vi.fn>
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
    let getUser: ReturnType<typeof vi.fn>

    beforeEach(() => {
        vi.clearAllMocks()

        query = {
            select: vi.fn(),
            eq: vi.fn(),
            maybeSingle: vi.fn(),
        }
        query.select.mockReturnValue(query)
        query.eq.mockReturnValue(query)
        query.maybeSingle.mockResolvedValue({data: trip, error: null})

        getUser = vi.fn().mockResolvedValue({
            data: {user: {id: 'user-1'}},
            error: null,
        })

        vi.mocked(supabaseServer.createClient).mockResolvedValue({
            auth: {getUser},
            from: vi.fn(() => query),
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
        expect(screen.getByRole('link', {name: /map/i}).getAttribute('href')).toBe(
            '/trips/trip-1/map'
        )
        expect(screen.getByText('Delete this trip')).toBeTruthy()
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
