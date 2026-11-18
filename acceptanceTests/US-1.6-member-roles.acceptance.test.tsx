/**
 * @file acceptanceTests/US-1.6-member-roles.acceptance.test.tsx
 * @brief Acceptance tests for US-1.6: Member Roles and Permissions (Transfer organizer role).
 */

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PromoteToOrganizerButton } from '@/app/trips/[id]/promote-member-button'
import { promoteToOrganizer } from '@/app/trips/actions/manage-trip-members'
import * as supabaseServer from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

function createFakeSupabase(currentUserIsOrganizer: boolean) {
  let organizerId = 'user-1'
  const currentUserId = currentUserIsOrganizer ? 'user-1' : 'user-2'
  const members = [
    { trip_id: 'trip-1', user_id: 'user-1', role: 'organizer' },
    { trip_id: 'trip-1', user_id: 'user-2', role: 'member' },
  ]

  const tripQuery = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(async () => ({
      data: { organizer_id: organizerId },
      error: null,
    })),
  }

  const membershipQuery = {
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(async () => {
      return {
        data: { role: 'member' },
        error: null,
      }
    }),
  }

  const rpc = vi.fn(async (name: string, args: { p_trip_id: string; p_new_organizer_id: string }) => {
    if (name === 'promote_to_organizer') {
      if (!currentUserIsOrganizer) {
        return { error: { message: 'Only the organizer can transfer organizer privileges.' } }
      }
      organizerId = args.p_new_organizer_id
      const oldOrg = members.find((m) => m.role === 'organizer')
      const newOrg = members.find((m) => m.user_id === args.p_new_organizer_id)
      if (oldOrg) oldOrg.role = 'member'
      if (newOrg) newOrg.role = 'organizer'
      return { error: null }
    }
    return { error: { message: 'Unknown RPC' } }
  })

  return {
    getOrganizerId: () => organizerId,
    client: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: currentUserId } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => (table === 'trips' ? tripQuery : membershipQuery)),
      rpc,
    } as unknown as SupabaseClient,
  }
}

describe('US-1.6 Acceptance Tests: Member Roles & Permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...window.location,
        reload: vi.fn(),
      },
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('allows the organizer to promote a member to organizer and reloads the page', async () => {
    const fake = createFakeSupabase(true)
    vi.mocked(supabaseServer.createClient).mockResolvedValue(fake.client)

    render(<PromoteToOrganizerButton tripId="trip-1" memberId="user-2" />)

    const button = screen.getByRole('button', { name: 'Promote to organizer' })
    expect(button).toBeTruthy()

    fireEvent.click(button)

    await waitFor(() => {
      expect(fake.getOrganizerId()).toBe('user-2')
      expect(window.location.reload).toHaveBeenCalled()
    })
  })

  it('rejects promotion when the caller is not the organizer', async () => {
    const fake = createFakeSupabase(false)
    vi.mocked(supabaseServer.createClient).mockResolvedValue(fake.client)

    await expect(promoteToOrganizer('trip-1', 'user-1')).rejects.toThrow(
      'Only the trip organizer can promote members.'
    )
  })
})
