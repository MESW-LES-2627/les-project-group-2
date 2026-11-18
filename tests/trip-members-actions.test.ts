import {beforeEach, describe, expect, it, vi} from 'vitest'
import {leaveTrip, promoteToOrganizer, removeTripMember} from '@/app/trips/actions/manage-trip-members'
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
    update: ReturnType<typeof vi.fn>
    eq: ReturnType<typeof vi.fn>
    maybeSingle: ReturnType<typeof vi.fn>
    select: ReturnType<typeof vi.fn>
}

describe('Trip member actions', () => {
    let tripQuery: MockQuery
    let membershipQuery: MockQuery
    let getUser: ReturnType<typeof vi.fn>
    let from: ReturnType<typeof vi.fn>
    let rpc: ReturnType<typeof vi.fn>

    beforeEach(() => {
        vi.clearAllMocks()

        tripQuery = {
            delete: vi.fn(),
            update: vi.fn(),
            eq: vi.fn(),
            maybeSingle: vi.fn().mockResolvedValue({
                data: {organizer_id: 'user-1'},
                error: null,
            }),
            select: vi.fn(),
        }
        membershipQuery = {
            delete: vi.fn(),
            update: vi.fn(),
            eq: vi.fn(),
            maybeSingle: vi.fn(),
            select: vi.fn(),
        }

        for (const query of [tripQuery, membershipQuery]) {
            query.delete.mockReturnValue(query)
            query.update.mockReturnValue(query)
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
        rpc = vi.fn().mockResolvedValue({error: null})

        vi.mocked(supabaseServer.createClient).mockResolvedValue({
            auth: {getUser},
            from,
            rpc,
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

    describe('promoteToOrganizer', () => {
        it('allows the organizer to promote another member to organizer using rpc', async () => {
            membershipQuery.maybeSingle.mockResolvedValueOnce({
                data: {role: 'member'},
                error: null,
            })

            const result = await promoteToOrganizer('trip-1', 'member-2')

            expect(result).toEqual({success: true})
            expect(rpc).toHaveBeenCalledWith('promote_to_organizer', {
                p_trip_id: 'trip-1',
                p_new_organizer_id: 'member-2',
            })
            expect(nextCache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1')
            expect(nextCache.revalidatePath).toHaveBeenCalledWith('/dashboard')
        })

        it('allows promoting via FormData and redirects', async () => {
            membershipQuery.maybeSingle.mockResolvedValueOnce({
                data: {role: 'member'},
                error: null,
            })
            const formData = new FormData()
            formData.set('tripId', 'trip-1')
            formData.set('memberId', 'member-2')

            await expect(promoteToOrganizer(formData)).rejects.toThrow('NEXT_REDIRECT')

            expect(rpc).toHaveBeenCalledWith('promote_to_organizer', {
                p_trip_id: 'trip-1',
                p_new_organizer_id: 'member-2',
            })
            expect(nextCache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1')
            expect(navigation.redirect).toHaveBeenCalledWith('/trips/trip-1')
        })

        it('falls back to table updates when rpc is not a function', async () => {
            vi.mocked(supabaseServer.createClient).mockResolvedValueOnce({
                auth: {getUser},
                from,
            } as never)
            membershipQuery.maybeSingle.mockResolvedValueOnce({
                data: {role: 'member'},
                error: null,
            })

            const result = await promoteToOrganizer('trip-1', 'member-2')

            expect(result).toEqual({success: true})
            expect(membershipQuery.update).toHaveBeenCalledWith({role: 'member'})
            expect(membershipQuery.update).toHaveBeenCalledWith({role: 'organizer'})
            expect(tripQuery.update).toHaveBeenCalledWith({organizer_id: 'member-2'})
            expect(nextCache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1')
        })

        it('does not let a non-organizer promote a member', async () => {
            tripQuery.maybeSingle.mockResolvedValueOnce({
                data: {organizer_id: 'other-user'},
                error: null,
            })

            await expect(promoteToOrganizer('trip-1', 'member-2')).rejects.toThrow(
                'Only the trip organizer can promote members.'
            )
            expect(rpc).not.toHaveBeenCalled()
        })

        it('does not let the organizer promote themselves', async () => {
            await expect(promoteToOrganizer('trip-1', 'user-1')).rejects.toThrow(
                'The organizer cannot promote themselves.'
            )
            expect(rpc).not.toHaveBeenCalled()
        })

        it('rejects promoting a non-existent member or member with wrong role', async () => {
            membershipQuery.maybeSingle.mockResolvedValueOnce({
                data: null,
                error: null,
            })

            await expect(promoteToOrganizer('trip-1', 'unknown-user')).rejects.toThrow(
                'Trip member not found.'
            )
            expect(rpc).not.toHaveBeenCalled()
        })

        it('handles rpc errors properly', async () => {
            membershipQuery.maybeSingle.mockResolvedValueOnce({
                data: {role: 'member'},
                error: null,
            })
            rpc.mockResolvedValueOnce({
                error: {message: 'Database error occurred'},
            })

            await expect(promoteToOrganizer('trip-1', 'member-2')).rejects.toThrow(
                'Could not promote member to organizer: Database error occurred'
            )
        })

        it('requires tripId and memberId', async () => {
            await expect(promoteToOrganizer('', 'member-2')).rejects.toThrow('tripId is required.')
            await expect(promoteToOrganizer('trip-1', '')).rejects.toThrow('memberId is required.')
        })
    })
})
