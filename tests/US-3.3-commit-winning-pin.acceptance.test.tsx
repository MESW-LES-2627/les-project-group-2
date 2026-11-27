/**
 * @file acceptanceTests/US-3.3-commit-winning-pin.acceptance.test.tsx
 * @brief Acceptance tests for US-3.3: Commit Winning Pin to Itinerary.
 */

import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { TripMapContainer } from '@/components/map/TripMapContainer'
import { Pin } from '@/types/map'
import { toggleVoteOnPin } from '@/services/pin-votes'

vi.mock('@/app/entry/actions/auth', () => ({
  logout: vi.fn(),
}))

interface MockMapProps {
  pins: Pin[]
  onPinClick: (pin: Pin) => void
  onMapClick: (lat: number, lng: number) => void
}

vi.mock('@/components/map/LeafletMap', () => ({
  default: ({ pins, onPinClick }: MockMapProps) => (
    <div data-testid="mock-leaflet-map">
      {pins.map((pin) => (
        <button
          key={pin.id}
          data-testid={`marker-${pin.id}`}
          data-confirmed={Boolean(pin.isConfirmed)}
          className={pin.isConfirmed ? 'confirmed-marker' : 'proposed-marker'}
          onClick={() => onPinClick(pin)}
        >
          {pin.isConfirmed ? `★ ${pin.name}` : pin.name}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('@/components/map/SearchBar', () => ({
  SearchBar: () => <div data-testid="mock-search-bar" />,
}))

describe('US-3.3 Acceptance Tests: Commit Winning Pin to Itinerary', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  const testPins: Pin[] = [
    {
      id: 'pin-belem',
      tripId: 'trip-lisbon',
      name: 'Torre de Belém',
      category: 'visit',
      lat: 38.6916,
      lng: -9.216,
      proposedBy: 'organizer@planit.app',
      date: '2026-11-15',
      createdAt: '2026-11-01T00:00:00Z',
      votes: [
        {
          id: 'v-1',
          pinId: 'pin-belem',
          userId: 'friend1',
          userEmail: 'friend1@planit.app',
          date: '2026-11-15',
          createdAt: '2026-11-01T00:00:00Z',
        },
      ],
      isConfirmed: false,
    },
    {
      id: 'pin-porto',
      tripId: 'trip-lisbon',
      name: 'Livraria Lello',
      category: 'visit',
      lat: 41.1469,
      lng: -8.6148,
      proposedBy: 'friend2@planit.app',
      date: '2026-11-17',
      createdAt: '2026-11-01T00:00:00Z',
      votes: [],
      isConfirmed: false,
    },
  ]

  // AC 1: Given a proposed pin, when I confirm it, then it changes style on the map and appears in the confirmed spots list.
  it('Scenario 1: Trip organizer confirms a proposed pin; style changes on map and pin appears in confirmed spots list', async () => {
    render(
      <TripMapContainer
        currentUserEmail="organizer@planit.app"
        initialPins={testPins}
        isOrganizer={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('mock-leaflet-map')).toBeDefined()
    })

    // Initially 0 confirmed spots in header badge
    const confirmedToggle = screen.getByTestId('toggle-confirmed-spots-button')
    expect(confirmedToggle.textContent).toContain('Confirmed (0)')

    // Click marker for Torre de Belém
    const marker = screen.getByTestId('marker-pin-belem')
    expect(marker.getAttribute('data-confirmed')).toBe('false')
    fireEvent.click(marker)

    // Open pin vote card and confirm pin as organizer
    await waitFor(() => {
      expect(screen.getByTestId('confirm-pin-button')).toBeDefined()
    })

    fireEvent.click(screen.getByTestId('confirm-pin-button'))

    // Marker reflects confirmed state
    await waitFor(() => {
      expect(marker.getAttribute('data-confirmed')).toBe('true')
      expect(marker.textContent).toContain('★ Torre de Belém')
    })

    // Header counter increments
    expect(confirmedToggle.textContent).toContain('Confirmed (1)')

    // Open confirmed spots list drawer
    fireEvent.click(confirmedToggle)

    await waitFor(() => {
      expect(screen.getByTestId('confirmed-spots-card')).toBeDefined()
      expect(screen.getByTestId('confirmed-spot-item-pin-belem')).toBeDefined()
      expect(screen.getByTestId('confirmed-spot-name-pin-belem').textContent).toBe('Torre de Belém')
    })
  })

  // AC 2: Given a pin is confirmed, then voting on it is closed.
  it('Scenario 2: When a pin is confirmed, voting on it is closed', async () => {
    const confirmedPinList: Pin[] = [
      {
        ...testPins[0],
        isConfirmed: true,
      },
    ]

    render(
      <TripMapContainer
        currentUserEmail="member@planit.app"
        initialPins={confirmedPinList}
        isOrganizer={false}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('mock-leaflet-map')).toBeDefined()
    })

    // Open pin card
    const marker = screen.getByTestId('marker-pin-belem')
    fireEvent.click(marker)

    // Voting is closed
    await waitFor(() => {
      expect(screen.getByTestId('pin-confirmed-badge')).toBeDefined()
      expect(screen.getByTestId('voting-closed-badge').textContent).toBe('Voting closed')
      expect(screen.queryByTestId('vote-pin-button')).toBeNull()
    })

    // Direct service voting check: toggleVoteOnPin should be a no-op on confirmed pins
    const attemptedVote = toggleVoteOnPin(confirmedPinList[0], { email: 'member@planit.app' })
    expect(attemptedVote.votes?.length).toBe(confirmedPinList[0].votes?.length)
  })

  // AC 3: Given a pin is confirmed, when I revert it, then it goes back to proposed and voting reopens.
  it('Scenario 3: Trip organizer reverts a confirmed pin; it returns to proposed and voting reopens', async () => {
    const confirmedPinList: Pin[] = [
      {
        ...testPins[0],
        isConfirmed: true,
      },
    ]

    render(
      <TripMapContainer
        currentUserEmail="organizer@planit.app"
        initialPins={confirmedPinList}
        isOrganizer={true}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('mock-leaflet-map')).toBeDefined()
    })

    const marker = screen.getByTestId('marker-pin-belem')
    expect(marker.getAttribute('data-confirmed')).toBe('true')
    fireEvent.click(marker)

    // Revert button is shown for confirmed pin
    await waitFor(() => {
      expect(screen.getByTestId('revert-pin-button')).toBeDefined()
    })

    fireEvent.click(screen.getByTestId('revert-pin-button'))

    // Pin is reverted to proposed
    await waitFor(() => {
      expect(marker.getAttribute('data-confirmed')).toBe('false')
      expect(screen.queryByTestId('pin-confirmed-badge')).toBeNull()
      expect(screen.getByTestId('vote-pin-button')).toBeDefined()
      expect(screen.queryByTestId('voting-closed-badge')).toBeNull()
    })

    // Voting reopens: member/organizer can vote again
    const voteBtn = screen.getByTestId('vote-pin-button')
    fireEvent.click(voteBtn)
    expect(screen.getByTestId('pin-vote-count').textContent).toBe('2 votes')
  })
})
