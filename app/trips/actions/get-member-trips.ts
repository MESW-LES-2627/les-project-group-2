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

/**
 * @brief Fetches all trips where the current user is associated as a member in `trip_memebers`.
 * Resolves user -> profiles.shell_id -> trip_memebers.member_id -> trips -> trip_dates.
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

    // Step 1: Query user's profile to retrieve shell_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, shell_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('Error fetching profile for member trips:', profileError)
      return []
    }

    if (!profile || !profile.shell_id) {
      return []
    }

    // Step 2: Query trip_memebers for this member_id with joined trips and trip_dates
    const { data: memberRows, error: memberError } = await supabase
      .from('trip_members')
      .select(`
        member_id,
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
      .eq('member_id', profile.shell_id)

    if (memberError) {
      console.error('Error fetching member trips:', memberError)
      return []
    }
      
    if (!memberRows) {
      return []
    }

    const trips: UserMemberTrip[] = []
    const seenTripIds = new Set<string>()

    for (const row of memberRows) {
      // Handle either single object or array returned by PostgREST
      const rawTrip = (
        Array.isArray(row.trips) ? row.trips[0] : row.trips
      ) as {
        id: string
        name: string
        destination?: string | null
        description?: string | null
        state?: string | null
        created_at?: string | null
        organizer_id?: string | null
        trip_dates?: TripDateItem[]
      } | null

      if (!rawTrip || !rawTrip.id || seenTripIds.has(rawTrip.id)) {
        continue
      }
      seenTripIds.add(rawTrip.id)

      const rawDates = (rawTrip.trip_dates || []) as TripDateItem[]

      // Sort dates chronologically by date_itself ascending
      const sortedDates = [...rawDates].sort((a, b) => {
        const timeA = a.date_itself ? new Date(a.date_itself).getTime() : 0
        const timeB = b.date_itself ? new Date(b.date_itself).getTime() : 0
        return timeA - timeB
      })

      trips.push({
        id: rawTrip.id,
        name: rawTrip.name,
        destination: rawTrip.destination ?? null,
        description: rawTrip.description ?? null,
        state: rawTrip.state ?? null,
        created_at: rawTrip.created_at ?? null,
        organizer_id: rawTrip.organizer_id ?? null,
        trip_dates: sortedDates,
      })
    }

    return trips
  } catch (error) {
    console.error('Unexpected error in getUserMemberTrips:', error)
    return []
  }
}
