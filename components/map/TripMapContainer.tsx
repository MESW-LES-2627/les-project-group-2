'use client'

/**
 * @file components/map/TripMapContainer.tsx
 * @brief Simplified full-screen Carto Leaflet map with search bar, in-place pin voting, and sign out.
 */

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { LogOut, MapPin } from 'lucide-react'
import { Pin, PlaceSearchResult } from '@/types/map'
import { logout } from '@/app/entry/actions/auth'
import { SearchBar } from './SearchBar'
import { PinVoteCard } from './PinVoteCard'
import Link from 'next/link'

// Dynamic import of LeafletMap with SSR disabled to prevent `window is not defined`
const DynamicLeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
      <div className="h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-300">Loading Map...</p>
    </div>
  ),
})

interface TripMapContainerProps {
  currentUserEmail?: string
  cartoApiKey?: string
  initialPins?: Pin[]
}

/**
 * @brief Simplified full-screen interactive map with search bar and in-place pin voting.
 * @param props Component properties.
 */
export function TripMapContainer({
  currentUserEmail,
  cartoApiKey,
  initialPins = [],
}: TripMapContainerProps) {
  const [pins, setPins] = useState<Pin[]>(initialPins)
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null)
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null)

  /**
   * @brief Handles selecting a place from the search bar, flying to it and adding a marker.
   * @param place The chosen search result.
   */
  const handleSelectPlace = useCallback(
    (place: PlaceSearchResult) => {
      const newPin: Pin = {
        id: `pin-${Date.now()}`,
        tripId: 'default',
        name: place.name,
        category: 'sightseeing',
        lat: place.lat,
        lng: place.lon,
        proposedBy: currentUserEmail || 'You',
        createdAt: new Date().toISOString(),
        votes: [],
      }
      setPins((prev) => [...prev, newPin])
      setSelectedPin(newPin)
      setFlyToTarget({ lat: place.lat, lng: place.lon, zoom: 14 })
    },
    [currentUserEmail]
  )

  /**
   * @brief Handles map click: drops a pin at clicked coordinates and opens its voting card.
   * @param lat Latitude of clicked point.
   * @param lng Longitude of clicked point.
   */
  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      const newPin: Pin = {
        id: `pin-${Date.now()}`,
        tripId: 'default',
        name: `Point (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
        category: 'sightseeing',
        lat,
        lng,
        proposedBy: currentUserEmail || 'You',
        createdAt: new Date().toISOString(),
        votes: [],
      }
      setPins((prev) => [...prev, newPin])
      setSelectedPin(newPin)
    },
    [currentUserEmail]
  )

  /**
   * @brief Handles clicking an existing marker on the map to inspect or vote on it.
   */
  const handlePinClick = useCallback((pin: Pin) => {
    setSelectedPin(pin)
  }, [])

  /**
   * @brief Updates pin state when votes are cast or removed.
   */
  const handleVoteChange = useCallback((updatedPin: Pin) => {
    setPins((prev) => prev.map((p) => (p.id === updatedPin.id ? updatedPin : p)))
    setSelectedPin(updatedPin)
  }, [])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      {/* Top Floating Header with Search Bar and Sign Out */}
      <header className="absolute top-0 inset-x-0 z-[800] p-4 pointer-events-none flex items-center justify-between gap-3">
        {/* Left: App Logo Badge */}
        <div className="shrink-0 pointer-events-auto flex items-center gap-2">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/85 border border-white/10 text-white text-xs font-semibold shadow-lg backdrop-blur-md">
            <MapPin className="h-4 w-4 text-blue-400" />
            <span className="hidden sm:inline">PlanIt</span>
          </div>

          {/* Left: App new trip */}
          <Link
            href="/trips/new"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-900/85 border border-white/10 text-white text-xs font-semibold shadow-lg transition-colors"
          >
            <span className="text-base leading-none">+</span>
            <span>New Trip</span>
          </Link>
        </div>

        {/* Center: Simple Search Bar */}
        <div className="pointer-events-auto flex-1 max-w-md mx-auto">
          <SearchBar
            onSelectPlace={handleSelectPlace}
            placeholder="Search places across the map..."
          />
        </div>

        {/* Right: User Email & Sign Out */}
        <div className="shrink-0 pointer-events-auto flex items-center gap-2">
          {currentUserEmail && (
            <span className="hidden md:inline text-xs text-slate-300 px-3 py-2 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-md">
              {currentUserEmail}
            </span>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-900/85 hover:bg-slate-800 text-white text-xs font-semibold border border-white/10 shadow-lg backdrop-blur-md transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
      </header>

      {/* Full-screen Leaflet Map */}
      <DynamicLeafletMap
        pins={pins}
        layerId="voyager"
        apiKey={cartoApiKey || process.env.NEXT_PUBLIC_CARTO_API_KEY}
        flyToTarget={flyToTarget}
        onMapClick={handleMapClick}
        onPinClick={handlePinClick}
      />

      {/* In-Place Pin Details and Voting Card */}
      {selectedPin && (
        <PinVoteCard
          pin={selectedPin}
          currentUserEmail={currentUserEmail}
          onVoteChange={handleVoteChange}
          onClose={() => setSelectedPin(null)}
        />
      )}
    </div>
  )
}
