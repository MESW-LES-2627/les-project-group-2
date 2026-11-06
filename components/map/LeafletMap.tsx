'use client'

/**
 * @file components/map/LeafletMap.tsx
 * @brief Dynamic Leaflet map implementation with Carto basemaps, pin dropping, and custom markers.
 */

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Pin,
  CARTO_BASEMAPS,
  PORTUGAL_DEFAULT_CENTER,
  PORTUGAL_DEFAULT_ZOOM,
  getCategoryColor,
  getCartoTileUrl,
  getPinVoteCount,
} from '@/types/map'

interface FlyToTarget {
  lat: number
  lng: number
  zoom?: number
}

interface LeafletMapProps {
  pins: Pin[]
  layerId: string
  apiKey?: string
  flyToTarget: FlyToTarget | null
  onMapClick: (lat: number, lng: number) => void
  onPinClick: (pin: Pin) => void
}

/**
 * @brief Generates an HTML divIcon marker for a given pin category.
 * @param category The pin category.
 * @return Leaflet DivIcon instance.
 */
function createPinIcon(category: Pin['category']): L.DivIcon {
  const color = getCategoryColor(category)
  return L.divIcon({
    className: 'custom-pin-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
        cursor: pointer;
        transition: transform 0.15s ease-in-out;
      ">
        <div style="
          transform: rotate(45deg);
          width: 8px;
          height: 8px;
          background-color: white;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })
}

/**
 * @brief Client-side Leaflet map component with Carto tiles and pin interactivity.
 * @param props Component properties.
 */
export default function LeafletMap({
  pins,
  layerId,
  apiKey,
  flyToTarget,
  onMapClick,
  onPinClick,
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const tileLayerRef = useRef<L.TileLayer | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    const map = L.map(mapContainerRef.current, {
      center: PORTUGAL_DEFAULT_CENTER,
      zoom: PORTUGAL_DEFAULT_ZOOM,
      zoomControl: false, // We will render sleek custom zoom controls
      attributionControl: false,
    })

    // Attribution control bottom-right
    L.control
      .attribution({
        position: 'bottomright',
        prefix: false,
      })
      .addTo(map)

    // Markers layer group
    const markersGroup = L.layerGroup().addTo(map)
    markersLayerRef.current = markersGroup

    // Map click event: open pin creation form
    map.on('click', (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    })

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [onMapClick])

  // Update Carto basemap tile layer
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current)
    }

    const basemapConfig = CARTO_BASEMAPS[layerId] || CARTO_BASEMAPS.voyager
    const tileUrl = getCartoTileUrl(basemapConfig.url, apiKey)

    const newTileLayer = L.tileLayer(tileUrl, {
      attribution: basemapConfig.attribution,
      subdomains: basemapConfig.subdomains,
      maxZoom: 20,
    }).addTo(map)

    tileLayerRef.current = newTileLayer
  }, [layerId, apiKey])

  // Update pin markers
  useEffect(() => {
    const markersGroup = markersLayerRef.current
    if (!markersGroup) return

    markersGroup.clearLayers()

    pins.forEach((pin) => {
      const marker = L.marker([pin.lat, pin.lng], {
        icon: createPinIcon(pin.category),
        title: pin.name,
      })

      marker.bindTooltip(pin.name, {
        permanent: false,
        direction: 'top',
        offset: [0, -28],
        className: 'leaflet-tooltip-custom',
      })

      const voteCount = getPinVoteCount(pin)
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px; font-weight: 600; color: #0f172a; padding: 2px 4px;">
          ${pin.name}
          ${voteCount > 0 ? `<div style="font-size: 11px; color: #475569; font-weight: 500; margin-top: 2px;">👍 ${voteCount} ${voteCount === 1 ? 'vote' : 'votes'}</div>` : ''}
        </div>
      `)

      marker.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e)
        onPinClick(pin)
      })

      marker.addTo(markersGroup)
    })
  }, [pins, onPinClick])

  // Smooth flyTo animations when search result is selected
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !flyToTarget) return

    map.flyTo([flyToTarget.lat, flyToTarget.lng], flyToTarget.zoom ?? 15, {
      duration: 1.8,
      easeLinearity: 0.25,
    })
  }, [flyToTarget])

  return <div ref={mapContainerRef} className="w-full h-full min-h-screen bg-slate-900" />
}
