/**
 * @file acceptanceTests/1.5-acceptance_goals.acceptance.test.tsx
 * @brief Acceptance tests for US-1.5: My Trips Dashboard Goals.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { TripMapContainer } from '@/components/map/TripMapContainer'
import * as getMemberTripsModule from '@/app/trips/actions/get-member-trips'
import type { UserMemberTrip } from '@/app/trips/actions/get-member-trips'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  redirect: vi.fn(),
}))

vi.mock('@/app/entry/actions/auth', () => ({
  logout: vi.fn(),
}))

vi.mock('@/components/map/LeafletMap', () => ({
  default: () => <div data-testid="mock-leaflet-map" />,
}))

vi.mock('@/components/map/SearchBar', () => ({
  SearchBar: () => <div data-testid="mock-search-bar" />,
}))

describe('US-1.5: My Trips Dashboard Acceptance Goals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('Given I am logged in, when I open the dashboard, then I see every trip I belong to', async () => {
    // Given I am logged in with trips I belong to
    const memberTrips: UserMemberTrip[] = [
      {
        id: 'trip-1',
        name: 'Azores Adventure',
        destination: 'São Miguel, Portugal',
        description: 'Lakes and hot springs',
        state: 'Planning',
        created_at: '2026-06-01T00:00:00Z',
        organizer_id: 'user-1',
        trip_dates: [
          {
            date_id: 'd-1',
            date_itself: '2026-07-15T09:00:00Z',
            event: 'Arrival & car pickup',
          },
        ],
      },
      {
        id: 'trip-2',
        name: 'Porto Wine Weekend',
        destination: 'Porto, Portugal',
        description: 'Wine tasting in Gaia',
        state: 'Dates locked',
        created_at: '2026-06-02T00:00:00Z',
        organizer_id: 'user-2',
        trip_dates: [
          {
            date_id: 'd-2',
            date_itself: '2026-08-20T18:00:00Z',
            event: 'Cellar tour',
          },
        ],
      },
      {
        id: 'trip-3',
        name: 'Lisbon City Break',
        destination: 'Lisbon, Portugal',
        description: null,
        state: 'Finished',
        created_at: '2026-06-03T00:00:00Z',
        organizer_id: 'user-3',
        trip_dates: [],
      },
    ]

    vi.spyOn(getMemberTripsModule, 'getUserMemberTrips').mockResolvedValue(memberTrips)

    // When I open the dashboard
    render(<TripMapContainer currentUserEmail="traveler@planit.app" />)

    // Open the trips panel
    const tripsBtn = screen.getByTestId('toggle-trips-card-button')
    fireEvent.click(tripsBtn)

    // Then I see every trip I belong to
    await waitFor(() => {
      expect(screen.getByText('Azores Adventure')).toBeDefined()
      expect(screen.getByText('Porto Wine Weekend')).toBeDefined()
      expect(screen.getByText('Lisbon City Break')).toBeDefined()
    })
  })

  it('Given a trip in the list, then it shows its name, its dates (or "Dates not set") and its status: Planning, Dates locked or Finished', async () => {
    const memberTrips: UserMemberTrip[] = [
      {
        id: 'trip-planning',
        name: 'Summer in Algarve',
        destination: 'Faro',
        description: 'Beach holiday',
        state: 'Planning',
        created_at: null,
        organizer_id: null,
        trip_dates: [],
      },
      {
        id: 'trip-dates-locked',
        name: 'Douro Valley Cruise',
        destination: 'Régua',
        description: 'River cruise',
        state: 'Dates locked',
        created_at: null,
        organizer_id: null,
        trip_dates: [
          {
            date_id: 'd-locked',
            date_itself: '2026-09-10T14:00:00Z',
            event: 'Boarding cruise',
          },
        ],
      },
      {
        id: 'trip-finished',
        name: 'Gerês Hiking Camp',
        destination: 'Gerês',
        description: 'Trail trekking',
        state: 'Finished',
        created_at: null,
        organizer_id: null,
        trip_dates: [
          {
            date_id: 'd-finished',
            date_itself: '2026-05-01T08:00:00Z',
            event: 'Summit climb',
          },
        ],
      },
    ]

    vi.spyOn(getMemberTripsModule, 'getUserMemberTrips').mockResolvedValue(memberTrips)

    render(<TripMapContainer currentUserEmail="traveler@planit.app" />)

    const tripsBtn = screen.getByTestId('toggle-trips-card-button')
    fireEvent.click(tripsBtn)

    await waitFor(() => {
      // 1. Planning trip without dates shows name, "Dates not set", and status "Planning"
      expect(screen.getByText('Summer in Algarve')).toBeDefined()
      expect(screen.getByText('Planning')).toBeDefined()
      expect(screen.getByText('Dates not set')).toBeDefined()

      // 2. Dates locked trip shows name, its dates, and status "Dates locked"
      expect(screen.getByText('Douro Valley Cruise')).toBeDefined()
      expect(screen.getByText('Dates locked')).toBeDefined()

      // 3. Finished trip shows name, its dates, and status "Finished"
      expect(screen.getByText('Gerês Hiking Camp')).toBeDefined()
      expect(screen.getByText('Finished')).toBeDefined()
    })

    // Also expand the trip without dates to verify expanded view details
    const expandBtn1 = screen.getByTestId('trip-expand-btn-trip-planning')
    fireEvent.click(expandBtn1)
    const details1 = screen.getByTestId('trip-details-trip-planning')
    expect(details1).toBeDefined()
    expect(details1.textContent).toContain('Summer in Algarve')
    expect(details1.textContent).toContain('Planning')
    expect(details1.textContent).toContain('Dates not set')

    // Expand Dates locked trip to verify expanded details
    const expandBtn2 = screen.getByTestId('trip-expand-btn-trip-dates-locked')
    fireEvent.click(expandBtn2)
    const details2 = screen.getByTestId('trip-details-trip-dates-locked')
    expect(details2).toBeDefined()
    expect(details2.textContent).toContain('Douro Valley Cruise')
    expect(details2.textContent).toContain('Dates locked')
    expect(details2.textContent).toContain('Boarding cruise')

    // Expand Finished trip to verify expanded details
    const expandBtn3 = screen.getByTestId('trip-expand-btn-trip-finished')
    fireEvent.click(expandBtn3)
    const details3 = screen.getByTestId('trip-details-trip-finished')
    expect(details3).toBeDefined()
    expect(details3.textContent).toContain('Gerês Hiking Camp')
    expect(details3.textContent).toContain('Finished')
    expect(details3.textContent).toContain('Summit climb')
  })

  it('Given I click a trip, then its workspace opens', async () => {
    const memberTrips: UserMemberTrip[] = [
      {
        id: 'trip-ws-999',
        name: 'Madeira Discovery Trip',
        destination: 'Funchal',
        description: null,
        state: 'Planning',
        created_at: null,
        organizer_id: null,
        trip_dates: [],
      },
    ]

    vi.spyOn(getMemberTripsModule, 'getUserMemberTrips').mockResolvedValue(memberTrips)

    render(<TripMapContainer currentUserEmail="traveler@planit.app" />)

    const tripsBtn = screen.getByTestId('toggle-trips-card-button')
    fireEvent.click(tripsBtn)

    await waitFor(() => {
      expect(screen.getByText('Madeira Discovery Trip')).toBeDefined()
    })

    // Given I click a trip
    const tripRect = screen.getByTestId('trip-rectangle-trip-ws-999')
    fireEvent.click(tripRect)

    // Then its workspace opens
    expect(mockPush).toHaveBeenCalledWith('/trips/trip-ws-999')
  })

  it('Given I do not belong to any trip, when I open the dashboard, then I see an empty state with a "Create trip" button', async () => {
    // Given I do not belong to any trip
    vi.spyOn(getMemberTripsModule, 'getUserMemberTrips').mockResolvedValue([])

    // When I open the dashboard
    render(<TripMapContainer currentUserEmail="newuser@planit.app" />)

    const tripsBtn = screen.getByTestId('toggle-trips-card-button')
    fireEvent.click(tripsBtn)

    // Then I see an empty state with a "Create trip" button
    await waitFor(() => {
      expect(screen.getByTestId('no-trips-message')).toBeDefined()
      expect(screen.getByText('No trips found')).toBeDefined()

      const createBtn = screen.getByRole('button', { name: /create trip/i })
      expect(createBtn).toBeDefined()
      expect(createBtn.getAttribute('href')).toBe('/trips/new')
    })
  })
})
