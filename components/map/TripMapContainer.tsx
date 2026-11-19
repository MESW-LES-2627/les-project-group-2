/* eslint-disable @next/next/no-img-element */
'use client'

/**
 * @file components/map/TripMapContainer.tsx
 * @brief Simplified full-screen Carto Leaflet map with search bar, user profile badge, in-place pin voting, confirmed spots, and sign out.
 */

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Compass, LogOut, MapPin, CheckCircle2 } from 'lucide-react'
import { logout } from '@/app/entry/actions/auth'
import { SearchBar } from './SearchBar'
import { TripsCard } from './TripsCard'
import { ConfirmedSpotsCard } from './ConfirmedSpotsCard'
import type { UserMemberTrip } from '@/app/trips/actions/get-member-trips'
import { Pin, PlaceSearchResult } from '@/types/map'
import { PinVoteCard } from './PinVoteCard'
import { ProfileCard } from '@/components/profile'
import { confirmPinAction, revertPinAction } from '@/app/trips/actions/pin-confirmation'
import { createPinAction } from '@/app/trips/actions/create-pin'
import { togglePinVoteAction } from '@/app/trips/actions/vote-pin'

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
  tripId?: string
  currentUserId?: string
  currentUserEmail?: string
  currentUsername?: string
  currentUserAvatar?: string | null
  cartoApiKey?: string
  initialTrips?: UserMemberTrip[]
  initialPins?: Pin[]
  isOrganizer?: boolean
}

/**
 * @brief Simplified full-screen interactive map with search bar, profile drawer, in-place pin voting, and confirmed spots list.
 * @param props Component properties.
 */
export function TripMapContainer({
  tripId = 'default',
  currentUserId,
  currentUserEmail,
  currentUsername,
  currentUserAvatar,
  cartoApiKey,
  initialTrips,
  initialPins = [],
  isOrganizer = false,
}: TripMapContainerProps) {
  const [pins, setPins] = useState<Pin[]>(initialPins)
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null)
  const [flyToTarget, setFlyToTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null)
  const [isTripsCardOpen, setIsTripsCardOpen] = useState(false)
  const [isConfirmedSpotsOpen, setIsConfirmedSpotsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [updatedUsername, setUpdatedUsername] = useState<string | null>(null)
  const [updatedAvatarUrl, setUpdatedAvatarUrl] = useState<string | null | undefined>(undefined)
  const [persistenceError, setPersistenceError] = useState<string | null>(null)

  // The demo map ('default') has no database row; only real trips are persisted.
  const shouldPersist = Boolean(tripId && tripId !== 'default')

  const username = updatedUsername ?? currentUsername
  const avatarUrl = updatedAvatarUrl !== undefined ? updatedAvatarUrl : currentUserAvatar
  const displayName = username || currentUserEmail
  const confirmedPins = pins.filter((p) => Boolean(p.isConfirmed))

  /**
   * @brief Handles selecting a place from the search bar, flying to it and adding a marker.
   * @param place The chosen search result.
   */
  const handleSelectPlace = useCallback(
    async (place: PlaceSearchResult) => {
      if (shouldPersist) {
        const result = await createPinAction(tripId!, {
          name: place.name,
          category: 'sightseeing',
          lat: place.lat,
          lng: place.lon,
        })

        if (result.error || !result.pin) {
          setPersistenceError(result.error ?? 'Failed to add pin.')
          return
        }

        const createdPin = result.pin
        setPins((prev) => [...prev, createdPin])
        setSelectedPin(createdPin)
        setFlyToTarget({ lat: place.lat, lng: place.lon, zoom: 14 })
        return
      }

      const newPin: Pin = {
        id: `pin-${Date.now()}`,
        tripId,
        name: place.name,
        category: 'sightseeing',
        lat: place.lat,
        lng: place.lon,
        proposedBy: currentUserEmail || 'You',
        createdAt: new Date().toISOString(),
        votes: [],
        isConfirmed: false,
      }
      setPins((prev) => [...prev, newPin])
      setSelectedPin(newPin)
      setFlyToTarget({ lat: place.lat, lng: place.lon, zoom: 14 })
    },
    [currentUserEmail, shouldPersist, tripId]
  )

  /**
   * @brief Handles map click: drops a pin at clicked coordinates and opens its voting card.
   * @param lat Latitude of clicked point.
   * @param lng Longitude of clicked point.
   */
  const handleMapClick = useCallback(
    async (lat: number, lng: number) => {
      const name = `Point (${lat.toFixed(3)}, ${lng.toFixed(3)})`

      if (shouldPersist) {
        const result = await createPinAction(tripId!, {
          name,
          category: 'sightseeing',
          lat,
          lng,
        })

        if (result.error || !result.pin) {
          setPersistenceError(result.error ?? 'Failed to add pin.')
          return
        }

        const createdPin = result.pin
        setPins((prev) => [...prev, createdPin])
        setSelectedPin(createdPin)
        return
      }

      const newPin: Pin = {
        id: `pin-${Date.now()}`,
        tripId,
        name,
        category: 'sightseeing',
        lat,
        lng,
        proposedBy: currentUserEmail || 'You',
        createdAt: new Date().toISOString(),
        votes: [],
        isConfirmed: false,
      }
      setPins((prev) => [...prev, newPin])
      setSelectedPin(newPin)
    },
    [currentUserEmail, shouldPersist, tripId]
  )

  /**
   * @brief Handles clicking an existing marker on the map to inspect or vote on it.
   */
  const handlePinClick = useCallback((pin: Pin) => {
    setSelectedPin(pin)
  }, [])

  /**
   * @brief Replaces a pin in local state after a failed persistence attempt.
   */
  const restorePin = useCallback((pin: Pin) => {
    setPins((prev) => prev.map((p) => (p.id === pin.id ? pin : p)))
    setSelectedPin((prev) => (prev?.id === pin.id ? pin : prev))
  }, [])

  /**
   * @brief Updates pin state when votes are cast or removed, persisting them when possible.
   */
  const handleVoteChange = useCallback(
    (updatedPin: Pin) => {
      const previousPin = pins.find((p) => p.id === updatedPin.id)
      setPins((prev) => prev.map((p) => (p.id === updatedPin.id ? updatedPin : p)))
      setSelectedPin(updatedPin)

      if (!shouldPersist || updatedPin.isConfirmed) return

      void togglePinVoteAction(
        updatedPin.tripId,
        updatedPin.id,
        updatedPin.date
      )
        .then((result) => {
          if (!result.error) return
          setPersistenceError(result.error)
          if (previousPin) restorePin(previousPin)
        })
        .catch((error) => {
          console.error('Failed to persist pin vote:', error)
          setPersistenceError('Failed to save your vote.')
          if (previousPin) restorePin(previousPin)
        })
    },
    [pins, restorePin, shouldPersist]
  )

  /**
   * @brief Handles confirming or unconfirming a pin and persists the change to the trip.
   */
  const handleConfirmToggle = useCallback(
    (updatedPin: Pin) => {
      const previousPin = pins.find((p) => p.id === updatedPin.id)
      setPins((prev) => prev.map((p) => (p.id === updatedPin.id ? updatedPin : p)))
      setSelectedPin(updatedPin)

      if (!shouldPersist) return

      const action = updatedPin.isConfirmed ? confirmPinAction : revertPinAction
      void action(updatedPin.tripId, updatedPin.id)
        .then((result) => {
          if (!result.error) return
          setPersistenceError(result.error)
          if (previousPin) restorePin(previousPin)
        })
        .catch((error) => {
          console.error('Failed to persist pin confirmation:', error)
          setPersistenceError('Failed to update the itinerary.')
          if (previousPin) restorePin(previousPin)
        })
    },
    [pins, restorePin, shouldPersist]
  )

  /**
   * @brief Selects a confirmed pin from the confirmed list, flying to it on the map.
   */
  const handleSelectConfirmedPin = useCallback((pin: Pin) => {
    setSelectedPin(pin)
    setFlyToTarget({ lat: pin.lat, lng: pin.lng, zoom: 15 })
  }, [])

  /**
   * @brief Reverts a confirmed spot back to proposed state.
   */
  const handleRevertPin = useCallback(
    (pinToRevert: Pin) => {
      handleConfirmToggle({ ...pinToRevert, isConfirmed: false })
    },
    [handleConfirmToggle]
  )

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      {/* Top Floating Header with Search Bar and Actions */}
      <header className="absolute top-0 inset-x-0 z-[800] p-4 pointer-events-none flex items-center justify-between gap-3">
        {/* Left: App Logo Badge & Quick Panels */}
        <div className="shrink-0 pointer-events-auto flex items-center gap-2">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-900/85 border border-white/10 text-white text-xs font-semibold shadow-lg backdrop-blur-md">
            <MapPin className="h-4 w-4 text-blue-400" />
            <span className="hidden sm:inline">PlanIt</span>
          </div>

          {/* Button to open member trips card */}
          <button
            type="button"
            data-testid="toggle-trips-card-button"
            onClick={() => setIsTripsCardOpen((prev) => !prev)}
            aria-expanded={isTripsCardOpen}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-white text-xs font-semibold shadow-lg backdrop-blur-md transition-colors ${
              isTripsCardOpen
                ? 'bg-slate-800 border-white/30 text-sky-300'
                : 'bg-slate-900/85 hover:bg-slate-800 border-white/10'
            }`}
            title="My Trips"
          >
            <Compass className="h-3.5 w-3.5 text-blue-400" />
            <span>Trips</span>
          </button>

          {/* Button to open confirmed spots list */}
          <button
            type="button"
            data-testid="toggle-confirmed-spots-button"
            onClick={() => setIsConfirmedSpotsOpen((prev) => !prev)}
            aria-expanded={isConfirmedSpotsOpen}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border text-xs font-semibold shadow-lg backdrop-blur-md transition-colors ${
              isConfirmedSpotsOpen
                ? 'bg-amber-500 border-amber-300 text-white'
                : 'bg-slate-900/85 hover:bg-slate-800 border-white/10 text-amber-300'
            }`}
            title="Confirmed Spots"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
            <span>Confirmed ({confirmedPins.length})</span>
          </button>
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

      {persistenceError && (
        <div
          role="alert"
          data-testid="pin-persistence-error"
          className="absolute top-20 left-1/2 z-[870] flex -translate-x-1/2 items-center gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-xs font-medium text-red-800 shadow-lg"
        >
          <span>{persistenceError}</span>
          <button
            type="button"
            data-testid="dismiss-persistence-error"
            onClick={() => setPersistenceError(null)}
            className="rounded-full px-1.5 py-0.5 text-red-500 hover:bg-red-100 hover:text-red-700"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Floating Member Trips Card */}
      <TripsCard
        isOpen={isTripsCardOpen}
        onClose={() => setIsTripsCardOpen(false)}
        initialTrips={initialTrips}
      />

      {/* Confirmed Spots Card Drawer */}
      <ConfirmedSpotsCard
        isOpen={isConfirmedSpotsOpen}
        onClose={() => setIsConfirmedSpotsOpen(false)}
        pins={pins}
        isOrganizer={isOrganizer}
        onSelectPin={handleSelectConfirmedPin}
        onRevertPin={handleRevertPin}
      />

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
        pins={pins}
        layerId="voyager"
        apiKey={cartoApiKey || process.env.NEXT_PUBLIC_CARTO_API_KEY}
        flyToTarget={flyToTarget}
        onMapClick={handleMapClick}
        onPinClick={handlePinClick}
      />

      {/* In-Place Pin Details, Voting, and Confirmation Card */}
      {selectedPin && (
        <PinVoteCard
          pin={selectedPin}
          currentUserEmail={currentUserEmail}
          currentUserId={currentUserId}
          isOrganizer={isOrganizer}
          onVoteChange={handleVoteChange}
          onConfirmToggle={handleConfirmToggle}
          onClose={() => setSelectedPin(null)}
        />
      )}
    </div>
  )
}
