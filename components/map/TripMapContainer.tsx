'use client'

/**
 * @file components/map/TripMapContainer.tsx
 * @brief Top-level coordinator component for the full-screen Carto Leaflet interactive trip map.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  ArrowLeft,
  MapPin,
  Plus,
  Minus,
  LocateFixed,
  ListFilter,
  Sparkles,
  Layers,
} from 'lucide-react'
import {
  Pin,
  PlaceSearchResult,
  PORTUGAL_DEFAULT_CENTER,
  PORTUGAL_DEFAULT_ZOOM,
} from '@/types/map'
import {
  loadPinsForTrip,
  addPinToTrip,
  removePinFromTrip,
} from '@/services/pin-storage'
import { SearchBar } from './SearchBar'
import { LayerSwitcher } from './LayerSwitcher'
import { PinFormModal } from './PinFormModal'
import { PinDetailsModal } from './PinDetailsModal'
import { PinsListDrawer } from './PinsListDrawer'

// Dynamic import of LeafletMap with SSR disabled to prevent `window is not defined`
const DynamicLeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
      <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm font-medium text-slate-300">Loading Carto Leaflet Map...</p>
    </div>
  ),
})

interface TripMapContainerProps {
  tripId?: string
  tripName?: string
  currentUserEmail?: string
  cartoApiKey?: string
}

/**
 * @brief Full-screen interactive map orchestrator for trip pin discovery.
 * @param props Component properties.
 */
export function TripMapContainer({
  tripId = 'default',
  tripName = 'Portugal Exploration',
  currentUserEmail = 'explorer@planit.app',
  cartoApiKey,
}: TripMapContainerProps) {
  const [pins, setPins] = useState<Pin[]>([])
  const [activeLayerId, setActiveLayerId] = useState('voyager')
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null)

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [formCoords, setFormCoords] = useState<{ lat: number; lng: number }>({
    lat: PORTUGAL_DEFAULT_CENTER[0],
    lng: PORTUGAL_DEFAULT_CENTER[1],
  })
  const [formInitialName, setFormInitialName] = useState('')
  const [formInitialDescription, setFormInitialDescription] = useState('')

  const [selectedPin, setSelectedPin] = useState<Pin | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [showHint, setShowHint] = useState(true)

  // Load pins on mount
  useEffect(() => {
    const loaded = loadPinsForTrip(tripId)
    setPins(loaded)
  }, [tripId])

  /**
   * @brief Handles map click: opens form at clicked coordinates.
   */
  const handleMapClick = useCallback((lat: number, lng: number) => {
    setFormCoords({ lat, lng })
    setFormInitialName('')
    setFormInitialDescription('')
    setIsFormOpen(true)
  }, [])

  /**
   * @brief Handles pin selection from map or list drawer.
   */
  const handlePinClick = useCallback((pin: Pin) => {
    setSelectedPin(pin)
    setIsDetailsOpen(true)
    setFlyToTarget({ lat: pin.lat, lng: pin.lng, zoom: 15 })
  }, [])

  /**
   * @brief Handles selection of a search result.
   */
  const handleSelectPlace = useCallback((place: PlaceSearchResult) => {
    setFlyToTarget({ lat: place.lat, lng: place.lon, zoom: 15 })
    setFormCoords({ lat: place.lat, lng: place.lon })
    setFormInitialName(place.name)
    setFormInitialDescription(place.displayName)
    setIsFormOpen(true)
  }, [])

  /**
   * @brief Submits a new pin.
   */
  const handleAddPin = useCallback(
    (pinData: Omit<Pin, 'id' | 'createdAt'>) => {
      const created = addPinToTrip(tripId, {
        ...pinData,
        proposedBy: currentUserEmail,
      })
      setPins((prev) => [...prev, created])
      setFlyToTarget({ lat: created.lat, lng: created.lng, zoom: 14 })
    },
    [tripId, currentUserEmail]
  )

  /**
   * @brief Deletes a pin by its identifier.
   */
  const handleDeletePin = useCallback(
    (pinId: string) => {
      const updated = removePinFromTrip(tripId, pinId)
      setPins(updated)
      if (selectedPin?.id === pinId) {
        setIsDetailsOpen(false)
        setSelectedPin(null)
      }
    },
    [tripId, selectedPin]
  )

  /**
   * @brief Re-centers map view on Portugal.
   */
  const handleResetPortugalView = () => {
    setFlyToTarget({
      lat: PORTUGAL_DEFAULT_CENTER[0],
      lng: PORTUGAL_DEFAULT_CENTER[1],
      zoom: PORTUGAL_DEFAULT_ZOOM,
    })
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* Top Floating Navigation & Search Bar */}
      <header className="absolute top-0 inset-x-0 z-[800] p-3 sm:p-4 pointer-events-none flex items-center justify-between gap-3">
        {/* Left: Back button & Trip Title */}
        <div className="pointer-events-auto flex items-center gap-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-white border border-white/15 shadow-xl backdrop-blur-md transition-all text-xs font-semibold"
            title="Back to Dashboard"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden md:inline">Dashboard</span>
          </Link>

          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-2xl bg-slate-900/85 text-white border border-white/10 shadow-lg backdrop-blur-md text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold truncate max-w-[140px] md:max-w-[200px]">{tripName}</span>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="pointer-events-auto flex-1 max-w-sm sm:max-w-md mx-auto">
          <SearchBar onSelectPlace={handleSelectPlace} />
        </div>

        {/* Right: Places Drawer Toggle */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsDrawerOpen((prev) => !prev)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-white border border-white/15 shadow-xl backdrop-blur-md transition-all text-xs font-semibold group"
          >
            <ListFilter className="h-4 w-4 text-blue-400 group-hover:rotate-12 transition-transform" />
            <span className="hidden md:inline">Places</span>
            <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
              {pins.length}
            </span>
          </button>
        </div>
      </header>

      {/* Floating Instructions Banner (dismissible) */}
      {showHint && (
        <div className="absolute top-18 inset-x-0 z-[700] mx-auto w-fit max-w-[90vw] pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/90 border border-white/15 shadow-2xl backdrop-blur-md text-xs text-slate-200">
            <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span>Click anywhere on the map or search to drop and propose a pin.</span>
            <button
              type="button"
              onClick={() => setShowHint(false)}
              className="ml-2 text-slate-400 hover:text-white font-bold"
              title="Dismiss"
            >
              &times;
            </button>
          </div>
        </div>
      )}

      {/* Full Screen Leaflet Canvas */}
      <DynamicLeafletMap
        pins={pins}
        layerId={activeLayerId}
        apiKey={cartoApiKey || process.env.NEXT_PUBLIC_CARTO_API_KEY}
        flyToTarget={flyToTarget}
        onMapClick={handleMapClick}
        onPinClick={handlePinClick}
      />

      {/* Bottom Floating Map Controls */}
      <div className="absolute bottom-5 right-5 z-[800] flex flex-col items-end gap-2.5">
        <LayerSwitcher
          currentLayerId={activeLayerId}
          onSelectLayer={(id) => setActiveLayerId(id)}
        />

        <button
          type="button"
          onClick={handleResetPortugalView}
          className="p-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-white border border-white/15 shadow-xl backdrop-blur-md transition-all text-xs font-medium flex items-center gap-1.5"
          title="Reset View: Center on Portugal"
        >
          <LocateFixed className="h-4 w-4 text-blue-400" />
          <span className="hidden sm:inline">Portugal</span>
        </button>
      </div>

      {/* Modals & Slide-over Drawer */}
      <PinFormModal
        isOpen={isFormOpen}
        lat={formCoords.lat}
        lng={formCoords.lng}
        initialName={formInitialName}
        initialDescription={formInitialDescription}
        proposedBy={currentUserEmail}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleAddPin}
      />

      <PinDetailsModal
        pin={selectedPin}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onDelete={handleDeletePin}
      />

      <PinsListDrawer
        pins={pins}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectPin={handlePinClick}
      />
    </div>
  )
}
