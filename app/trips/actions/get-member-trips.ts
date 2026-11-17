'use server'

/**
 * @file app/trips/actions/get-member-trips.ts
 * @brief Server action to fetch trips where the authenticated user is associated as a member.
 */

import { createClient } from '@/utils/supabase/server'

export interface TripDateItem {
  date_id: string
  date_itself: string | null
  event: string | null
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
      trip_dates: sortTripDates(rawTrip.trip_dates),
    })
  }

  return trips
}

/**
 * @brief Fetches all trips where the current user is associated as a member in `trip_memebers`.
 * Resolves user -> trip_memebers.user_id -> trips -> trip_dates.
 * Dates are sorted chronologically.
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
          trip_dates (
            date_id,
            date_itself,
            event
          )
        )
      `)
      .eq('user_id', user.id)

    if (memberError) {
      console.error('Error fetching member trips:', memberError)
      return []
    }

    if (!memberRows) {
      return []
    }

    return mapMemberRowsToTrips(memberRows)
  } catch (error) {
    console.error('Unexpected error in getUserMemberTrips:', error)
    return []
  }
}
