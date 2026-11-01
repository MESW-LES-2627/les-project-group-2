import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { render, cleanup } from '@testing-library/react'
import LeafletMap from '@/components/map/LeafletMap'
import { Pin } from '@/types/map'
import L from 'leaflet'

vi.mock('leaflet/dist/leaflet.css', () => ({}))

const mockMapInstance = {
  remove: vi.fn(),
  removeLayer: vi.fn(),
  on: vi.fn(),
  flyTo: vi.fn(),
}

const mockMarkersGroup = {
  addTo: vi.fn().mockReturnThis(),
  clearLayers: vi.fn(),
}

const mockMarker = {
  bindTooltip: vi.fn().mockReturnThis(),
  bindPopup: vi.fn().mockReturnThis(),
  on: vi.fn(),
  addTo: vi.fn().mockReturnThis(),
}

const mockTileLayer = {
  addTo: vi.fn().mockReturnThis(),
}

const mockAttribution = {
  addTo: vi.fn().mockReturnThis(),
}

vi.mock('leaflet', () => {
  return {
    default: {
      map: vi.fn(() => mockMapInstance),
      control: {
        attribution: vi.fn(() => mockAttribution),
      },
      layerGroup: vi.fn(() => mockMarkersGroup),
      tileLayer: vi.fn(() => mockTileLayer),
      marker: vi.fn(() => mockMarker),
      divIcon: vi.fn((opts) => opts),
      DomEvent: {
        stopPropagation: vi.fn(),
      },
    },
  }
})

describe('LeafletMap Component', () => {
  const samplePins: Pin[] = [
    {
      id: 'p-1',
      tripId: 'default',
      name: 'Torre de Belém',
      category: 'sightseeing',
      lat: 38.6916,
      lng: -9.216,
      proposedBy: 'user@test.com',
      createdAt: '2026-11-01T00:00:00Z',
    },
    {
      id: 'p-2',
      tripId: 'default',
      name: 'Restaurante Ramiro',
      category: 'food',
      lat: 38.72,
      lng: -9.13,
      proposedBy: 'user2@test.com',
      createdAt: '2026-11-01T00:00:00Z',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('initializes map, attribution, and markers layer', () => {
    const onMapClick = vi.fn()
    const onPinClick = vi.fn()

    const { unmount } = render(
      <LeafletMap
        pins={samplePins}
        layerId="voyager"
        apiKey="test-key"
        flyToTarget={null}
        onMapClick={onMapClick}
        onPinClick={onPinClick}
      />
    )

    expect(L.map).toHaveBeenCalled()
    expect(L.control.attribution).toHaveBeenCalledWith({
      position: 'bottomright',
      prefix: false,
    })
    expect(L.layerGroup).toHaveBeenCalled()
    expect(L.tileLayer).toHaveBeenCalled()

    // Test map click handler
    const mapClickHandler = vi.mocked(mockMapInstance.on).mock.calls.find(
      (call) => call[0] === 'click'
    )?.[1]
    expect(mapClickHandler).toBeDefined()
    mapClickHandler({ latlng: { lat: 38.7, lng: -9.1 } })
    expect(onMapClick).toHaveBeenCalledWith(38.7, -9.1)

    // Unmount and check cleanup
    unmount()
    expect(mockMapInstance.remove).toHaveBeenCalled()
  })

  it('creates and attaches markers for all pins and handles pin clicks', () => {
    const onPinClick = vi.fn()

    render(
      <LeafletMap
        pins={samplePins}
        layerId="voyager"
        flyToTarget={null}
        onMapClick={vi.fn()}
        onPinClick={onPinClick}
      />
    )

    expect(mockMarkersGroup.clearLayers).toHaveBeenCalled()
    expect(L.marker).toHaveBeenCalledTimes(samplePins.length)
    expect(mockMarker.bindTooltip).toHaveBeenCalled()
    expect(mockMarker.bindPopup).toHaveBeenCalled()

    // Verify pin click handler
    const pinClickHandler = vi.mocked(mockMarker.on).mock.calls.find(
      (call) => call[0] === 'click'
    )?.[1]
    expect(pinClickHandler).toBeDefined()

    const mockEvent = { stopPropagation: vi.fn() }
    pinClickHandler(mockEvent)
    expect(L.DomEvent.stopPropagation).toHaveBeenCalledWith(mockEvent)
    expect(onPinClick).toHaveBeenCalled()
  })

  it('updates tile layer when layerId or apiKey changes, falling back to voyager on unknown layer', () => {
    const { rerender } = render(
      <LeafletMap
        pins={[]}
        layerId="positron"
        apiKey="key-1"
        flyToTarget={null}
        onMapClick={vi.fn()}
        onPinClick={vi.fn()}
      />
    )

    // First tileLayer call
    expect(L.tileLayer).toHaveBeenCalledTimes(1)

    // Rerender with unknown layerId to test fallback branch: CARTO_BASEMAPS[layerId] || CARTO_BASEMAPS.voyager
    rerender(
      <LeafletMap
        pins={[]}
        layerId="unknown-style"
        apiKey="key-2"
        flyToTarget={null}
        onMapClick={vi.fn()}
        onPinClick={vi.fn()}
      />
    )

    expect(mockMapInstance.removeLayer).toHaveBeenCalledWith(mockTileLayer)
    expect(L.tileLayer).toHaveBeenCalledTimes(2)
  })

  it('calls map.flyTo when flyToTarget is provided', () => {
    const { rerender } = render(
      <LeafletMap
        pins={[]}
        layerId="voyager"
        flyToTarget={null}
        onMapClick={vi.fn()}
        onPinClick={vi.fn()}
      />
    )

    expect(mockMapInstance.flyTo).not.toHaveBeenCalled()

    rerender(
      <LeafletMap
        pins={[]}
        layerId="voyager"
        flyToTarget={{ lat: 41.15, lng: -8.62, zoom: 16 }}
        onMapClick={vi.fn()}
        onPinClick={vi.fn()}
      />
    )

    expect(mockMapInstance.flyTo).toHaveBeenCalledWith(
      [41.15, -8.62],
      16,
      expect.objectContaining({
        duration: 1.8,
        easeLinearity: 0.25,
      })
    )
  })
})
