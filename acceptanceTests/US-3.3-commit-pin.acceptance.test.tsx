/**
 * @file acceptanceTests/US-3.3-commit-pin.acceptance.test.tsx
 * @brief Acceptance tests for US-3.3: Committing Pins to Trip Itinerary.
 */

import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { TripMapContainer } from '@/components/map/TripMapContainer'
import { Pin } from '@/types/map'
import * as pinsActions from '@/app/trips/actions/pins'

vi.mock('@/app/entry/actions/auth', () => ({
  logout: vi.fn(),
}))

vi.mock('@/app/trips/actions/pins', () => ({
  createPinAction: vi.fn(),
  toggleCommitPinAction: vi.fn(),
  getPinsAction: vi.fn(),
  deletePinAction: vi.fn(),
  removePinAction: vi.fn(),
}))

interface MockMapProps {
  pins: Pin[]
  onPinClick: (pin: Pin) => void
  onMapClick: (lat: number, lng: number) => void
}

vi.mock('@/components/map/LeafletMap', () => ({
  default: ({ pins, onPinClick, onMapClick }: MockMapProps) => (
    <div data-testid="mock-leaflet-map">
      <button
        data-testid="mock-map-canvas"
        onClick={() => onMapClick(38.71, -9.13)}
      >
        Click Map
      </button>
      {pins.map((pin) => (
        <button
          key={pin.id}
          data-testid={`marker-${pin.id}`}
          data-committed={String(pin.commited ?? pin.committed ?? false)}
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

describe('US-3.3 Acceptance Tests: Committing Pins to Itinerary', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  const sampleTripPins: Pin[] = [
    {
      id: 'pin-tower',
      tripId: 'trip-lisbon-123',
      name: 'Torre de Belém',
      category: 'sightseeing',
      lat: 38.6916,
      lng: -9.216,
      proposedBy: 'organizer@planit.app',
      createdAt: '2026-11-01T00:00:00Z',
      commited: false,
      committed: false,
      votes: [],
    },
    {
      id: 'pin-castle',
      tripId: 'trip-lisbon-123',
      name: 'Castelo de S. Jorge',
      category: 'sightseeing',
      lat: 38.7139,
      lng: -9.1334,
      proposedBy: 'friend@planit.app',
      createdAt: '2026-11-02T00:00:00Z',
      commited: true,
      committed: true,
      votes: [],
    },
  ]

  // Requirement: Itinerary page displays only two floating cards (Trip Name & Back button)
  it('Scenario 1: Itinerary page renders ONLY the two required cards and back button links to trip workspace', async () => {
    render(
      <TripMapContainer
        mode="itinerary"
        tripId="trip-lisbon-123"
        tripName="Lisbon Adventure"
        isOrganizer={true}
        currentUserEmail="organizer@planit.app"
        initialPins={sampleTripPins}
        allowPinCreation={true}
      />
    )

    // Wait for map
    await waitFor(() => {
      expect(screen.getByTestId('mock-leaflet-map')).toBeDefined()
    })

    // Card 1: Back button
    const backBtn = screen.getByTestId('back-to-trip-button')
    expect(backBtn).toBeDefined()
    expect(backBtn.getAttribute('href')).toBe('/trips/trip-lisbon-123')
    expect(backBtn.textContent).toContain('Voltar')

    // Card 2: Trip Name card
    const tripNameCard = screen.getByTestId('trip-name-card')
    expect(tripNameCard).toBeDefined()
    expect(tripNameCard.textContent).toContain('Lisbon Adventure')

    // None of the dashboard-only controls should be present
    expect(screen.queryByTestId('toggle-trips-card-button')).toBeNull()
    expect(screen.queryByTestId('mock-search-bar')).toBeNull()
    expect(screen.queryByTitle('Sign out')).toBeNull()
  })

  // Requirement: Organizers can commit / uncommit a pin from its card
  it('Scenario 2: Organizer clicks a pin and toggles commit to itinerary', async () => {
    vi.mocked(pinsActions.toggleCommitPinAction).mockResolvedValueOnce({
      success: true,
      commited: true,
    })

    render(
      <TripMapContainer
        mode="itinerary"
        tripId="trip-lisbon-123"
        tripName="Lisbon Adventure"
        isOrganizer={true}
        currentUserEmail="organizer@planit.app"
        initialPins={sampleTripPins}
        allowPinCreation={true}
      />
    )

    // Click marker for uncommitted pin
    const marker = screen.getByTestId('marker-pin-tower')
    expect(marker.getAttribute('data-committed')).toBe('false')
    fireEvent.click(marker)

    // Pin card opens
    await waitFor(() => {
      expect(screen.getByTestId('pin-vote-card')).toBeDefined()
    })

    const commitBtn = screen.getByTestId('toggle-commit-pin-button')
    expect(commitBtn.textContent).toBe('Commit')
    expect(screen.queryByTestId('pin-committed-badge')).toBeNull()

    // Click commit
    fireEvent.click(commitBtn)

    // After commit, badge appears and button changes to Uncommit
    await waitFor(() => {
      expect(screen.getByTestId('pin-committed-badge')).toBeDefined()
      expect(screen.getByText('In itinerary')).toBeDefined()
      expect(commitBtn.textContent).toBe('Uncommit')
    })

    // Now uncommit
    vi.mocked(pinsActions.toggleCommitPinAction).mockResolvedValueOnce({
      success: true,
      commited: false,
    })
    fireEvent.click(commitBtn)

    await waitFor(() => {
      expect(screen.queryByTestId('pin-committed-badge')).toBeNull()
      expect(commitBtn.textContent).toBe('Commit')
    })
  })

  // Requirement: Non-organizer members CANNOT commit pins
  it('Scenario 3: Non-organizers do not see commit button on pins', async () => {
    render(
      <TripMapContainer
        mode="itinerary"
        tripId="trip-lisbon-123"
        tripName="Lisbon Adventure"
        isOrganizer={false}
        currentUserEmail="member@planit.app"
        initialPins={sampleTripPins}
        allowPinCreation={true}
      />
    )

    const marker = screen.getByTestId('marker-pin-tower')
    fireEvent.click(marker)

    await waitFor(() => {
      expect(screen.getByTestId('pin-vote-card')).toBeDefined()
    })

    // Commit button should not be rendered for non-organizers
    expect(screen.queryByTestId('toggle-commit-pin-button')).toBeNull()
    // But voting button is available
    expect(screen.getByTestId('vote-pin-button')).toBeDefined()
  })

  // Requirement: Dropping pin on itinerary persists to database
  it('Scenario 4: Dropping a pin on the itinerary map invokes createPinAction', async () => {
    const createdDbPin: Pin = {
      id: 'pin-new-db',
      tripId: 'trip-lisbon-123',
      name: 'Point (38.710, -9.130)',
      category: 'sightseeing',
      lat: 38.71,
      lng: -9.13,
      proposedBy: 'member@planit.app',
      createdAt: '2026-11-19T00:00:00Z',
      commited: false,
      committed: false,
      votes: [],
    }

    vi.mocked(pinsActions.createPinAction).mockResolvedValueOnce({
      pin: createdDbPin,
    })

    render(
      <TripMapContainer
        mode="itinerary"
        tripId="trip-lisbon-123"
        tripName="Lisbon Adventure"
        isOrganizer={false}
        currentUserEmail="member@planit.app"
        initialPins={[]}
        allowPinCreation={true}
      />
    )

    // Click map canvas
    const canvas = screen.getByTestId('mock-map-canvas')
    fireEvent.click(canvas)

    await waitFor(() => {
      expect(pinsActions.createPinAction).toHaveBeenCalledWith(
        'trip-lisbon-123',
        expect.objectContaining({
          lat: 38.71,
          lng: -9.13,
          category: 'sightseeing',
        })
      )
    })
  })

  // Requirement: Dashboard map has pins disabled
  it('Scenario 5: Dashboard map does not allow pin creation on map clicks', async () => {
    render(
      <TripMapContainer
        mode="dashboard"
        currentUserEmail="explorer@planit.app"
        initialPins={[]}
        allowPinCreation={false}
      />
    )

    const canvas = screen.getByTestId('mock-map-canvas')
    fireEvent.click(canvas)

    // No pins should be added
    expect(screen.queryByTestId('pin-vote-card')).toBeNull()
    expect(pinsActions.createPinAction).not.toHaveBeenCalled()
  })

  // Requirement: Organizers can remove pins from the map
  it('Scenario 6: Organizer can remove a pin using "Remover pin" button', async () => {
    vi.mocked(pinsActions.deletePinAction).mockResolvedValueOnce({ success: true })

    render(
      <TripMapContainer
        mode="itinerary"
        tripId="trip-lisbon-123"
        tripName="Lisbon Adventure"
        isOrganizer={true}
        currentUserEmail="organizer@planit.app"
        initialPins={sampleTripPins}
        allowPinCreation={true}
      />
    )

    // Marker exists initially
    expect(screen.getByTestId('marker-pin-tower')).toBeDefined()

    // Click marker
    fireEvent.click(screen.getByTestId('marker-pin-tower'))

    await waitFor(() => {
      expect(screen.getByTestId('pin-vote-card')).toBeDefined()
    })

    const removeBtn = screen.getByRole('button', { name: /remover pin/i })
    expect(removeBtn).toBeDefined()

    // Click "Remover pin"
    fireEvent.click(removeBtn)

    await waitFor(() => {
      // Pin card is closed
      expect(screen.queryByTestId('pin-vote-card')).toBeNull()
      // Marker is removed from map
      expect(screen.queryByTestId('marker-pin-tower')).toBeNull()
    })

    expect(pinsActions.deletePinAction).toHaveBeenCalledWith(
      'trip-lisbon-123',
      'pin-tower'
    )
  })

  // Requirement: Non-organizer members CANNOT remove pins
  it('Scenario 7: Non-organizers cannot see the "Remover pin" button', async () => {
    render(
      <TripMapContainer
        mode="itinerary"
        tripId="trip-lisbon-123"
        tripName="Lisbon Adventure"
        isOrganizer={false}
        currentUserEmail="member@planit.app"
        initialPins={sampleTripPins}
        allowPinCreation={true}
      />
    )

    const marker = screen.getByTestId('marker-pin-tower')
    fireEvent.click(marker)

    await waitFor(() => {
      expect(screen.getByTestId('pin-vote-card')).toBeDefined()
    })

    // Remove pin button must not be rendered for non-organizers
    expect(screen.queryByRole('button', { name: /remover pin/i })).toBeNull()
    expect(screen.queryByTestId('remove-pin-button')).toBeNull()
    expect(screen.queryByTestId('delete-pin-button')).toBeNull()
  })
})
