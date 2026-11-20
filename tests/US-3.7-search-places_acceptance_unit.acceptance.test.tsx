/**
 * @file acceptanceTests/US-3.7-search-places.acceptance.test.tsx
 * @brief Acceptance tests for US-3.7: Search Place by Name.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { SearchBar } from '@/components/map/SearchBar'
import * as placesService from '@/services/places'
import { PlaceSearchResult } from '@/types/map'

vi.mock('@/services/places', () => ({
  searchPlaces: vi.fn(),
}))

describe('US-3.7 Acceptance Tests: Search Place by Name', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  const mockPlaces: PlaceSearchResult[] = [
    {
      placeId: '1',
      name: 'Lisboa',
      displayName: 'Lisboa, Portugal',
      lat: 38.7223,
      lon: -9.1393,
      type: 'city',
    },
    {
      placeId: '2',
      name: 'Porto',
      displayName: 'Porto, Portugal',
      lat: 41.1579,
      lon: -8.6291,
      type: 'city',
    },
  ]

  describe('Scenario: User enters text into search bar to discover places in Portugal', () => {
    it('shows placeholder guidance and debounces input queries', async () => {
      vi.mocked(placesService.searchPlaces).mockResolvedValue(mockPlaces)
      const onSelectPlace = vi.fn()

      render(<SearchBar onSelectPlace={onSelectPlace} />)
      const input = screen.getByRole('textbox')

      fireEvent.change(input, { target: { value: 'Porto' } })
      expect(placesService.searchPlaces).not.toHaveBeenCalled()

      // Advance debounce delay
      await act(async () => {
        vi.advanceTimersByTime(350)
      })

      expect(placesService.searchPlaces).toHaveBeenCalledWith('Porto', expect.any(AbortSignal))
      expect(screen.getByText('Porto')).toBeDefined()
      expect(screen.getByText('Lisboa, Portugal')).toBeDefined()

      // Selecting place returns chosen place to container
      fireEvent.click(screen.getByText('Lisboa'))
      expect(onSelectPlace).toHaveBeenCalledWith(mockPlaces[0])
      expect((input as HTMLInputElement).value).toBe('Lisboa')
    })

    it('allows user to clear active search query and reset results', async () => {
      vi.mocked(placesService.searchPlaces).mockResolvedValue(mockPlaces)
      render(<SearchBar onSelectPlace={vi.fn()} />)
      const input = screen.getByRole('textbox')

      fireEvent.change(input, { target: { value: 'Lisboa' } })
      await act(async () => {
        vi.advanceTimersByTime(350)
      })

      const clearBtn = screen.getByTitle('Clear search')
      fireEvent.click(clearBtn)

      expect((input as HTMLInputElement).value).toBe('')
      expect(screen.queryByText('Lisboa, Portugal')).toBeNull()
    })

    it('clears results and closes dropdown when input length is reduced under 2 chars', async () => {
      vi.mocked(placesService.searchPlaces).mockResolvedValue(mockPlaces)
      render(<SearchBar onSelectPlace={vi.fn()} />)
      const input = screen.getByRole('textbox')

      fireEvent.change(input, { target: { value: 'Lisboa' } })
      await act(async () => {
        vi.advanceTimersByTime(350)
      })
      expect(screen.getByText('Porto')).toBeDefined()

      fireEvent.change(input, { target: { value: 'L' } })
      expect(screen.queryByText('Porto')).toBeNull()
    })

    it('handles geocoding service errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(placesService.searchPlaces).mockRejectedValueOnce(new Error('Network error'))

      render(<SearchBar onSelectPlace={vi.fn()} />)
      const input = screen.getByRole('textbox')

      fireEvent.change(input, { target: { value: 'Erro' } })
      await act(async () => {
        vi.advanceTimersByTime(350)
      })

      expect(consoleSpy).toHaveBeenCalled()
      expect(screen.queryByRole('list')).toBeNull()
    })

    it('dismisses dropdown when user clicks outside search widget', async () => {
      vi.mocked(placesService.searchPlaces).mockResolvedValue(mockPlaces)
      render(
        <div>
          <div data-testid="outside">Outside Map Area</div>
          <SearchBar onSelectPlace={vi.fn()} />
        </div>
      )
      const input = screen.getByRole('textbox')

      fireEvent.change(input, { target: { value: 'Lisboa' } })
      await act(async () => {
        vi.advanceTimersByTime(350)
      })
      expect(screen.getByText('Porto')).toBeDefined()

      fireEvent.mouseDown(screen.getByTestId('outside'))
      expect(screen.queryByText('Porto')).toBeNull()

      fireEvent.focus(input)
      expect(screen.getByText('Porto')).toBeDefined()
    })
  })
})
