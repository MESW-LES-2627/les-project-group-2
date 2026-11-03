/**
 * @file services/places.ts
 * @brief Client service for place search and geocoding operations.
 */

import { PlaceSearchResult } from '@/types/map'

/**
 * @brief Performs place search using the local API proxy.
 * @param query The search text entered by the user.
 * @param signal Optional AbortSignal to cancel in-flight requests on rapid typing.
 * @return Promise resolving to a list of matching places.
 */
export async function searchPlaces(
  query: string,
  signal?: AbortSignal
): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  try {
    const url = `/api/places/search?q=${encodeURIComponent(trimmed)}`
    const res = await fetch(url, { signal })
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return []
    }
    console.error('searchPlaces failed:', err)
    return []
  }
}
