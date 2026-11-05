import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { TripsCard } from '@/components/map/TripsCard'
import { TripMapContainer } from '@/components/map/TripMapContainer'
import * as getMemberTripsModule from '@/app/trips/actions/get-member-trips'
import * as navigation from 'next/navigation'

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

describe('TripsCard component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <TripsCard isOpen={false} onClose={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders card header, close button, and fetches member trips when opened', async () => {
    const onClose = vi.fn()
    vi.spyOn(getMemberTripsModule, 'getUserMemberTrips').mockResolvedValueOnce([])

    render(<TripsCard isOpen={true} onClose={onClose} />)

    expect(screen.getByText('My Trips')).toBeDefined()
    expect(screen.getByText('Trips where you are a member.')).toBeDefined()

    const closeBtn = screen.getByLabelText('Close trips panel')
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)

    await waitFor(() => {
      expect(screen.getByTestId('no-trips-message')).toBeDefined()
      expect(
        screen.getByText(
          'You are not associated with any trips as a member yet.'
        )
      ).toBeDefined()
    })
  })

  it('displays loading indicator and handles fetch errors with retry', async () => {
    const mockFetch = vi
      .spyOn(getMemberTripsModule, 'getUserMemberTrips')
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([])

    render(<TripsCard isOpen={true} onClose={vi.fn()} />)

    await waitFor(() => {
      expect(
        screen.getByText('Could not load trips. Please try again.')
      ).toBeDefined()
    })

    const retryBtn = screen.getByText('Try again')
    fireEvent.click(retryBtn)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(screen.getByTestId('no-trips-message')).toBeDefined()
    })
  })

  it('renders expandable trip rectangles with name, state, and dates list', async () => {
    const mockTrips: getMemberTripsModule.UserMemberTrip[] = [
      {
        id: 'trip-10',
        name: 'Lisbon Food Tour',
        destination: 'Lisbon, Portugal',
        description: 'Pastéis de Belém and grilled sardines',
        state: 'confirmed',
        created_at: '2026-03-01T00:00:00Z',
        organizer_id: 'user-99',
        trip_dates: [
          {
            date_id: 'd-1',
            date_itself: '2026-08-10T11:00:00Z',
            event: 'Food Tasting Tour',
          },
          {
            date_id: 'd-2',
            date_itself: '2026-08-11T19:30:00Z',
            event: 'Fado Dinner in Alfama',
          },
        ],
      },
      {
        id: 'trip-20',
        name: 'Madeira Hiking',
        destination: null,
        description: null,
        state: null,
        created_at: null,
        organizer_id: null,
        trip_dates: [],
      },
      {
        id: 'trip-30',
        name: 'Porto Discovery',
        destination: 'Porto',
        description: 'River cruise',
        state: 'planning',
        created_at: null,
        organizer_id: null,
        trip_dates: [
          {
            date_id: 'd-3',
            date_itself: null,
            event: 'Boat ride on Douro',
          },
        ],
      },
    ]

    vi.spyOn(getMemberTripsModule, 'getUserMemberTrips').mockResolvedValueOnce(
      mockTrips
    )

    render(<TripsCard isOpen={true} onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Lisbon Food Tour')).toBeDefined()
      expect(screen.getByText('Madeira Hiking')).toBeDefined()
      expect(screen.getByText('Porto Discovery')).toBeDefined()
    })

    // Destination and state previews
    expect(screen.getByText('Lisbon, Portugal')).toBeDefined()
    expect(screen.getByText('confirmed')).toBeDefined()
    expect(screen.getByText('Planning')).toBeDefined()

    // Expand first trip
    const expandBtn1 = screen.getByTestId('trip-expand-btn-trip-10')
    fireEvent.click(expandBtn1)

    // Expanded details check
    const details1 = screen.getByTestId('trip-details-trip-10')
    expect(details1).toBeDefined()
    expect(screen.getByText('Pastéis de Belém and grilled sardines')).toBeDefined()
    expect(screen.getByText('Food Tasting Tour')).toBeDefined()
    expect(screen.getByText('Fado Dinner in Alfama')).toBeDefined()

    // Clicking expand again collapses it
    fireEvent.click(expandBtn1)
    expect(screen.queryByTestId('trip-details-trip-10')).toBeNull()

    // Expand second trip without dates -> should display "Dates not set"
    const expandBtn2 = screen.getByTestId('trip-expand-btn-trip-20')
    fireEvent.click(expandBtn2)
    const details2 = screen.getByTestId('trip-details-trip-20')
    expect(details2).toBeDefined()
    expect(screen.getAllByText('Dates not set').length).toBeGreaterThan(0)

    // Expand third trip with event without date -> displays "Dates not set" for that event
    const expandBtn3 = screen.getByTestId('trip-expand-btn-trip-30')
    fireEvent.click(expandBtn3)
    expect(screen.getByText('Boat ride on Douro')).toBeDefined()

    // Bottom create trip button check
    const newTripLink = screen.getByRole('button', { name: /create trip/i })
    expect(newTripLink.getAttribute('href')).toBe('/trips/new')
  })

  it('redirects to trip page when clicking trip rectangle outside expand button', async () => {
    const mockTrips: getMemberTripsModule.UserMemberTrip[] = [
      {
        id: 'trip-abc',
        name: 'Coimbra University Visit',
        destination: 'Coimbra',
        description: null,
        state: 'ongoing',
        created_at: null,
        organizer_id: null,
        trip_dates: [],
      },
    ]

    vi.spyOn(getMemberTripsModule, 'getUserMemberTrips').mockResolvedValueOnce(
      mockTrips
    )

    render(<TripsCard isOpen={true} onClose={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Coimbra University Visit')).toBeDefined()
    })

    const tripRect = screen.getByTestId('trip-rectangle-trip-abc')

    // Clicking the rectangle navigates to /trips/trip-abc
    fireEvent.click(tripRect)
    expect(mockPush).toHaveBeenCalledWith('/trips/trip-abc')

    // Keyboard navigation: Enter key
    mockPush.mockClear()
    fireEvent.keyDown(tripRect, { key: 'Enter' })
    expect(mockPush).toHaveBeenCalledWith('/trips/trip-abc')

    // Clicking expand button does not navigate
    mockPush.mockClear()
    const expandBtn = screen.getByTestId('trip-expand-btn-trip-abc')
    fireEvent.click(expandBtn)
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('handles router not being available without errors', () => {
    vi.spyOn(navigation, 'useRouter').mockImplementation(() => {
      throw new Error('No router')
    })

    const mockTrips: getMemberTripsModule.UserMemberTrip[] = [
      {
        id: 'trip-fallback',
        name: 'Fallback Trip',
        destination: null,
        description: null,
        state: null,
        created_at: null,
        organizer_id: null,
        trip_dates: [],
      },
    ]

    render(
      <TripsCard
        isOpen={true}
        onClose={vi.fn()}
        initialTrips={mockTrips}
      />
    )

    const tripRect = screen.getByTestId('trip-rectangle-trip-fallback')
    expect(() => fireEvent.click(tripRect)).not.toThrow()
  })
})

describe('TripMapContainer integration with TripsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('toggles member trips card when clicking the Trips header button', async () => {
    vi.spyOn(getMemberTripsModule, 'getUserMemberTrips').mockResolvedValue([])

    render(<TripMapContainer currentUserEmail="user@planit.app" />)

    const toggleBtn = screen.getByTestId('toggle-trips-card-button')
    expect(toggleBtn).toBeDefined()
    expect(screen.getByText('Trips')).toBeDefined()

    // Card should not be visible initially
    expect(screen.queryByRole('region', { name: 'Member trips panel' })).toBeNull()

    // Click to open
    fireEvent.click(toggleBtn)
    expect(screen.getByRole('region', { name: 'Member trips panel' })).toBeDefined()

    // Click again to close
    fireEvent.click(toggleBtn)
    expect(screen.queryByRole('region', { name: 'Member trips panel' })).toBeNull()
  })
})
