/**
 * @file tests/map-types.test.ts
 * @brief Unit tests for map utility helpers and type configurations.
 */

import { describe, it, expect } from 'vitest'
import {
  getCategoryColor,
  getCategoryLabel,
  isValidCoordinate,
  CARTO_BASEMAPS,
  PORTUGAL_DEFAULT_CENTER,
  PORTUGAL_DEFAULT_ZOOM,
  getCartoTileUrl,
  PinCategory,
} from '@/types/map'

describe('Map Type and Category Helpers', () => {
  it('returns appropriate color for each pin category', () => {
    expect(getCategoryColor('sightseeing')).toBe('#3b82f6')
    expect(getCategoryColor('food')).toBe('#f97316')
    expect(getCategoryColor('lodging')).toBe('#8b5cf6')
    expect(getCategoryColor('activity')).toBe('#10b981')
    expect(getCategoryColor('other')).toBe('#64748b')
    expect(getCategoryColor('unknown' as PinCategory)).toBe('#64748b')
  })

  it('returns human-readable label for each category', () => {
    expect(getCategoryLabel('sightseeing')).toBe('Sightseeing')
    expect(getCategoryLabel('food')).toBe('Food & Drink')
    expect(getCategoryLabel('lodging')).toBe('Lodging')
    expect(getCategoryLabel('activity')).toBe('Activity')
    expect(getCategoryLabel('other')).toBe('Other')
    expect(getCategoryLabel('unknown' as PinCategory)).toBe('Other')
  })

  it('validates coordinates accurately', () => {
    expect(isValidCoordinate(39.5, -8.0)).toBe(true)
    expect(isValidCoordinate(0, 0)).toBe(true)
    expect(isValidCoordinate(90, 180)).toBe(true)
    expect(isValidCoordinate(-90, -180)).toBe(true)

    expect(isValidCoordinate(91, 0)).toBe(false)
    expect(isValidCoordinate(-91, 0)).toBe(false)
    expect(isValidCoordinate(0, 181)).toBe(false)
    expect(isValidCoordinate(0, -181)).toBe(false)
    expect(isValidCoordinate(NaN, 0)).toBe(false)
    expect(isValidCoordinate(0, NaN)).toBe(false)
  })

  it('has valid default coordinates and zoom level for Portugal', () => {
    expect(PORTUGAL_DEFAULT_CENTER).toEqual([39.5, -8.0])
    expect(PORTUGAL_DEFAULT_ZOOM).toBe(7)
  })

  it('includes required CartoDB basemap definitions', () => {
    expect(CARTO_BASEMAPS.voyager).toBeDefined()
    expect(CARTO_BASEMAPS.positron).toBeDefined()
    expect(CARTO_BASEMAPS.darkMatter).toBeDefined()

    expect(CARTO_BASEMAPS.voyager.url).toContain('cartocdn.com')
    expect(CARTO_BASEMAPS.positron.url).toContain('cartocdn.com')
    expect(CARTO_BASEMAPS.darkMatter.url).toContain('cartocdn.com')
  })

  it('constructs Carto tile URL with API key', () => {
    const base = 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'
    const key = 'test-api-key-123'
    expect(getCartoTileUrl(base, key)).toBe(
      'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=test-api-key-123'
    )

    const withQuery = 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?v=1'
    expect(getCartoTileUrl(withQuery, key)).toBe(
      'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?v=1&key=test-api-key-123'
    )

    expect(getCartoTileUrl(base, '')).toBe(base)
  })
})
