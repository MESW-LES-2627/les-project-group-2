/**
 * @file tests/places-api.test.ts
 * @brief Unit tests for the Nominatim geocoding API route handler.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/places/search/route'

describe('GET /api/places/search', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns empty array when query parameter is missing', async () => {
    const req = new Request('http://localhost:3000/api/places/search')
    const res = await GET(req)
    const json = await res.json()
    expect(json).toEqual([])
  })

  it('returns empty array when query parameter is shorter than 2 chars', async () => {
    const req = new Request('http://localhost:3000/api/places/search?q=a')
    const res = await GET(req)
    const json = await res.json()
    expect(json).toEqual([])
  })

  it('transforms Nominatim response into PlaceSearchResult format', async () => {
    const mockNominatimData = [
      {
        place_id: 111,
        name: 'Coimbra',
        display_name: 'Coimbra, Região de Coimbra, Portugal',
        lat: '40.2056',
        lon: '-8.4195',
        type: 'city',
      },
    ]

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockNominatimData,
    } as Response)

    const req = new Request('http://localhost:3000/api/places/search?q=Coimbra')
    const res = await GET(req)
    const json = await res.json()

    expect(json).toHaveLength(1)
    expect(json[0]).toEqual({
      placeId: '111',
      name: 'Coimbra',
      displayName: 'Coimbra, Região de Coimbra, Portugal',
      lat: 40.2056,
      lon: -8.4195,
      type: 'city',
    })
  })

  it('handles external API failures gracefully', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 503,
    } as Response)

    const req = new Request('http://localhost:3000/api/places/search?q=Braga')
    const res = await GET(req)
    const json = await res.json()
    expect(json).toEqual([])
  })
})
