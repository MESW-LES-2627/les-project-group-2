import {beforeEach, describe, expect, it, vi} from 'vitest'
import {leaveTrip, removeTripMember} from '@/app/trips/actions/manage-trip-members'
import * as navigation from 'next/navigation'
import * as supabaseServer from '@/utils/supabase/server'
import * as nextCache from 'next/cache'

vi.mock('next/navigation', () => ({
    redirect: vi.fn(),
}))

vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(),
}))

type MockQuery = {
    delete: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    maybeSingle: ReturnType<typeof vi.fn>
    select: ReturnType<typeof vi.fn>
}

describe('Trip member actions', () => {
    let tripQuery: MockQuery
    let membershipQuery: MockQuery
    let getUser: ReturnType<typeof vi.fn>
    let from: ReturnType<typeof vi.fn>

    beforeEach(() => {
        vi.clearAllMocks()

        tripQuery = {
            delete: vi.fn(),
            eq: vi.fn(),
            maybeSingle: vi.fn().mockResolvedValue({
                data: {organizer_id: 'user-1'},
                error: null,
            }),
            select: vi.fn(),
        }
        membershipQuery = {
            delete: vi.fn(),
            eq: vi.fn(),
            maybeSingle: vi.fn(),
            select: vi.fn(),
        }

        for (const query of [tripQuery, membershipQuery]) {
            query.delete.mockReturnValue(query)
            query.eq.mockReturnValue(query)
            query.select.mockReturnValue(query)
        }

        membershipQuery.maybeSingle.mockResolvedValue({
            data: {role: 'member'},
            error: null,
        })

        getUser = vi.fn().mockResolvedValue({
            data: {user: {id: 'user-1'}},
            error: null,
        })
        from = vi.fn((table: string) =>
            table === 'trips' ? tripQuery : membershipQuery
        )

        vi.mocked(supabaseServer.createClient).mockResolvedValue({
            auth: {getUser},
            from,
        } as never)
        vi.mocked(navigation.redirect).mockImplementation(() => {
            throw new Error('NEXT_REDIRECT')
        })
    })

    it('allows the organizer to remove another member and refreshes the trip', async () => {
        membershipQuery.maybeSingle
            .mockResolvedValueOnce({data: {role: 'member'}, error: null})
            .mockResolvedValueOnce({data: {user_id: 'member-2'}, error: null})
        const formData = new FormData()
        formData.set('tripId', 'trip-1')
        formData.set('memberId', 'member-2')

        await expect(removeTripMember(formData)).rejects.toThrow('NEXT_REDIRECT')

        expect(tripQuery.eq).toHaveBeenCalledWith('id', 'trip-1')
        expect(membershipQuery.eq).toHaveBeenNthCalledWith(1, 'trip_id', 'trip-1')
        expect(membershipQuery.eq).toHaveBeenNthCalledWith(2, 'user_id', 'member-2')
        expect(nextCache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1')
        expect(nextCache.revalidatePath).toHaveBeenCalledWith('/dashboard')
        expect(navigation.redirect).toHaveBeenCalledWith('/trips/trip-1')
    })

    it('reports when the member delete is silently blocked', async () => {
        membershipQuery.maybeSingle
            .mockResolvedValueOnce({data: {role: 'member'}, error: null})
            .mockResolvedValueOnce({data: null, error: null})
        const formData = new FormData()
        formData.set('tripId', 'trip-1')
        formData.set('memberId', 'member-2')

        await expect(removeTripMember(formData)).rejects.toThrow(
            'The member was not removed.'
        )

        expect(nextCache.revalidatePath).not.toHaveBeenCalled()
        expect(navigation.redirect).not.toHaveBeenCalled()
    })

    it('does not let a non-organizer remove a member', async () => {
        tripQuery.maybeSingle.mockResolvedValueOnce({
            data: {organizer_id: 'another-user'},
            error: null,
        })
        const formData = new FormData()
        formData.set('tripId', 'trip-1')
        formData.set('memberId', 'member-2')

        await expect(removeTripMember(formData)).rejects.toThrow(
            'Only the trip organizer can remove members.'
        )

        expect(membershipQuery.delete).not.toHaveBeenCalled()
    })

    it('lets a regular member leave and redirects to the dashboard', async () => {
        getUser.mockResolvedValueOnce({
            data: {user: {id: 'member-2'}},
            error: null,
        })
        membershipQuery.maybeSingle
            .mockResolvedValueOnce({data: {role: 'member'}, error: null})
            .mockResolvedValueOnce({data: {user_id: 'member-2'}, error: null})
        const formData = new FormData()
        formData.set('tripId', 'trip-1')

        await expect(leaveTrip(formData)).rejects.toThrow('NEXT_REDIRECT')

        expect(membershipQuery.eq).toHaveBeenNthCalledWith(1, 'trip_id', 'trip-1')
        expect(membershipQuery.eq).toHaveBeenNthCalledWith(2, 'user_id', 'member-2')
        expect(membershipQuery.eq).toHaveBeenNthCalledWith(3, 'trip_id', 'trip-1')
        expect(membershipQuery.eq).toHaveBeenNthCalledWith(4, 'user_id', 'member-2')
        expect(nextCache.revalidatePath).toHaveBeenCalledWith('/dashboard')
        expect(navigation.redirect).toHaveBeenCalledWith('/dashboard')
    })

    it('requires the organizer to transfer their role or delete the trip first', async () => {
        membershipQuery.maybeSingle.mockResolvedValueOnce({
            data: {role: 'organizer'},
            error: null,
        })
        const formData = new FormData()
        formData.set('tripId', 'trip-1')

        await expect(leaveTrip(formData)).rejects.toThrow(
            'Transfer the organizer role or delete the trip before leaving.'
        )

        expect(membershipQuery.delete).not.toHaveBeenCalled()
    })

    it('requires a trip ID before contacting Supabase', async () => {
        await expect(leaveTrip(new FormData())).rejects.toThrow('tripId is required.')

        expect(supabaseServer.createClient).not.toHaveBeenCalled()
    })
})
