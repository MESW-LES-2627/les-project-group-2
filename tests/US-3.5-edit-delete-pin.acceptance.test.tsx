/**
 * @file acceptanceTests/US-3.5-edit-delete-pin.acceptance.test.tsx
 * @brief Acceptance tests for US-3.5: Edit/Delete Own Pin Proposal.
 */

import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react'
import { TripMapContainer } from '@/components/map/TripMapContainer'
import { Pin } from '@/types/map'
import { canEditPin, canDeletePin } from '@/services/pin-management'

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

describe('US-3.5 Acceptance Tests: Edit/Delete Own Pin Proposal', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  const testPins: Pin[] = [
    {
      id: 'pin-user-belem',
      tripId: 'trip-lisbon',
      name: 'Torre de Belém',
      description: 'Historical monument',
      category: 'visit',
      lat: 38.6916,
      lng: -9.216,
      proposedBy: 'member@planit.app',
      date: '2026-11-15',
      createdAt: '2026-11-01T00:00:00Z',
      votes: [
        {
          id: 'v-1',
          pinId: 'pin-user-belem',
          userId: 'voter-1',
          userEmail: 'voter@planit.app',
          date: '2026-11-15',
          createdAt: '2026-11-01T00:00:00Z',
        },
      ],
      isConfirmed: false,
    },
    {
      id: 'pin-confirmed-spot',
      tripId: 'trip-lisbon',
      name: 'Confirmed Monastery',
      description: 'Official spot',
      category: 'visit',
      lat: 38.6979,
      lng: -9.2067,
      proposedBy: 'member@planit.app',
      date: '2026-11-16',
      createdAt: '2026-11-01T00:00:00Z',
      votes: [],
      isConfirmed: true,
    },
  ]

  // AC 1: Given I proposed a pin, when I edit its name, description, category or location, then the changes are shown to every member.
  it('Scenario 1: Pin author edits name, description, category and coordinates; updates reflect on map and in details', async () => {
    render(
      <TripMapContainer
        currentUserEmail="member@planit.app"
        initialPins={testPins}
        isOrganizer={false}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('mock-leaflet-map')).toBeDefined()
    })

    // Click marker for proposed pin
    const marker = screen.getByTestId('marker-pin-user-belem')
    fireEvent.click(marker)

    await waitFor(() => {
      expect(screen.getByTestId('edit-pin-button')).toBeDefined()
    })

    // Click Edit button to open edit modal
    fireEvent.click(screen.getByTestId('edit-pin-button'))

    await waitFor(() => {
      expect(screen.getByTestId('edit-pin-modal')).toBeDefined()
    })

    // Edit fields
    fireEvent.change(screen.getByTestId('edit-pin-name'), {
      target: { value: 'Torre de Belém (Renamed)' },
    })
    fireEvent.change(screen.getByTestId('edit-pin-description'), {
      target: { value: 'Updated description for all members' },
    })
    fireEvent.change(screen.getByTestId('edit-pin-category'), {
      target: { value: 'activity' },
    })
    fireEvent.change(screen.getByTestId('edit-pin-lat'), {
      target: { value: '38.6920' },
    })
    fireEvent.change(screen.getByTestId('edit-pin-lng'), {
      target: { value: '-9.2150' },
    })

    // Submit edit
    fireEvent.click(screen.getByTestId('save-edit-pin-button'))

    // Changes reflect in pin card and marker
    await waitFor(() => {
      expect(screen.queryByTestId('edit-pin-modal')).toBeNull()
      expect(screen.getByTestId('pin-name').textContent).toBe('Torre de Belém (Renamed)')
      expect(within(screen.getByTestId('pin-vote-card')).getByText('Activity')).toBeDefined()
      expect(screen.getByText('Updated description for all members')).toBeDefined()
      expect(marker.textContent).toBe('Torre de Belém (Renamed)')
    })
  })

  // AC 2: Given I proposed a pin or I am the organizer, when I delete it, then it is removed together with its votes.
  it('Scenario 2: Pin author or organizer deletes pin; pin and its votes are removed from the map workspace', async () => {
    render(
      <TripMapContainer
        currentUserEmail="member@planit.app"
        initialPins={testPins}
        isOrganizer={false}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('marker-pin-user-belem')).toBeDefined()
    })

    // Open pin card
    fireEvent.click(screen.getByTestId('marker-pin-user-belem'))

    await waitFor(() => {
      expect(screen.getByTestId('delete-pin-button')).toBeDefined()
    })

    // Delete pin
    fireEvent.click(screen.getByTestId('delete-pin-button'))

    // Pin is removed from map
    await waitFor(() => {
      expect(screen.queryByTestId('marker-pin-user-belem')).toBeNull()
      expect(screen.queryByTestId('pin-vote-card')).toBeNull()
    })
  })

  // AC 3: Given a pin is confirmed, then only an organizer can edit or delete it.
  it('Scenario 3: Confirmed pin cannot be edited or deleted by member author, only by trip organizer', async () => {
    // 3A: Member (even though they proposed the pin) cannot edit or delete confirmed pin
    const { rerender } = render(
      <TripMapContainer
        currentUserEmail="member@planit.app"
        initialPins={testPins}
        isOrganizer={false}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('marker-pin-confirmed-spot')).toBeDefined()
    })

    fireEvent.click(screen.getByTestId('marker-pin-confirmed-spot'))

    await waitFor(() => {
      expect(screen.getByTestId('pin-confirmed-badge')).toBeDefined()
    })

    expect(screen.queryByTestId('edit-pin-button')).toBeNull()
    expect(screen.queryByTestId('delete-pin-button')).toBeNull()

    // Service-level assertion: author cannot edit/delete confirmed pin
    expect(canEditPin(testPins[1], 'member@planit.app', false)).toBe(false)
    expect(canDeletePin(testPins[1], 'member@planit.app', false)).toBe(false)

    // 3B: Organizer CAN edit and delete confirmed pin
    rerender(
      <TripMapContainer
        currentUserEmail="organizer@planit.app"
        initialPins={testPins}
        isOrganizer={true}
      />
    )

    fireEvent.click(screen.getByTestId('marker-pin-confirmed-spot'))

    await waitFor(() => {
      expect(screen.getByTestId('edit-pin-button')).toBeDefined()
      expect(screen.getByTestId('delete-pin-button')).toBeDefined()
    })

    expect(canEditPin(testPins[1], 'organizer@planit.app', true)).toBe(true)
    expect(canDeletePin(testPins[1], 'organizer@planit.app', true)).toBe(true)
  })
})
