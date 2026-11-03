/**
 * @file tests/places-service.test.ts
 * @brief Unit tests for the place search service and error resilience.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchPlaces } from '@/services/places'

describe('Places Service (Client)', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns empty array if query has fewer than 2 characters', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
    const res = await searchPlaces('a')
    expect(res).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('calls search endpoint and returns parsed results', async () => {
    const mockResults = [
      {
        placeId: '123',
        name: 'Porto',
        displayName: 'Porto, Portugal',
        lat: 41.1579,
        lon: -8.6291,
        type: 'city',
      },
    ]

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResults,
    } as Response)

    const res = await searchPlaces('Porto')
    expect(res).toEqual(mockResults)
  })

  it('returns empty array if response json is not an array', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ not: 'array' }),
    } as Response)

    const res = await searchPlaces('Coimbra')
    expect(res).toEqual([])
  })

  it('handles fetch HTTP error gracefully', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    const res = await searchPlaces('Lisboa')
    expect(res).toEqual([])
  })

  it('handles network throw gracefully', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    const res = await searchPlaces('Faro')
    expect(res).toEqual([])
  })

  it('handles AbortError quietly and returns empty array', async () => {
    const abortErr = new Error('The user aborted a request.')
    abortErr.name = 'AbortError'
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(abortErr)

    const res = await searchPlaces('Braga')
    expect(res).toEqual([])
  })
})
