/**
 * @file types/map.ts
 * @brief Type definitions and utility helpers for the interactive map and pin dropping features.
 */

export type PinCategory = 'sightseeing' | 'food' | 'lodging' | 'activity' | 'other'

export interface Pin {
  id: string
  tripId: string
  name: string
  description?: string
  date?: string
  category: PinCategory
  lat: number
  lng: number
  proposedBy: string
  createdAt: string
}

export interface PlaceSearchResult {
  placeId: string
  name: string
  displayName: string
  lat: number
  lon: number
  type?: string
}

export interface CartoBasemapLayer {
  id: string
  name: string
  url: string
  attribution: string
  subdomains: string[]
}

/**
 * @brief Default center coordinates for Portugal.
 */
export const PORTUGAL_DEFAULT_CENTER: [number, number] = [39.5, -8.0]

/**
 * @brief Default zoom level for displaying Portugal overview.
 */
export const PORTUGAL_DEFAULT_ZOOM = 7

/**
 * @brief Available CartoDB basemap tile providers.
 */
export const CARTO_BASEMAPS: Record<string, CartoBasemapLayer> = {
  voyager: {
    id: 'voyager',
    name: 'Carto Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: ['a', 'b', 'c', 'd'],
  },
  positron: {
    id: 'positron',
    name: 'Carto Positron (Light)',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: ['a', 'b', 'c', 'd'],
  },
  darkMatter: {
    id: 'darkMatter',
    name: 'Carto Dark Matter',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: ['a', 'b', 'c', 'd'],
  },
}

/**
 * @brief Constructs a Carto tile layer URL, appending the API key query parameter if available.
 * @param baseUrl Base tile URL.
 * @param apiKey Optional Carto API key.
 * @return Full tile URL string.
 */
export function getCartoTileUrl(baseUrl: string, apiKey?: string): string {
  const key = apiKey || process.env.NEXT_PUBLIC_CARTO_API_KEY || process.env.CARTO_API_KEY || ''
  if (!key) return baseUrl
  const delimiter = baseUrl.includes('?') ? '&' : '?'
  return `${baseUrl}${delimiter}key=${encodeURIComponent(key)}`
}

/**
 * @brief Map category to a display color for map markers and badges.
 * @param category The pin category.
 * @return Hex color code or Tailwind color string.
 */
export function getCategoryColor(category: PinCategory): string {
  switch (category) {
    case 'sightseeing':
      return '#3b82f6' // Blue
    case 'food':
      return '#f97316' // Orange
    case 'lodging':
      return '#8b5cf6' // Purple
    case 'activity':
      return '#10b981' // Emerald
    case 'other':
    default:
      return '#64748b' // Slate
  }
}

/**
 * @brief Map category to human-friendly label.
 * @param category The pin category.
 * @return Human-readable category label.
 */
export function getCategoryLabel(category: PinCategory): string {
  switch (category) {
    case 'sightseeing':
      return 'Sightseeing'
    case 'food':
      return 'Food & Drink'
    case 'lodging':
      return 'Lodging'
    case 'activity':
      return 'Activity'
    case 'other':
    default:
      return 'Other'
  }
}

/**
 * @brief Validates if coordinates are within standard geographical bounds.
 * @param lat Latitude (-90 to 90).
 * @param lng Longitude (-180 to 180).
 * @return True if valid, false otherwise.
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}
