/**
 * @file tests/trip-map-persistence.test.tsx
 * @brief Verifies that TripMapContainer calls the persistence server actions for real trips.
 */

import React from 'react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { TripMapContainer } from '@/components/map/TripMapContainer'
import { Pin } from '@/types/map'
import { confirmPinAction, revertPinAction } from '@/app/trips/actions/pin-confirmation'
import { createPinAction } from '@/app/trips/actions/create-pin'
import { togglePinVoteAction } from '@/app/trips/actions/vote-pin'
import { updatePinAction, deletePinAction } from '@/app/trips/actions/manage-pins'

vi.mock('@/app/entry/actions/auth', () => ({
  logout: vi.fn(),
}))

vi.mock('@/app/trips/actions/pin-confirmation', () => ({
  confirmPinAction: vi.fn(),
  revertPinAction: vi.fn(),
}))

vi.mock('@/app/trips/actions/create-pin', () => ({
  createPinAction: vi.fn(),
}))

vi.mock('@/app/trips/actions/vote-pin', () => ({
  togglePinVoteAction: vi.fn(),
}))

vi.mock('@/app/trips/actions/manage-pins', () => ({
  updatePinAction: vi.fn(),
  deletePinAction: vi.fn(),
}))

interface MockMapProps {
  pins: Pin[]
  onMapClick: (lat: number, lng: number) => void
  onPinClick: (pin: Pin) => void
}

vi.mock('@/components/map/LeafletMap', () => ({
  default: ({ pins, onMapClick, onPinClick }: MockMapProps) => (
    <div data-testid="mock-leaflet-map">
      <button
        data-testid="trigger-map-click"
        onClick={() => onMapClick(38.71, -9.13)}
      >
        Click Map
      </button>
      {pins.map((pin) => (
        <button
          key={pin.id}
          data-testid={`marker-${pin.id}`}
          data-confirmed={Boolean(pin.isConfirmed)}
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

describe('TripMapContainer persistence', () => {
  const proposedPin: Pin = {
    id: 'pin-1',
    tripId: 'trip-1',
    name: 'Torre de Belém',
    category: 'visit',
    lat: 38.6916,
    lng: -9.216,
    proposedBy: 'organizer@planit.app',
    date: '2026-11-15',
    createdAt: '2026-11-01T00:00:00Z',
    votes: [],
    isConfirmed: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(confirmPinAction).mockResolvedValue({ success: true })
    vi.mocked(revertPinAction).mockResolvedValue({ success: true })
    vi.mocked(togglePinVoteAction).mockResolvedValue({ success: true })
    vi.mocked(updatePinAction).mockResolvedValue({ success: true })
    vi.mocked(deletePinAction).mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
  })

  async function openPin() {
    await waitFor(() => {
      expect(screen.getByTestId('marker-pin-1')).toBeDefined()
    })
    fireEvent.click(screen.getByTestId('marker-pin-1'))
  }

  it('confirms a pin through the server action', async () => {
    render(
      <TripMapContainer
        tripId="trip-1"
        currentUserEmail="organizer@planit.app"
        initialPins={[proposedPin]}
        isOrganizer
      />
    )

    await openPin()
    fireEvent.click(screen.getByTestId('confirm-pin-button'))

    expect(confirmPinAction).toHaveBeenCalledWith('trip-1', 'pin-1')
    await waitFor(() => {
      expect(screen.getByTestId('marker-pin-1').getAttribute('data-confirmed')).toBe('true')
    })
  })

  it('reverts a confirmed pin through the server action', async () => {
    render(
      <TripMapContainer
        tripId="trip-1"
        currentUserEmail="organizer@planit.app"
        initialPins={[{ ...proposedPin, isConfirmed: true }]}
        isOrganizer
      />
    )

    await openPin()
    fireEvent.click(screen.getByTestId('revert-pin-button'))

    expect(revertPinAction).toHaveBeenCalledWith('trip-1', 'pin-1')
    await waitFor(() => {
      expect(screen.getByTestId('marker-pin-1').getAttribute('data-confirmed')).toBe('false')
    })
  })

  it('persists votes and surfaces persistence errors', async () => {
    vi.mocked(togglePinVoteAction).mockResolvedValue({ error: 'Vote rejected.' })

    render(
      <TripMapContainer
        tripId="trip-1"
        currentUserEmail="member@planit.app"
        initialPins={[proposedPin]}
      />
    )

    await openPin()
    fireEvent.click(screen.getByTestId('vote-pin-button'))

    expect(togglePinVoteAction).toHaveBeenCalledWith('trip-1', 'pin-1', '2026-11-15')
    await waitFor(() => {
      expect(screen.getByTestId('pin-persistence-error').textContent).toContain('Vote rejected.')
    })
    expect(screen.getByTestId('pin-vote-count').textContent).toBe('0 votes')
  })

  it('reverts the optimistic confirmation when the action fails', async () => {
    vi.mocked(confirmPinAction).mockResolvedValue({ error: 'Not allowed.' })

    render(
      <TripMapContainer
        tripId="trip-1"
        currentUserEmail="member@planit.app"
        initialPins={[proposedPin]}
        isOrganizer
      />
    )

    await openPin()
    fireEvent.click(screen.getByTestId('confirm-pin-button'))

    await waitFor(() => {
      expect(screen.getByTestId('pin-persistence-error').textContent).toContain('Not allowed.')
      expect(screen.getByTestId('marker-pin-1').getAttribute('data-confirmed')).toBe('false')
    })
  })

  it('persists pin edits for real trips', async () => {
    render(
      <TripMapContainer
        tripId="trip-1"
        currentUserEmail="organizer@planit.app"
        initialPins={[proposedPin]}
        isOrganizer
      />
    )

    await openPin()
    fireEvent.click(screen.getByTestId('edit-pin-button'))
    fireEvent.change(screen.getByTestId('edit-pin-name'), {
      target: { value: 'Belém Tower' },
    })
    fireEvent.click(screen.getByTestId('save-edit-pin-button'))

    expect(updatePinAction).toHaveBeenCalledWith('trip-1', 'pin-1', {
      name: 'Belém Tower',
      description: '',
      category: 'visit',
      lat: 38.6916,
      lng: -9.216,
      date: '2026-11-15',
    })
    await waitFor(() => {
      expect(screen.getByTestId('marker-pin-1').textContent).toBe('Belém Tower')
    })
  })

  it('persists pin deletion and restores it when the action fails', async () => {
    vi.mocked(deletePinAction).mockResolvedValue({ error: 'Not allowed.' })

    render(
      <TripMapContainer
        tripId="trip-1"
        currentUserEmail="organizer@planit.app"
        initialPins={[proposedPin]}
        isOrganizer
      />
    )

    await openPin()
    fireEvent.click(screen.getByTestId('delete-pin-button'))

    expect(deletePinAction).toHaveBeenCalledWith('trip-1', 'pin-1')
    await waitFor(() => {
      expect(screen.getByTestId('pin-persistence-error').textContent).toContain('Not allowed.')
      expect(screen.getByTestId('marker-pin-1')).toBeDefined()
    })
  })

  it('creates a persisted pin when the map is clicked', async () => {
    vi.mocked(createPinAction).mockResolvedValue({
      success: true,
      pin: {
        ...proposedPin,
        id: 'pin-created',
        name: 'Point (38.710, -9.130)',
        lat: 38.71,
        lng: -9.13,
        date: undefined,
      },
    })

    render(
      <TripMapContainer tripId="trip-1" currentUserEmail="member@planit.app" />
    )

    await waitFor(() => {
      expect(screen.getByTestId('mock-leaflet-map')).toBeDefined()
    })
    fireEvent.click(screen.getByTestId('trigger-map-click'))
    fireEvent.click(screen.getByRole('radio', { name: 'Visit' }))
    fireEvent.click(screen.getByTestId('create-pin-button'))

    await waitFor(() => expect(createPinAction).toHaveBeenCalled())
    expect(createPinAction).toHaveBeenCalledWith('trip-1', {
      name: 'Point (38.710, -9.130)',
      category: 'visit',
      lat: 38.71,
      lng: -9.13,
    })
    await waitFor(() => {
      expect(screen.getByTestId('marker-pin-created')).toBeDefined()
    })
  })
})
