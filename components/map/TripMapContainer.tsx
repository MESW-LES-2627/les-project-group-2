/* eslint-disable @next/next/no-img-element */
'use client'

/**
 * @file components/map/TripMapContainer.tsx
 * @brief Simplified full-screen Carto Leaflet map with search bar, user profile badge, toggleable profile modal, and sign out.
 */

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { LogOut, MapPin } from 'lucide-react'
import { PlaceSearchResult } from '@/types/map'
import { logout } from '@/app/entry/actions/auth'
import { SearchBar } from './SearchBar'
import { ProfileCard } from '@/components/profile'
import Link from "next/link";

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

interface SimplePin {
  id: string
  name: string
  lat: number
  lng: number
}

interface TripMapContainerProps {
  currentUserEmail?: string
  currentUsername?: string
  currentUserAvatar?: string | null
  cartoApiKey?: string
}

/**
 * @brief Simplified full-screen interactive map with search bar and toggleable profile component.
 * @param props Component properties.
*/
export function TripMapContainer({ 
  currentUserEmail,
  currentUsername,
  currentUserAvatar,
  cartoApiKey,
}: TripMapContainerProps) {
  const [pins, setPins] = useState<SimplePin[]>([])
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [updatedUsername, setUpdatedUsername] = useState<string | null>(null)
  const [updatedAvatarUrl, setUpdatedAvatarUrl] = useState<string | null | undefined>(undefined)

  const username = updatedUsername ?? currentUsername
  const avatarUrl = updatedAvatarUrl !== undefined ? updatedAvatarUrl : currentUserAvatar
  const displayName = username || currentUserEmail

  /**
   * @brief Handles selecting a place from the search bar, flying to it and adding a marker.
   * @param place The chosen search result.
   */
  const handleSelectPlace = useCallback((place: PlaceSearchResult) => {
    const newPin: SimplePin = {
      id: `pin-${Date.now()}`,
      name: place.name,
      lat: place.lat,
      lng: place.lon,
    }
    setPins((prev) => [...prev, newPin])
    setFlyToTarget({ lat: place.lat, lng: place.lon, zoom: 14 })
  }, [])

  /**
   * @brief Handles map click: drops a pin at clicked coordinates.
   * @param lat Latitude of clicked point.
   */
  const handleMapClick = useCallback((lat: number, lng: number) => {
    const newPin: SimplePin = {
      id: `pin-${Date.now()}`,
      name: `Point (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
      lat,
      lng,
    }
    setPins((prev) => [...prev, newPin])
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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-900/85 border border-white/10  text-white text-xs font-semibold shadow-lg transition-colors"
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

        {/* Right: User Profile Button & Sign Out */}
        <div className="shrink-0 pointer-events-auto flex items-center gap-2">
          {displayName && (
            <button
              type="button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              aria-expanded={isProfileOpen}
              className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/85 hover:bg-slate-800 text-white text-xs font-semibold border border-white/10 shadow-lg backdrop-blur-md transition-colors"
              title={displayName}
            >
              <span className="relative flex h-6 w-6 shrink-0 overflow-hidden rounded-full border border-white/20 bg-slate-800">
                <img
                  src={avatarUrl || '/no_pic.png'}
                  alt={displayName}
                  onError={(e) => {
                    e.currentTarget.src = '/no_pic.png'
                  }}
                  className="h-full w-full object-cover"
                />
              </span>
              <span className="hidden md:inline font-medium text-slate-200">
                {displayName}
              </span>
            </button>
          )}
          <form action={async () => { await logout() }}>
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

      {/* Center Profile Modal Component */}
      {isProfileOpen && (
        <div className="absolute inset-0 z-[850] flex items-center justify-center p-4 pointer-events-none">
          <div className="pointer-events-auto">
            <ProfileCard
              key={isProfileOpen ? 'open' : 'closed'}
              isOpen={isProfileOpen}
              onClose={() => setIsProfileOpen(false)}
              currentUserEmail={currentUserEmail}
              currentUsername={username}
              currentUserAvatar={avatarUrl}
              onProfileUpdate={({ username: newUsername, avatarUrl: newAvatarUrl }) => {
                setUpdatedUsername(newUsername)
                if (newAvatarUrl !== undefined) {
                  setUpdatedAvatarUrl(newAvatarUrl)
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Full-screen Leaflet Map */}
      <DynamicLeafletMap
        pins={pins.map((p) => ({
          ...p,
          tripId: 'default',
          category: 'sightseeing',
          proposedBy: displayName || 'You',
          createdAt: new Date().toISOString(),
        }))}
        layerId="voyager"
        apiKey={cartoApiKey || process.env.NEXT_PUBLIC_CARTO_API_KEY}
        flyToTarget={flyToTarget}
        onMapClick={handleMapClick}
        onPinClick={() => {}}
      />
    </div>
  )
}
