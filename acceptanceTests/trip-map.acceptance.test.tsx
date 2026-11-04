/**
 * @file acceptanceTests/US-3.1-trip-map.acceptance.test.tsx
 * @brief Acceptance tests for US-3.1: Interactive Map and Pin Dropping.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { TripMapContainer } from '@/components/map/TripMapContainer'
import { Pin, PlaceSearchResult } from '@/types/map'

vi.mock('@/app/entry/actions/auth', () => ({
  logout: vi.fn(),
}))

interface MockMapProps {
  pins: Pin[]
  layerId: string
  apiKey?: string
  flyToTarget: { lat: number; lng: number; zoom?: number } | null
  onMapClick: (lat: number, lng: number) => void
  onPinClick: (pin: Pin) => void
}

let capturedMapProps: MockMapProps | null = null

vi.mock('@/components/map/LeafletMap', () => ({
  default: (props: MockMapProps) => {
    capturedMapProps = props
    return (
      <div data-testid="mock-leaflet-map" data-pins-count={props.pins.length}>
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

describe('US-3.1 Acceptance Tests: Interactive Map and Pin Dropping', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    capturedMapProps = null
  })

  describe('Scenario: Authenticated user interacts with map workspace', () => {
    it('shows brand badge, user email, search bar, and sign out control', async () => {
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

    it('renders user profile button with username and avatar circle falling back to /no_pic.png when NULL', () => {
      render(
        <TripMapContainer
          currentUserEmail="traveler@planit.app"
          currentUsername="SigmaDwight"
          currentUserAvatar={null}
        />
      )

      const profileBtn = screen.getByRole('button', { name: /sigmadwight/i })
      expect(profileBtn).toBeDefined()

      const avatarImg = profileBtn.querySelector('img') as HTMLImageElement
      expect(avatarImg.getAttribute('src')).toBe('/no_pic.png')

      // Exercise onError fallback
      avatarImg.src = 'https://broken.image/fail.png'
      fireEvent.error(avatarImg)
      expect(avatarImg.getAttribute('src')).toBe('/no_pic.png')
    })

    it('renders user profile button with custom avatar when present', () => {
      render(
        <TripMapContainer
          currentUserEmail="traveler@planit.app"
          currentUsername="SigmaDwight"
          currentUserAvatar="https://supabase.co/storage/profile_pics/user-123.png"
        />
      )

      const profileBtn = screen.getByRole('button', { name: /sigmadwight/i })
      expect(profileBtn).toBeDefined()

      const avatarImg = profileBtn.querySelector('img') as HTMLImageElement
      expect(avatarImg.getAttribute('src')).toBe(
        'https://supabase.co/storage/profile_pics/user-123.png'
      )
    })

    it('toggles profile card modal when clicking the profile header button', () => {
      render(
        <TripMapContainer
          currentUserEmail="traveler@planit.app"
          currentUsername="SigmaDwight"
          currentUserAvatar={null}
        />
      )

      const profileBtn = screen.getByRole('button', { name: /sigmadwight/i })
      expect(screen.queryByRole('dialog', { name: 'Profile' })).toBeNull()

      // Click to open
      fireEvent.click(profileBtn)
      expect(screen.getByRole('dialog', { name: 'Profile' })).toBeDefined()
      expect(screen.getByRole('button', { name: 'Delete account' })).toBeDefined()
      expect(screen.getByRole('button', { name: 'Edit' })).toBeDefined()

      // Click again to close (toggle)
      fireEvent.click(profileBtn)
      expect(screen.queryByRole('dialog', { name: 'Profile' })).toBeNull()
    })

    it('renders without currentUserEmail gracefully', async () => {
      render(<TripMapContainer />)
      expect(screen.getByText('PlanIt')).toBeDefined()
      expect(screen.queryByText('traveler@planit.app')).toBeNull()
    })

    it('drops a pin and centers map camera when user selects a searched location', async () => {
      render(<TripMapContainer currentUserEmail="traveler@planit.app" />)

      const selectBtn = screen.getByTestId('trigger-select-place')
      fireEvent.click(selectBtn)

      await waitFor(() => {
        expect(capturedMapProps?.pins).toHaveLength(1)
        expect(capturedMapProps?.pins[0].name).toBe('Guimarães')
        expect(capturedMapProps?.pins[0].lat).toBe(41.4425)
        expect(capturedMapProps?.pins[0].lng).toBe(-8.2918)
        expect(capturedMapProps?.pins[0].proposedBy).toBe('traveler@planit.app')
        expect(capturedMapProps?.flyToTarget).toEqual({
          lat: 41.4425,
          lng: -8.2918,
          zoom: 14,
        })
      })
    })

    it('drops a new pin at geographical coordinates upon map click and triggers pin click', async () => {
      render(<TripMapContainer />)

      await waitFor(() => {
        expect(screen.getByTestId('trigger-map-click')).toBeDefined()
      })

      fireEvent.click(screen.getByTestId('trigger-map-click'))

      await waitFor(() => {
        expect(capturedMapProps?.pins).toHaveLength(1)
        expect(capturedMapProps?.pins[0].name).toBe('Point (38.710, -9.130)')
        expect(capturedMapProps?.pins[0].lat).toBe(38.71)
        expect(capturedMapProps?.pins[0].lng).toBe(-9.13)
        expect(capturedMapProps?.pins[0].proposedBy).toBe('You')
      })

      // Exercise onPinClick callback
      expect(() => capturedMapProps?.onPinClick(capturedMapProps.pins[0])).not.toThrow()
    })
  })
})
