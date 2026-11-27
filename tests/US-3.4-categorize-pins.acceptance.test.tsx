/**
 * @file tests/US-3.4-categorize-pins.acceptance.test.tsx
 * @brief Acceptance tests for US-3.4: Categorize Pins.
 */

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { TripMapContainer } from '@/components/map/TripMapContainer'
import { PIN_CATEGORIES, type Pin } from '@/types/map'
import { createPinAction } from '@/app/trips/actions/create-pin'
import { updatePinAction } from '@/app/trips/actions/manage-pins'

vi.mock('@/app/entry/actions/auth', () => ({
  logout: vi.fn(),
}))

vi.mock('@/app/trips/actions/create-pin', () => ({
  createPinAction: vi.fn(),
}))

vi.mock('@/app/trips/actions/manage-pins', () => ({
  updatePinAction: vi.fn(),
  deletePinAction: vi.fn(),
}))

vi.mock('@/app/trips/actions/vote-pin', () => ({
  togglePinVoteAction: vi.fn(),
}))

vi.mock('@/app/trips/actions/pin-confirmation', () => ({
  confirmPinAction: vi.fn(),
  revertPinAction: vi.fn(),
}))

interface MockMapProps {
  pins: Pin[]
  onPinClick: (pin: Pin) => void
  onMapClick: (lat: number, lng: number) => void
}

vi.mock('@/components/map/LeafletMap', () => ({
  default: ({ pins, onPinClick, onMapClick }: MockMapProps) => (
    <div data-testid="mock-leaflet-map">
      <button data-testid="trigger-map-click" onClick={() => onMapClick(38.71, -9.13)}>
        Click Map
      </button>
      {pins.map((pin) => (
        <button
          key={pin.id}
          data-testid={`marker-${pin.id}`}
          data-category={pin.category}
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

const ownPin: Pin = {
  id: 'pin-own',
  tripId: 'trip-1',
  name: 'Belém Tower',
  category: 'visit',
  lat: 38.6916,
  lng: -9.216,
  proposedBy: 'member@planit.app',
  createdAt: '2026-11-01T00:00:00Z',
  votes: [],
  isConfirmed: false,
}

function createdPin(name: string, category: Pin['category']): Pin {
  return { ...ownPin, id: 'pin-created', name, category, proposedBy: 'member@planit.app' }
}

describe('US-3.4 Acceptance Tests: Categorize Pins', () => {
  beforeEach(() => {
    vi.mocked(updatePinAction).mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  // AC1: Given I create a pin, then I must choose one of Stay, Visit, Activity, Food or Meeting Point.
  it('AC1: a new pin cannot be created without choosing one of the five categories', async () => {
    vi.mocked(createPinAction).mockResolvedValue({
      success: true,
      pin: createdPin('Point (38.710, -9.130)', 'meeting_point'),
    })
    render(<TripMapContainer tripId="trip-1" currentUserEmail="member@planit.app" />)

    fireEvent.click(await screen.findByTestId('trigger-map-click'))

    const modal = screen.getByTestId('new-pin-modal')
    expect(within(modal).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(
      PIN_CATEGORIES.map((category) => category.value)
    )
    expect(screen.queryByTestId('marker-pin-created')).toBeNull()

    fireEvent.click(screen.getByTestId('create-pin-button'))
    expect(screen.getByTestId('new-pin-error').textContent).toBe('Choose a category for the pin.')
    expect(createPinAction).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('radio', { name: 'Meeting Point' }))
    fireEvent.click(screen.getByTestId('create-pin-button'))

    await waitFor(() =>
      expect(createPinAction).toHaveBeenCalledWith('trip-1', {
        name: 'Point (38.710, -9.130)',
        category: 'meeting_point',
        lat: 38.71,
        lng: -9.13,
      })
    )
    expect((await screen.findByTestId('marker-pin-created')).getAttribute('data-category')).toBe(
      'meeting_point'
    )
    expect(screen.queryByTestId('new-pin-modal')).toBeNull()
  })

  it('AC1: cancelling the new pin dialog creates nothing', async () => {
    render(<TripMapContainer tripId="trip-1" currentUserEmail="member@planit.app" />)

    fireEvent.click(await screen.findByTestId('trigger-map-click'))
    fireEvent.click(screen.getByTestId('cancel-new-pin-button'))

    expect(screen.queryByTestId('new-pin-modal')).toBeNull()
    expect(createPinAction).not.toHaveBeenCalled()
  })

  it('AC1: a failed creation shows the server error and keeps the map unchanged', async () => {
    vi.mocked(createPinAction).mockResolvedValue({ error: 'Failed to create pin.' })
    render(<TripMapContainer tripId="trip-1" currentUserEmail="member@planit.app" />)

    fireEvent.click(await screen.findByTestId('trigger-map-click'))
    fireEvent.click(screen.getByRole('radio', { name: 'Food' }))
    fireEvent.click(screen.getByTestId('create-pin-button'))

    expect(await screen.findByText('Failed to create pin.')).toBeTruthy()
    expect(screen.queryByTestId('marker-pin-created')).toBeNull()
  })

  // AC2: Given pins of different categories, then each category has its own icon and colour on the map.
  it('AC2: every category has its own icon and colour', () => {
    const icons = new Set(PIN_CATEGORIES.map((category) => category.icon))
    const colours = new Set(PIN_CATEGORIES.map((category) => category.color))

    expect(PIN_CATEGORIES).toHaveLength(5)
    expect(icons.size).toBe(5)
    expect(colours.size).toBe(5)
  })

  // AC3: Given I open the map, then a legend explains each category.
  it('AC3: the map shows a legend that explains each category', () => {
    render(<TripMapContainer tripId="trip-1" currentUserEmail="member@planit.app" />)

    const legend = screen.getByTestId('category-legend')
    PIN_CATEGORIES.forEach((category) => {
      expect(within(legend).getByText(category.label)).toBeTruthy()
    })
  })

  // AC4: Given I proposed a pin, when I change its category, then the new icon is shown to every member.
  it('AC4: changing the category of my pin updates it and saves it for the whole trip', async () => {
    render(
      <TripMapContainer
        tripId="trip-1"
        currentUserEmail="member@planit.app"
        initialPins={[ownPin]}
      />
    )

    fireEvent.click(screen.getByTestId('marker-pin-own'))
    fireEvent.click(await screen.findByTestId('edit-pin-button'))
    fireEvent.change(screen.getByTestId('edit-pin-category'), { target: { value: 'stay' } })
    fireEvent.click(screen.getByTestId('save-edit-pin-button'))

    await waitFor(() =>
      expect(updatePinAction).toHaveBeenCalledWith(
        'trip-1',
        'pin-own',
        expect.objectContaining({ category: 'stay' })
      )
    )
    expect(screen.getByTestId('marker-pin-own').getAttribute('data-category')).toBe('stay')
    expect(within(screen.getByTestId('pin-vote-card')).getByText('Stay')).toBeTruthy()
  })
})
