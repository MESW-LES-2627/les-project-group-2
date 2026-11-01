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
      {
        osm_id: 222,
        display_name: 'Sintra, Lisboa, Portugal',
        lat: '38.8029',
        lon: '-9.3817',
        class: 'tourism',
      },
      {
        lat: '37.0194',
        lon: '-7.9322',
      },
    ]

    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockNominatimData,
    } as Response)

    const req = new Request('http://localhost:3000/api/places/search?q=Portugal')
    const res = await GET(req)
    const json = await res.json()

    expect(json).toHaveLength(3)
    expect(json[0].name).toBe('Coimbra')
    expect(json[1].name).toBe('Sintra')
    expect(json[1].type).toBe('tourism')
    expect(json[2].name).toBe('Portugal')
    expect(json[2].type).toBe('location')
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

  it('returns empty array when external API returns non-array payload', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: 'Unable to geocode' }),
    } as Response)

    const req = new Request('http://localhost:3000/api/places/search?q=Aveiro')
    const res = await GET(req)
    const json = await res.json()
    expect(json).toEqual([])
  })

  it('handles thrown exceptions during fetch gracefully', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Connection timeout'))

    const req = new Request('http://localhost:3000/api/places/search?q=Faro')
    const res = await GET(req)
    const json = await res.json()
    expect(json).toEqual([])
  })
})
