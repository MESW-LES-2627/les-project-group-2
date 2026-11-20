/**
 * @file acceptanceTests/US-1.4-manage-trip-members.acceptance.test.tsx
 * @brief Acceptance tests for access revocation after leaving or being removed from a trip.
 */

import {describe, expect, it, vi} from 'vitest'
import TripMapPage from '@/app/trips/[id]/map/page'
import * as navigation from 'next/navigation'
import * as supabaseServer from '@/utils/supabase/server'
import type {SupabaseClient, User} from '@supabase/supabase-js'

vi.mock('next/server', () => ({
    connection: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('next/navigation', () => ({
    redirect: vi.fn().mockImplementation(() => {
        throw new Error('NEXT_REDIRECT')
    }),
}))

vi.mock('@/utils/supabase/server', () => ({
    createClient: vi.fn(),
}))

function createMockSupabase(user: Partial<User> | null): unknown {
    const tripQuery = {
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({data: null, error: null}),
        select: vi.fn().mockReturnThis(),
    }

    return {
        auth: {
            getUser: vi.fn().mockResolvedValue({data: {user}}),
        },
        from: vi.fn(() => tripQuery),
    }
}

describe('US-1.4 Manage trip members acceptance tests', () => {
    it('denies a former member access to the trip map', async () => {
        const mockSupabase = createMockSupabase({
            email: 'former-member@planit.app',
        })
        vi.mocked(supabaseServer.createClient).mockResolvedValue(
            mockSupabase as unknown as SupabaseClient
        )

        const element = await TripMapPage({
            params: Promise.resolve({id: 'trip-101'}),
        })
        const contentElement = element.props.children
        const ContentComponent = contentElement.type

        await expect(ContentComponent(contentElement.props)).rejects.toThrow(
            'NEXT_REDIRECT'
        )
        expect(navigation.redirect).toHaveBeenCalledWith('/dashboard')
    })
})
