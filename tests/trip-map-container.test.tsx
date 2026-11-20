import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { TripMapContainer } from '@/components/map/TripMapContainer'
import { Pin, PlaceSearchResult } from '@/types/map'
import { addVoteToPin } from '@/services/pin-votes'

vi.mock('@/app/entry/actions/auth', () => ({
  logout: vi.fn(),
}))

interface MockMapProps {
  pins: Pin[]
  layerId?: string
  apiKey?: string
  flyToTarget?: { lat: number; lng: number; zoom?: number } | null
  onMapClick: (lat: number, lng: number) => void
  onPinClick: (pin: Pin) => void
}

let capturedMapProps: MockMapProps | null = null

vi.mock('@/components/map/LeafletMap', () => ({
  default: (props: MockMapProps) => {
    capturedMapProps = props
    return (
      <div data-testid="mock-leaflet-map" data-pins-count={props.pins.length}>
        {props.pins.map((pin) => (
          <button
            key={pin.id}
            data-testid={`marker-${pin.id}`}
            onClick={() => props.onPinClick(pin)}
          >
            {pin.name}
          </button>
        ))}
        <button
          data-testid="trigger-map-click"
          onClick={() => props.onMapClick(38.71, -9.13)}
        >
          Click Map
        </button>
      </div>
    )
  },
}))

vi.mock('@/components/map/SearchBar', () => ({
  SearchBar: ({ onSelectPlace }: { onSelectPlace: (place: PlaceSearchResult) => void }) => (
    <div data-testid="mock-search-bar">
      <button
        data-testid="trigger-select-place"
        onClick={() =>
          onSelectPlace({
            placeId: 'loc-1',
            name: 'Guimarães',
            displayName: 'Guimarães, Portugal',
            lat: 41.4425,
            lon: -8.2918,
            type: 'city',
          })
        }
      >
        Select Place
      </button>
    </div>
  ),
}))

describe('TripMapContainer Unit Tests', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    capturedMapProps = null
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

  it('renders brand badge, user email, search bar, and controls', async () => {
    render(
      <TripMapContainer
        currentUserEmail="traveler@planit.app"
        cartoApiKey="carto-test-key"
      />
    )

    expect(screen.getByText('PlanIt')).toBeDefined()
    expect(screen.getByText('traveler@planit.app')).toBeDefined()
    expect(screen.getByTitle('Sign out')).toBeDefined()

    await waitFor(() => {
      expect(screen.getByTestId('mock-leaflet-map')).toBeDefined()
    })
  })

  it('drops a pin when selecting a search result', async () => {
    render(<TripMapContainer currentUserEmail="traveler@planit.app" />)

    const selectBtn = screen.getByTestId('trigger-select-place')
    fireEvent.click(selectBtn)

    await waitFor(() => {
      expect(capturedMapProps?.pins).toHaveLength(1)
      expect(capturedMapProps?.pins[0].name).toBe('Guimarães')
      expect(capturedMapProps?.flyToTarget).toEqual({
        lat: 41.4425,
        lng: -8.2918,
        zoom: 14,
      })
    })
  })

  it('drops a new pin upon map click and opens voting card', async () => {
    render(<TripMapContainer />)

    await waitFor(() => {
      expect(screen.getByTestId('trigger-map-click')).toBeDefined()
    })

    fireEvent.click(screen.getByTestId('trigger-map-click'))

    await waitFor(() => {
      expect(capturedMapProps?.pins).toHaveLength(1)
      expect(capturedMapProps?.pins[0].name).toBe('Point (38.710, -9.130)')
    })
  })

  it('allows voting and unvoting on a pin', async () => {
    render(
      <TripMapContainer
        currentUserEmail="pedro@planit.app"
        initialPins={testPins}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('mock-leaflet-map')).toBeDefined()
    })

    const marker = screen.getByTestId('marker-pin-porto')
    fireEvent.click(marker)

    await waitFor(() => {
      expect(screen.getByTestId('pin-vote-card')).toBeDefined()
    })

    const voteBtn = screen.getByTestId('vote-pin-button')
    expect(voteBtn.textContent).toBe('Vote')
    expect(screen.getByTestId('pin-vote-count').textContent).toBe('0 votes')

    fireEvent.click(voteBtn)
    expect(screen.getByTestId('pin-vote-count').textContent).toBe('1 vote')
    expect(voteBtn.textContent).toBe('Remove vote')

    fireEvent.click(voteBtn)
    expect(screen.getByTestId('pin-vote-count').textContent).toBe('0 votes')
    expect(voteBtn.textContent).toBe('Vote')
  })

  it('handles vote idempotency in addVoteToPin', () => {
    const pin = testPins[0]
    expect(pin.votes?.length).toBe(1)
    const duplicate = addVoteToPin(pin, { email: 'friend1@planit.app' })
    expect(duplicate.votes?.length).toBe(1)
  })
})
