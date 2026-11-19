/**
 * @file tests/itinerary-page.test.tsx
 * @brief Unit tests for the Trip Itinerary page (/trips/[id]/itinerary).
 */

import React, { isValidElement, ReactNode, ComponentProps } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import TripItineraryPage from '@/app/trips/[id]/itinerary/page'
import { TripMapContainer } from '@/components/map/TripMapContainer'
import * as supabaseServer from '@/utils/supabase/server'
import * as navigation from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('next/server', () => ({
  connection: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/components/map/TripMapContainer', () => ({
  TripMapContainer: (props: ComponentProps<typeof TripMapContainer>) => (
    <div
      data-testid="mock-trip-map-container"
      data-mode={props.mode}
      data-trip-id={props.tripId}
      data-trip-name={props.tripName}
      data-is-organizer={String(props.isOrganizer)}
      data-pins-count={props.initialPins?.length ?? 0}
    >
      <span>TripMapContainer Itinerary</span>
    </div>
  ),
}))

type MockDbQuery = {
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  then: (resolve: (v: unknown) => unknown) => Promise<unknown>
}

describe('TripItineraryPage', () => {
  let mockGetUser: ReturnType<typeof vi.fn>
  let tripResult: { data: unknown; error: unknown }
  let profileResult: { data: unknown; error: unknown }
  let pinsResult: { data: unknown; error: unknown }
  let votesResult: { data: unknown; error: unknown }

  beforeEach(() => {
    vi.clearAllMocks()

    mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-organizer', email: 'organizer@planit.app' } },
      error: null,
    })

    tripResult = {
      data: { id: 'trip-123', name: 'Lisbon Trip', organizer_id: 'user-organizer' },
      error: null,
    }

    profileResult = {
      data: { username: 'OrganizerUser', avatar_url: 'https://example.com/avatar.png' },
      error: null,
    }

    pinsResult = {
      data: [
        {
          id: 'pin-1',
          trip_id: 'trip-123',
          name: 'Belém Tower',
          category: 'sightseeing',
          lat: 38.69,
          lng: -9.21,
          proposed_by: 'organizer@planit.app',
          created_at: '2026-11-19T00:00:00Z',
          commited: true,
          date: '2026-11-20',
          description: 'Historical tower',
        },
      ],
      error: null,
    }

    votesResult = {
      data: [
        {
          id: 'vote-1',
          pin_id: 'pin-1',
          user_id: 'user-2',
          user_email: 'member@planit.app',
          trip_date: '2026-11-20',
          created_at: '2026-11-19T01:00:00Z',
        },
      ],
      error: null,
    }

    const createQuery = (table: string): MockDbQuery => {
      const q: MockDbQuery = {
        select: vi.fn(() => q),
        eq: vi.fn(() => q),
        in: vi.fn(() => q),
        order: vi.fn(() => q),
        single: vi.fn(() => Promise.resolve(profileResult)),
        maybeSingle: vi.fn(() => Promise.resolve(tripResult)),
        then: (resolve: (v: unknown) => unknown) => {
          if (table === 'pins') return Promise.resolve(resolve(pinsResult))
          if (table === 'pin_votes') return Promise.resolve(resolve(votesResult))
          return Promise.resolve(resolve({ data: null, error: null }))
        },
      }
      return q
    }

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: vi.fn((table: string) => createQuery(table)),
    } as unknown as SupabaseClient)
  })

  afterEach(() => {
    cleanup()
  })

  async function renderItinerary(params: Promise<{ id: string }>) {
    const page = await TripItineraryPage({ params })
    const suspense = page as React.ReactElement<{ children: ReactNode }>
    const content = suspense.props.children

    if (!isValidElement(content) || typeof content.type !== 'function') {
      throw new Error('Expected page to render its async content inside Suspense')
    }

    const renderContent = content.type as (props: { params: Promise<{ id: string }> }) => Promise<ReactNode>
    return render(await renderContent(content.props as { params: Promise<{ id: string }> }))
  }

  it('redirects to /entry when user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null })
    vi.mocked(navigation.redirect).mockImplementationOnce(() => {
      throw new Error('NEXT_REDIRECT')
    })

    await expect(
      renderItinerary(Promise.resolve({ id: 'trip-123' }))
    ).rejects.toThrow('NEXT_REDIRECT')

    expect(navigation.redirect).toHaveBeenCalledWith('/entry')
  })

  it('redirects to /dashboard when trip does not exist', async () => {
    tripResult = { data: null, error: null }
    vi.mocked(navigation.redirect).mockImplementationOnce(() => {
      throw new Error('NEXT_REDIRECT')
    })

    await expect(
      renderItinerary(Promise.resolve({ id: 'trip-nonexistent' }))
    ).rejects.toThrow('NEXT_REDIRECT')

    expect(navigation.redirect).toHaveBeenCalledWith('/dashboard')
  })

  it('throws error when checking trip access fails', async () => {
    tripResult = { data: null, error: { message: 'Database query failed' } }

    await expect(
      renderItinerary(Promise.resolve({ id: 'trip-error' }))
    ).rejects.toThrow(/Could not check trip access/)
  })

  it('renders TripMapContainer with mode="itinerary" and passes initial pins and organizer state', async () => {
    await renderItinerary(Promise.resolve({ id: 'trip-123' }))

    const container = screen.getByTestId('mock-trip-map-container')
    expect(container).toBeDefined()
    expect(container.getAttribute('data-mode')).toBe('itinerary')
    expect(container.getAttribute('data-trip-id')).toBe('trip-123')
    expect(container.getAttribute('data-trip-name')).toBe('Lisbon Trip')
    expect(container.getAttribute('data-is-organizer')).toBe('true')
    expect(container.getAttribute('data-pins-count')).toBe('1')
  })

  it('identifies non-organizer members correctly', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'other-user', email: 'other@planit.app' } },
      error: null,
    })

    await renderItinerary(Promise.resolve({ id: 'trip-123' }))

    const container = screen.getByTestId('mock-trip-map-container')
    expect(container.getAttribute('data-is-organizer')).toBe('false')
  })
})
