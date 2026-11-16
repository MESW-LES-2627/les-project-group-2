/**
 * @file acceptanceTests/US-3.2-pin-voting.acceptance.test.tsx
 * @brief Acceptance tests for US-3.2: In-Place Pin Voting.
 */

import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { TripMapContainer } from '@/components/map/TripMapContainer'
import { Pin } from '@/types/map'
import { addVoteToPin } from '@/services/pin-votes'

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
          onClick={() => onPinClick(pin)}
        >
          {pin.name}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('@/components/map/SearchBar', () => ({
  SearchBar: () => <div data-testid="mock-search-bar" />,
}))

describe('US-3.2 Acceptance Tests: In-Place Pin Voting', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  const testPins: Pin[] = [
    {
      id: 'pin-belem',
      tripId: 'trip-lisbon',
      name: 'Torre de Belém',
      category: 'sightseeing',
      lat: 38.6916,
      lng: -9.216,
      proposedBy: 'organizer@planit.app',
      date: '2026-11-15',
      createdAt: '2026-11-01T00:00:00Z',
      votes: [
        {
          id: 'v-existing-1',
          pinId: 'pin-belem',
          userId: 'friend1',
          userEmail: 'friend1@planit.app',
          date: '2026-11-15',
          createdAt: '2026-11-01T00:00:00Z',
        },
      ],
    },
    {
      id: 'pin-porto',
      tripId: 'trip-lisbon',
      name: 'Livraria Lello',
      category: 'sightseeing',
      lat: 41.1469,
      lng: -8.6148,
      proposedBy: 'friend2@planit.app',
      date: '2026-11-17',
      createdAt: '2026-11-01T00:00:00Z',
      votes: [],
    },
  ]

  // AC 1: Given a proposed pin, when I open it, then I can vote for it or remove my vote.
  it('Scenario 1: Trip member opens a proposed pin directly on map, votes for it, and removes vote', async () => {
    render(
      <TripMapContainer
        currentUserEmail="pedro@planit.app"
        initialPins={testPins}
      />
    )

    // Wait for the dynamic Leaflet map to load
    await waitFor(() => {
      expect(screen.getByTestId('mock-leaflet-map')).toBeDefined()
    })

    // Open pin by clicking on its marker
    const marker = screen.getByTestId('marker-pin-porto')
    fireEvent.click(marker)

    // Then voting card opens
    await waitFor(() => {
      expect(screen.getByTestId('pin-vote-card')).toBeDefined()
    })

    const voteBtn = screen.getByTestId('vote-pin-button')
    expect(voteBtn.textContent).toBe('Vote')
    expect(screen.getByTestId('pin-vote-count').textContent).toBe('0 votes')

    // When I vote for it
    fireEvent.click(voteBtn)

    // Then vote count increments and button changes to "Remove vote"
    expect(screen.getByTestId('pin-vote-count').textContent).toBe('1 vote')
    expect(screen.getByTestId('pin-voters').textContent).toContain('pedro@planit.app')
    expect(voteBtn.textContent).toBe('Remove vote')

    // When I click to remove my vote
    fireEvent.click(voteBtn)

    // Then vote is removed
    expect(screen.getByTestId('pin-vote-count').textContent).toBe('0 votes')
    expect(screen.getByTestId('pin-voters').textContent).toBe('No votes yet')
    expect(voteBtn.textContent).toBe('Vote')
  })

  // AC 2: Given I already voted on a pin, when I try to vote again, then my vote is not counted twice.
  it('Scenario 2: Double voting is prevented and idempotent', async () => {
    const pin = testPins[0] // Already voted by friend1@planit.app
    expect(pin.votes?.length).toBe(1)

    // Attempting to add duplicate vote for friend1
    const attemptedDuplicate = addVoteToPin(pin, { email: 'friend1@planit.app' })

    // Vote count must not increase
    expect(attemptedDuplicate.votes?.length).toBe(1)
    expect(attemptedDuplicate.votes?.filter((v) => v.userEmail === 'friend1@planit.app').length).toBe(1)
  })

  // AC 3: Given a pin has votes, then it shows the vote count and who voted.
  it('Scenario 3: Displays vote count and lists every voter who voted on the pin', async () => {
    render(
      <TripMapContainer
        currentUserEmail="newmember@planit.app"
        initialPins={testPins}
      />
    )

    // Wait for dynamic map to load
    await waitFor(() => {
      expect(screen.getByTestId('mock-leaflet-map')).toBeDefined()
    })

    // Open Torre de Belém (has initial vote from friend1@planit.app)
    const marker = screen.getByTestId('marker-pin-belem')
    fireEvent.click(marker)

    await waitFor(() => {
      expect(screen.getByTestId('pin-vote-count').textContent).toBe('1 vote')
      expect(screen.getByTestId('pin-voters').textContent).toBe('Voted by: friend1@planit.app')
    })

    // Cast a second vote from newmember
    const voteBtn = screen.getByTestId('vote-pin-button')
    fireEvent.click(voteBtn)

    expect(screen.getByTestId('pin-vote-count').textContent).toBe('2 votes')
    expect(screen.getByTestId('pin-voters').textContent).toContain('friend1@planit.app')
    expect(screen.getByTestId('pin-voters').textContent).toContain('newmember@planit.app')
  })

  // AC 4: Given a pin is proposed for a specific trip date, then its votes count for that date only.
  it('Scenario 4: Votes on a pin scoped to a specific date count for that date only', async () => {
    // Pin is proposed for 2026-11-15 with 1 vote for 2026-11-15
    render(
      <TripMapContainer
        currentUserEmail="traveler@planit.app"
        initialPins={testPins}
      />
    )

    // Wait for dynamic map to load
    await waitFor(() => {
      expect(screen.getByTestId('mock-leaflet-map')).toBeDefined()
    })

    const marker = screen.getByTestId('marker-pin-belem')
    fireEvent.click(marker)

    // Displays date badge for 2026-11-15
    await waitFor(() => {
      expect(screen.getByTestId('pin-date-badge').textContent).toContain('2026-11-15')
      expect(screen.getByTestId('pin-vote-count').textContent).toBe('1 vote')
    })
  })
})
