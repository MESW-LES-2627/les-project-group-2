/**
 * @file app/api/places/search/route.ts
 * @brief API route for geocoding and searching places on the map via OpenStreetMap Nominatim.
 */

import { NextResponse } from 'next/server'
import { PlaceSearchResult } from '@/types/map'

interface NominatimItem {
  place_id?: string | number
  osm_id?: string | number
  name?: string
  display_name?: string
  lat: string
  lon: string
  type?: string
  class?: string
}

/**
 * @brief Handles GET requests to search places by textual query.
 * @param request The incoming HTTP request containing the `q` query parameter.
 * @return JSON response with an array of PlaceSearchResult items.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()

  if (!query || query.length < 2) {
    return NextResponse.json<PlaceSearchResult[]>([])
  }

  try {
    const nominatimUrl = new URL('https://nominatim.openstreetmap.org/search')
    nominatimUrl.searchParams.set('q', query)
    nominatimUrl.searchParams.set('format', 'json')
    nominatimUrl.searchParams.set('addressdetails', '1')
    nominatimUrl.searchParams.set('limit', '8')

    const response = await fetch(nominatimUrl.toString(), {
      headers: {
        'User-Agent': 'PlanIt-Trip-App/1.0 (les-project-group-2)',
        'Accept-Language': 'en,pt;q=0.8',
      },
      next: { revalidate: 3600 }, // Cache search queries for 1 hour
    })

    if (!response.ok) {
      console.error(`Nominatim search failed with status: ${response.status}`)
      return NextResponse.json<PlaceSearchResult[]>([])
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
      return NextResponse.json<PlaceSearchResult[]>([])
    }

    const results: PlaceSearchResult[] = (data as NominatimItem[]).map((item) => ({
      placeId: String(item.place_id || item.osm_id || Math.random()),
      name: item.name || item.display_name?.split(',')[0] || query,
      displayName: item.display_name || '',
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type || item.class || 'location',
    }))

    return NextResponse.json<PlaceSearchResult[]>(results)
  } catch (error) {
    console.error('Error during places search:', error)
    return NextResponse.json<PlaceSearchResult[]>([])
  }
}
