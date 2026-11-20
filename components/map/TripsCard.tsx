'use client'

/**
 * @file components/map/TripsCard.tsx
 * @brief Floating glassmorphic card on the right side over the map displaying user's member trips.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, ChevronUp, MapPin, X } from 'lucide-react'
import {
  getUserMemberTrips,
  type UserMemberTrip,
} from '@/app/trips/actions/get-member-trips'
import { formatEventDate } from '@/utils/date-formatter'

export interface TripsCardProps {
  isOpen: boolean
  onClose: () => void
  initialTrips?: UserMemberTrip[]
}

/**
 * @brief Interactive card displaying trips where the user is a member.
 * Rendered over the map on the right side, mirroring the login card glassmorphic styling.
 */
export function TripsCard({ isOpen, onClose, initialTrips }: TripsCardProps) {
  let router: ReturnType<typeof useRouter> | null = null
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    router = useRouter()
  } catch {
    router = null
  }

  const [trips, setTrips] = useState<UserMemberTrip[]>(initialTrips || [])
  const [loading, setLoading] = useState<boolean>(!initialTrips)
  const [error, setError] = useState<string | null>(null)
  const [expandedTripIds, setExpandedTripIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!isOpen || initialTrips) return

    let ignore = false

    getUserMemberTrips()
      .then((data) => {
        if (!ignore) {
          setTrips(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error('Failed to load trips:', err)
          setError('Could not load trips. Please try again.')
          setLoading(false)
        }
      })

    return () => {
      ignore = true
    }
  }, [isOpen, initialTrips])

  /**
   * @brief Retries loading member trips when the retry button is clicked.
   */
  const handleRetry = () => {
    setLoading(true)
    setError(null)
    getUserMemberTrips()
      .then((data) => {
        setTrips(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load trips:', err)
        setError('Could not load trips. Please try again.')
        setLoading(false)
      })
  }

  /**
   * @brief Navigates to the trip workspace page.
   */
  const navigateToTrip = (tripId: string) => {
    if (router) {
      router.push(`/trips/${tripId}`)
    }
  }

  /**
   * @brief Toggles expand/collapse state for a specific trip rectangle.
   */
  const toggleTripExpanded = (tripId: string) => {
    setExpandedTripIds((prev) => {
      const next = new Set(prev)
      if (next.has(tripId)) {
        next.delete(tripId)
      } else {
        next.add(tripId)
      }
      return next
    })
  }

  if (!isOpen) return null

  return (
    <section
      role="region"
      aria-label="Member trips panel"
      className="absolute top-20 right-4 sm:right-6 z-[850] w-[calc(100vw-2rem)] max-w-sm sm:max-w-md rounded-2xl bg-slate-800/80 p-6 sm:p-8 shadow-2xl backdrop-blur-md border border-white/10 text-white max-h-[calc(100vh-6rem)] flex flex-col pointer-events-auto"
    >
      {/* Header with Title, subtitle, and Close Button */}
      <div className="flex items-start justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold">My Trips</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">
            Trips where you are a member.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close trips panel"
          className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="my-4 h-px bg-white/10 shrink-0" />

      {/* Scrollable list of expandable trip rectangles */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[140px]">
        {loading ? (
          <div
            data-testid="trips-loading"
            className="flex flex-col items-center justify-center py-10 text-slate-300 space-y-2"
          >
            <div className="h-6 w-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Loading trips...</span>
          </div>
        ) : error ? (
          <div className="py-6 text-center text-red-400 text-xs space-y-2">
            <p>{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="text-xs text-sky-400 underline hover:text-sky-300 font-medium"
            >
              Try again
            </button>
          </div>
        ) : trips.length === 0 ? (
          <div
            data-testid="no-trips-message"
            className="py-8 text-center text-slate-400 text-xs space-y-1"
          >
            <p className="font-semibold text-slate-200">No trips found</p>
            <p>You are not associated with any trips as a member yet.</p>
          </div>
        ) : (
          trips.map((trip) => {
            const isExpanded = expandedTripIds.has(trip.id)
            return (
              <div
                key={trip.id}
                data-testid={`trip-rectangle-${trip.id}`}
                role="button"
                tabIndex={0}
                onClick={() => navigateToTrip(trip.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigateToTrip(trip.id)
                  }
                }}
                className="group cursor-pointer rounded-xl border border-white/15 bg-slate-900/60 hover:bg-slate-900/90 hover:border-white/30 transition-all p-4 text-left"
              >
                {/* Header row of the trip rectangle */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white text-base truncate group-hover:text-sky-300 transition-colors">
                      {trip.name}
                    </h3>

                    {trip.destination && (
                      <p className="text-xs text-slate-400 mt-0.5 truncate flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                        <span>{trip.destination}</span>
                      </p>
                    )}

                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-800 border border-white/10 text-slate-300 capitalize">
                        {trip.state || 'Planning'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {trip.trip_dates && trip.trip_dates.length > 0
                          ? formatEventDate(trip.trip_dates[0].date_itself)
                          : 'Dates not set'}
                      </span>
                    </div>
                  </div>

                  {/* Expand / Collapse Button (Clicking here does NOT navigate) */}
                  <button
                    type="button"
                    data-testid={`trip-expand-btn-${trip.id}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleTripExpanded(trip.id)
                    }}
                    aria-label={
                      isExpanded
                        ? `Collapse ${trip.name} details`
                        : `Expand ${trip.name} details`
                    }
                    className="shrink-0 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div
                    data-testid={`trip-details-${trip.id}`}
                    className="mt-3 pt-3 border-t border-white/10 space-y-2 text-xs text-slate-300"
                  >
                    <div>
                      <span className="text-slate-400 font-medium">
                        Trip Name:{' '}
                      </span>
                      <span className="text-white font-semibold">
                        {trip.name}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-medium">State: </span>
                      <span className="text-sky-300 font-medium capitalize">
                        {trip.state || 'Not specified'}
                      </span>
                    </div>

                    {trip.description && (
                      <p className="text-slate-300 italic pt-0.5">
                        {trip.description}
                      </p>
                    )}

                    <div className="pt-1.5">
                      <div className="font-semibold text-slate-400 uppercase tracking-wider mb-1.5 text-[11px]">
                        Events & Dates:
                      </div>

                      {trip.trip_dates && trip.trip_dates.length > 0 ? (
                        <ul className="space-y-2 border-l border-white/15 pl-3 mt-1">
                          {trip.trip_dates.map((item) => (
                            <li key={item.date_id} className="space-y-0.5">
                              <div className="font-medium text-sky-300">
                                {formatEventDate(item.date_itself)}
                              </div>
                              <div className="text-slate-200">
                                {item.event || 'No description'}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="italic text-slate-400">Dates not set</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Button to add trip at the end of the expandable rectangles */}
      <div className="mt-4 pt-3 border-t border-white/10 shrink-0">
        <Link
          href="/trips/new"
          role="button"
          aria-label="Create trip"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-500/80 hover:bg-slate-400/80 py-3 text-sm font-semibold text-white shadow-lg transition-colors"
        >
          <span className="text-base leading-none font-bold">+</span>
          <span>Create trip</span>
        </Link>
      </div>
    </section>
  )
}
