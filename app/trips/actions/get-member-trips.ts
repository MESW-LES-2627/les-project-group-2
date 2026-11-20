'use server'

/**
 * @file app/trips/actions/get-member-trips.ts
 * @brief Server action to fetch trips where the authenticated user is associated as a member.
 */

import { createClient } from '@/utils/supabase/server'
import { formatDateRange } from '@/utils/date-formatter'

export interface TripDateItem {
  date_id: string
  date_itself: string | null
  event: string | null
  formatted_date?: string
}

export interface UserMemberTrip {
  id: string
  name: string
  destination: string | null
  description: string | null
  state: string | null
  created_at: string | null
  organizer_id: string | null
  trip_dates: TripDateItem[]
}

type RawTripData = {
  id: string
  name: string
  destination?: string | null
  description?: string | null
  state?: string | null
  created_at?: string | null
  organizer_id?: string | null
  locked_start_date?: string | null
  locked_end_date?: string | null
  trip_date_windows?: Array<{ id?: string; start_date: string; end_date: string }> | null
  trip_itinerary_days?: Array<{ id?: string; day: string }> | null
  trip_dates?: TripDateItem[]
}

function sortTripDates(dates?: TripDateItem[]): TripDateItem[] {
  if (!dates || dates.length === 0) return []
  return [...dates].sort((a, b) => {
    const timeA = a.date_itself ? new Date(a.date_itself).getTime() : 0
    const timeB = b.date_itself ? new Date(b.date_itself).getTime() : 0
    return timeA - timeB
  })
}

function getItineraryRange(days: Array<{ day: string }>): {
  minDay: string | null
  maxDay: string | null
} {
  if (days.length === 0) return { minDay: null, maxDay: null }
  const sortedDays = days.map((d) => d.day).filter(Boolean).sort()
  if (sortedDays.length === 0) return { minDay: null, maxDay: null }
  return {
    minDay: sortedDays[0],
    maxDay: sortedDays[sortedDays.length - 1],
  }
}

function resolveLockedDates(rawTrip: RawTripData): TripDateItem[] {
  const itineraryDays = Array.isArray(rawTrip.trip_itinerary_days)
    ? rawTrip.trip_itinerary_days
    : []
  const { minDay: itinMin, maxDay: itinMax } = getItineraryRange(itineraryDays)

  const minDay = rawTrip.locked_start_date || itinMin
  const maxDay = rawTrip.locked_end_date || itinMax

  if (!minDay || !maxDay) {
    return []
  }

  return [
    {
      date_id: `locked-${rawTrip.id}`,
      date_itself: minDay,
      event: 'Official trip dates',
      formatted_date: formatDateRange(minDay, maxDay),
    },
  ]
}

function resolveWindowDates(rawTrip: RawTripData): TripDateItem[] {
  const windows = Array.isArray(rawTrip.trip_date_windows)
    ? rawTrip.trip_date_windows
    : []
  if (windows.length === 0) {
    return []
  }

  const sortedWindows = [...windows].sort((a, b) =>
    (a.start_date || '').localeCompare(b.start_date || '')
  )

  return sortedWindows.map((win, idx) => ({
    date_id: win.id || `window-${rawTrip.id}-${idx}`,
    date_itself: win.start_date,
    event: 'Proposed dates',
    formatted_date: formatDateRange(win.start_date, win.end_date),
  }))
}

function isTripLocked(rawTrip: RawTripData): boolean {
  if (rawTrip.state === 'Dates locked') return true
  if (Boolean(rawTrip.locked_start_date)) return true
  const itineraryDays = Array.isArray(rawTrip.trip_itinerary_days)
    ? rawTrip.trip_itinerary_days
    : []
  return itineraryDays.length > 0
}

function resolveTripDates(rawTrip: RawTripData): TripDateItem[] {
  if (isTripLocked(rawTrip)) {
    const lockedDates = resolveLockedDates(rawTrip)
    if (lockedDates.length > 0) return lockedDates
  }

  const windowDates = resolveWindowDates(rawTrip)
  if (windowDates.length > 0) { return windowDates }

  if (Array.isArray(rawTrip.trip_dates) && rawTrip.trip_dates.length > 0) {
    return sortTripDates(rawTrip.trip_dates)
  }

  return []
}

function extractRawTrip(tripsData: unknown): RawTripData | null {
  if (!tripsData) return null
  if (Array.isArray(tripsData)) {
    return (tripsData[0] as RawTripData) ?? null
  }
  return tripsData as RawTripData
}

function mapMemberRowsToTrips(memberRows: Array<{ trips: unknown }>): UserMemberTrip[] {
  const trips: UserMemberTrip[] = []
  const seenTripIds = new Set<string>()

  for (const row of memberRows) {
    const rawTrip = extractRawTrip(row.trips)
    if (!rawTrip || !rawTrip.id || seenTripIds.has(rawTrip.id)) {
      continue
    }

    seenTripIds.add(rawTrip.id)
    trips.push({
      id: rawTrip.id,
      name: rawTrip.name,
      destination: rawTrip.destination ?? null,
      description: rawTrip.description ?? null,
      state: rawTrip.state ?? null,
      created_at: rawTrip.created_at ?? null,
      organizer_id: rawTrip.organizer_id ?? null,
      trip_dates: resolveTripDates(rawTrip),
    })
  }

  return trips
}

/**
 * @brief Fetches all trips where the current user is associated as a member in `trip_members`.
 * Resolves user -> trip_members.user_id -> trips -> (trip_date_windows / trip_itinerary_days).
 */
export async function getUserMemberTrips(): Promise<UserMemberTrip[]> {
  try {
    const supabase = await createClient()

    if (!supabase || typeof supabase.from !== 'function') {
      return []
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return []
    }

    const { data: memberRows, error: memberError } = await supabase
      .from('trip_members')
      .select(`
        user_id,
        trip_id,
        trips (
          id,
          name,
          destination,
          description,
          state,
          created_at,
          organizer_id,
          locked_start_date,
          locked_end_date,
          trip_date_windows (
            id,
            start_date,
            end_date
          ),
          trip_itinerary_days (
            id,
            day
          )
        )
      `)
      .eq('user_id', user.id)

    if (memberError) {
      console.error('Error fetching member trips:', memberError)
      return []
    }

    if (!memberRows) { return [] }

    return mapMemberRowsToTrips(memberRows)
  } catch (error) {
    console.error('Unexpected error in getUserMemberTrips:', error)
    return []
  }
}
