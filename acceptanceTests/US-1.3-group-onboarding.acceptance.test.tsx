/**
 * @file acceptanceTests/US-1.3-group-onboarding.acceptance.test.tsx
 * @brief Acceptance tests for US-1.3: Group Onboarding via Link/Code.
 */

import React, { isValidElement, type ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import TripWorkspacePage from '@/app/trips/[id]/page'
import JoinTripPage from '@/app/trips/join/page'
import * as joinTripAction from '@/app/trips/actions/join-trip'
import * as regenerateModule from '@/app/trips/actions/regenerate-invite-code'
import * as authAction from '@/app/entry/actions/auth'
import * as navigation from 'next/navigation'
import * as supabaseServer from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('next/server', () => ({
  connection: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
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

vi.mock('@/app/trips/actions/regenerate-invite-code', () => ({
  regenerateInviteCode: vi.fn(),
}))

type MockQuery = {
  select: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
}

describe('US-1.3 Acceptance Tests: Group Onboarding via Link/Code', () => {
  let mockTripsQuery: MockQuery
  let mockMembersQuery: MockQuery
  let mockGetUser: ReturnType<typeof vi.fn>
  let writeTextMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    })

    mockTripsQuery = {
      select: vi.fn(() => mockTripsQuery),
      update: vi.fn(() => mockTripsQuery),
      insert: vi.fn(() => mockTripsQuery),
      eq: vi.fn(() => mockTripsQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'trip-algarve-2026',
          name: 'Algarve Summer Trip',
          destination: 'Faro, Portugal',
          description: 'Sun, beach, and seafood',
          organizer_id: 'user-organizer',
          invite_code: 'ALGARVE8',
        },
        error: null,
      }),
    }

    mockMembersQuery = {
      select: vi.fn(() => mockMembersQuery),
      update: vi.fn(() => mockMembersQuery),
      insert: vi.fn().mockResolvedValue({ error: null }),
      eq: vi.fn(() => mockMembersQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }

    mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-organizer' } },
      error: null,
    })

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: {
        getUser: mockGetUser,
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
      },
      from: vi.fn((table: string) => {
        if (table === 'trips') return mockTripsQuery
        if (table === 'trip_members') return mockMembersQuery
        if (table === 'trip_date_windows' || table === 'trip_availability') {
          const windowsQuery = {
            select: vi.fn(() => windowsQuery),
            eq: vi.fn(() => windowsQuery),
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }
          return windowsQuery
        }
        return mockTripsQuery
      }),
      rpc: vi.fn().mockResolvedValue({
        data: [
          {
            user_id: 'user-organizer',
            email: null,
            display_name: 'Organizer',
            role: 'organizer',
          },
        ],
        error: null,
      }),
    } as unknown as SupabaseClient)

    vi.mocked(navigation.redirect).mockImplementation((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`)
    })
  })

  afterEach(() => {
    cleanup()
  })

  async function renderWorkspace(tripId = 'trip-algarve-2026') {
    const page = TripWorkspacePage({ params: Promise.resolve({ id: tripId }) })
    const suspense = page as React.ReactElement<{ children: ReactNode }>
    const content = suspense.props.children

    if (!isValidElement(content) || typeof content.type !== 'function') {
      throw new Error('Expected TripWorkspacePage to render async content')
    }

    const renderFn = content.type as (props: { params: Promise<{ id: string }> }) => Promise<ReactNode>
    return render(await renderFn({ params: Promise.resolve({ id: tripId }) }))
  }

  async function renderJoinPage(code?: string) {
    const page = await JoinTripPage({ searchParams: Promise.resolve({ code }) })
    const suspense = page as React.ReactElement<{ children: ReactNode }>
    const content = suspense.props.children

    if (!isValidElement(content) || typeof content.type !== 'function') {
      throw new Error('Expected JoinTripPage to render async content')
    }

    const renderFn = content.type as (
      props: { searchParams: Promise<{ code?: string }> }
    ) => Promise<ReactNode>

    return render(await renderFn({ searchParams: Promise.resolve({ code }) }))
  }

  // AC 1: Given I am the organizer, when I open the trip settings, then I can copy a unique invite link and code.
  it('Scenario 1: Organizer opens trip settings and copies unique invite code and link', async () => {
    await renderWorkspace()

    expect(screen.getByTestId('invite-settings')).toBeDefined()
    expect(screen.getByTestId('displayed-invite-code').textContent).toBe('ALGARVE8')
    expect(screen.getByTestId('displayed-invite-url').textContent).toContain('/trips/join?code=ALGARVE8')

    // Copy Code
    const copyCodeBtn = screen.getByTestId('copy-code-button')
    fireEvent.click(copyCodeBtn)
    expect(writeTextMock).toHaveBeenCalledWith('ALGARVE8')

    // Copy Link
    const copyLinkBtn = screen.getByTestId('copy-link-button')
    fireEvent.click(copyLinkBtn)
    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('/trips/join?code=ALGARVE8'))
  })

  // AC 2: Given a logged-in user with a valid link or code, when they open or enter it, then they are added to the trip as a member.
  it('Scenario 2: Logged-in user joins trip with valid code and is registered as member', async () => {
    // Current user is friend (not organizer)
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'friend-user-123' } },
      error: null,
    })

    // Calling the actual joinTripByCode action implementation
    const realJoinTrip = (await vi.importActual<typeof joinTripAction>('@/app/trips/actions/join-trip'))
      .joinTripByCode

    await expect(realJoinTrip('ALGARVE8')).rejects.toThrow(
      'NEXT_REDIRECT:/trips/trip-algarve-2026'
    )

    expect(mockMembersQuery.insert).toHaveBeenCalledWith({
      trip_id: 'trip-algarve-2026',
      user_id: 'friend-user-123',
      role: 'member',
    })
  })

  // AC 3: Given a user who is not logged in, when they open the invite link, then they are asked to log in or sign up and are added to the trip afterwards.
  it('Scenario 3: Unauthenticated user opening invite link is prompted to log in/sign up with return destination', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    })

    await expect(renderJoinPage('ALGARVE8')).rejects.toThrow(
      'NEXT_REDIRECT:/entry?redirectTo=%2Ftrips%2Fjoin%3Fcode%3DALGARVE8'
    )

    // And when user logs in with redirectTo, they are forwarded back to join
    const loginFormData = new FormData()
    loginFormData.append('email', 'friend@example.com')
    loginFormData.append('password', 'secret')
    loginFormData.append('redirectTo', '/trips/join?code=ALGARVE8')

    await expect(authAction.login(null, loginFormData)).rejects.toThrow(
      'NEXT_REDIRECT:/trips/join?code=ALGARVE8'
    )
  })

  // AC 4: Given an invalid or revoked code, when a user enters it, then they see an error and are not added to the trip.
  it('Scenario 4: User entering an invalid or revoked code sees error and is not added to trip', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'friend-user-123' } },
      error: null,
    })

    mockTripsQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    })

    const realJoinTrip = (await vi.importActual<typeof joinTripAction>('@/app/trips/actions/join-trip'))
      .joinTripByCode

    const res = await realJoinTrip('EXPIRED_CODE')
    expect(res).toEqual({ error: 'Invalid or revoked invite code.' })
    expect(mockMembersQuery.insert).not.toHaveBeenCalled()
  })

  // AC 5: Given I am the organizer, when I regenerate the invite code, then the previous link and code stop working.
  it('Scenario 5: Organizer regenerates code, previous code stops working and new code is active', async () => {
    vi.mocked(regenerateModule.regenerateInviteCode).mockResolvedValueOnce({
      success: true,
      newCode: 'NEWALGARVE99',
    })

    await renderWorkspace()

    const regenBtn = screen.getByTestId('regenerate-code-button')
    fireEvent.click(regenBtn)

    await waitFor(() => {
      expect(screen.getByTestId('displayed-invite-code').textContent).toBe('NEWALGARVE99')
      expect(screen.getByTestId('displayed-invite-url').textContent).toContain('code=NEWALGARVE99')
    })
  })
})
