import type { SupabaseClient } from '@supabase/supabase-js'

export interface PlanitTestSession {
  user?: { id: string; email?: string } | null
  profile?: { username?: string | null; avatar_url?: string | null }
  trips?: Array<{
    id: string
    name: string
    destination?: string | null
    description?: string | null
    state?: string | null
    created_at?: string | null
    organizer_id?: string | null
    invite_code?: string
    locked_start_date?: string | null
    locked_end_date?: string | null
    trip_date_windows?: Array<{ id?: string; start_date: string; end_date: string }>
    trip_itinerary_days?: Array<{ id?: string; day: string }>
    trip_dates?: Array<{
      date_id: string
      date_itself: string | null
      event: string | null
      formatted_date?: string
    }>
  }>
  members?: Array<{
    user_id: string
    email?: string | null
    display_name: string
    role: 'organizer' | 'member'
  }>
  windows?: Array<{
    id: string
    trip_id: string
    start_date: string
    end_date: string
  }>
  itineraryDays?: Array<{ id?: string; day: string; trip_id?: string }>
  availabilities?: Array<{
    trip_id?: string
    user_id?: string
    day?: string
    status?: string
    choice?: string
  }>
}

type CookieSetter = {
  set: (name: string, value: string, options?: { path?: string }) => void
}

export function buildTestSupabaseClient(session: PlanitTestSession, cookieStore?: CookieSetter): SupabaseClient {
  const user = session.user === undefined ? { id: 'u-1', email: 'traveler@planit.app' } : session.user

  const syncCookie = () => {
    if (cookieStore?.set) {
      try {
        cookieStore.set(
          'planit-test-session',
          encodeURIComponent(JSON.stringify(session)),
          { path: '/' }
        )
      } catch {
        // Not in action context
      }
    }
  }

  const client = {
    auth: {
      async getUser() {
        return { data: { user }, error: null }
      },
      async signInWithPassword({ email, password }: { email: string; password?: string }) {
        if (password === 'WrongPassword!' || email === 'wrong@planit.app') {
          return { data: { user: null, session: null }, error: { message: 'Invalid login credentials' } }
        }
        const loggedUser = { id: 'user-logged-in', email }
        if (cookieStore?.set) {
          cookieStore.set(
            'planit-test-session',
            encodeURIComponent(JSON.stringify({ ...session, user: loggedUser })),
            { path: '/' }
          )
        }
        return { data: { user: loggedUser, session: { user: loggedUser } }, error: null }
      },
      async signUp({ email }: { email: string; password?: string }) {
        if (email === 'existing@planit.app') {
          return { data: { user: null, session: null }, error: null }
        }
        const newUser = { id: 'user-created', email }
        if (cookieStore?.set) {
          cookieStore.set(
            'planit-test-session',
            encodeURIComponent(JSON.stringify({ ...session, user: newUser })),
            { path: '/' }
          )
        }
        return { data: { user: newUser, session: { user: newUser } }, error: null }
      },
      async signOut() {
        if (cookieStore?.set) {
          cookieStore.set(
            'planit-test-session',
            encodeURIComponent(JSON.stringify({ ...session, user: null })),
            { path: '/' }
          )
        }
        return { error: null }
      },
    },
    from(table: string) {
      const query: Record<string, unknown> = {
        _filters: {} as Record<string, unknown>,
        select: (_fields?: string) => query,
        eq: (col: string, val: unknown) => {
          ;(query._filters as Record<string, unknown>)[col] = val
          return query
        },
        neq: (_col: string, _val: unknown) => query,
        in: (_col: string, _vals: unknown[]) => query,
        is: (_col: string, _val: unknown) => query,
        order: (_col?: string) => query,
        range: (_from?: number, _to?: number) => query,
        limit: (_limit?: number) => query,
        single: async () => {
          const filters = query._filters as Record<string, unknown>
          if (table === 'profiles') {
            return {
              data: session.profile ?? {
                username: user?.email ? user.email.split('@')[0] : 'Traveler',
                avatar_url: null,
              },
              error: null,
            }
          }
          if (table === 'trips') {
            const tripId = filters['id'] as string | undefined
            const inviteCode = filters['invite_code'] as string | undefined
            const found = session.trips?.find(
              (t) => (tripId && t.id === tripId) || (inviteCode && t.invite_code === inviteCode)
            )
            return { data: found ?? session.trips?.[0] ?? null, error: null }
          }
          if (table === 'trip_members') {
            const userId = filters['user_id'] as string | undefined
            const found = session.members?.find((m) => !userId || m.user_id === userId)
            return { data: found ?? { role: 'organizer' }, error: null }
          }
          if (table === 'trip_date_windows') {
            const windowId = filters['id'] as string | undefined
            if (query._action === 'delete') {
              if (windowId && session.windows) {
                session.windows = session.windows.filter((w) => w.id !== windowId)
              }
              syncCookie()
              return { data: { id: windowId ?? 'w-removed' }, error: null }
            }
            const found = session.windows?.find((w) => !windowId || w.id === windowId)
            return { data: found ?? null, error: null }
          }
          return { data: null, error: null }
        },
        maybeSingle: async () => {
          const filters = query._filters as Record<string, unknown>
          if (table === 'trips') {
            const tripId = filters['id'] as string | undefined
            const inviteCode = filters['invite_code'] as string | undefined
            const found = session.trips?.find(
              (t) => (tripId && t.id === tripId) || (inviteCode && t.invite_code === inviteCode)
            )
            return { data: found ?? null, error: null }
          }
          if (table === 'trip_members') {
            const userId = filters['user_id'] as string | undefined
            if (query._action === 'delete') {
              if (userId && session.members) {
                session.members = session.members.filter((m) => m.user_id !== userId)
              }
              syncCookie()
              return { data: { user_id: userId ?? 'm-removed' }, error: null }
            }
            const found = session.members?.find((m) => !userId || m.user_id === userId)
            return { data: found ?? null, error: null }
          }
          if (table === 'trip_date_windows') {
            const windowId = filters['id'] as string | undefined
            if (query._action === 'delete') {
              if (windowId && session.windows) {
                session.windows = session.windows.filter((w) => w.id !== windowId)
              }
              syncCookie()
              return { data: { id: windowId ?? 'w-removed' }, error: null }
            }
            const found = session.windows?.find((w) => !windowId || w.id === windowId)
            return { data: found ?? null, error: null }
          }
          return { data: null, error: null }
        },
        insert: (data: unknown) => {
          if (table === 'trips' && Array.isArray(session.trips) && typeof data === 'object' && data !== null) {
            session.trips.push(data as (typeof session.trips)[0])
          }
          if (table === 'trip_date_windows' && typeof data === 'object' && data !== null) {
            session.windows = session.windows ?? []
            session.windows.push({ id: `w-${Date.now()}`, ...(data as Record<string, string>) } as (typeof session.windows)[0])
          }
          if (table === 'trip_members' && typeof data === 'object' && data !== null) {
            session.members = session.members ?? []
            session.members.push({ display_name: 'Member', ...(data as Record<string, string>) } as (typeof session.members)[0])
          }
          syncCookie()
          return query
        },
        update: (data: unknown) => {
          if (table === 'profiles' && typeof data === 'object' && data !== null) {
            session.profile = { ...(session.profile ?? {}), ...(data as Record<string, string>) }
          }
          if (table === 'trips' && typeof data === 'object' && data !== null) {
            const filters = query._filters as Record<string, unknown>
            const tripId = filters['id'] as string | undefined
            const trip = session.trips?.find((t) => !tripId || t.id === tripId)
            if (trip) {
              Object.assign(trip, data)
            }
          }
          syncCookie()
          return query
        },
        delete: () => {
          query._action = 'delete'
          return query
        },
        upsert: (data: unknown) => {
          if (table === 'trip_availability' && Array.isArray(data)) {
            session.availabilities = session.availabilities ?? []
            session.availabilities.push(...(data as (typeof session.availabilities)))
          }
          syncCookie()
          return query
        },
        then: (onfulfilled?: (res: { data: unknown; error: unknown }) => unknown) => {
          const filters = query._filters as Record<string, unknown>
          if (query._action === 'delete') {
            if (table === 'trip_members') {
              const memberId = filters['user_id'] as string | undefined
              if (memberId && session.members) {
                session.members = session.members.filter((m) => m.user_id !== memberId)
              }
            }
            if (table === 'trip_date_windows') {
              const windowId = filters['id'] as string | undefined
              if (windowId && session.windows) {
                session.windows = session.windows.filter((w) => w.id !== windowId)
              }
            }
            syncCookie()
          }
          let data: unknown = []
          if (table === 'trips') {
            data = session.trips ?? []
          } else if (table === 'trip_members') {
            data = (session.trips ?? []).map((t) => ({
              user_id: user?.id,
              trip_id: t.id,
              trips: {
                id: t.id,
                name: t.name,
                destination: t.destination ?? 'Portugal',
                description: t.description ?? null,
                state: t.state ?? 'Planning',
                created_at: t.created_at ?? '2026-11-01',
                organizer_id: t.organizer_id ?? user?.id,
                locked_start_date: t.locked_start_date ?? null,
                locked_end_date: t.locked_end_date ?? null,
                trip_date_windows: session.windows ?? t.trip_date_windows ?? [],
                trip_itinerary_days: session.itineraryDays ?? t.trip_itinerary_days ?? [],
                trip_dates: t.trip_dates ?? [],
              },
            }))
          } else if (table === 'trip_date_windows') {
            data = session.windows ?? []
          } else if (table === 'trip_itinerary_days') {
            data = session.itineraryDays ?? []
          } else if (table === 'trip_availability') {
            data = session.availabilities ?? []
          }
          const result = { data, error: null }
          return Promise.resolve(onfulfilled ? onfulfilled(result) : result)
        },
      }
      return query
    },
    storage: {
      from(_bucket: string) {
        return {
          upload: async () => ({ data: { path: 'avatar.png' }, error: null }),
          getPublicUrl: () => ({ data: { publicUrl: '/avatar.png' } }),
          remove: async () => ({ error: null }),
        }
      },
    },
    rpc: async (fn: string, args?: Record<string, unknown>) => {
      if (fn === 'get_trip_members') {
        return { data: session.members ?? [], error: null }
      }
      if (fn === 'lock_trip_dates') {
        const trip = session.trips?.[0]
        if (trip) {
          trip.state = 'Dates locked'
          trip.locked_start_date = (args?.p_start as string) || '2026-12-01'
          trip.locked_end_date = (args?.p_end as string) || '2026-12-05'
          session.itineraryDays = [
            { id: 'itin-1', day: '2026-12-01', trip_id: trip.id },
            { id: 'itin-2', day: '2026-12-02', trip_id: trip.id },
            { id: 'itin-3', day: '2026-12-03', trip_id: trip.id },
            { id: 'itin-4', day: '2026-12-04', trip_id: trip.id },
            { id: 'itin-5', day: '2026-12-05', trip_id: trip.id },
          ]
          syncCookie()
        }
        return { data: null, error: null }
      }
      if (fn === 'unlock_trip_dates') {
        const trip = session.trips?.[0]
        if (trip) {
          trip.state = 'Planning'
          trip.locked_start_date = null
          trip.locked_end_date = null
          session.itineraryDays = []
          syncCookie()
        }
        return { data: null, error: null }
      }
      return { data: null, error: null }
    },
  }

  return client as unknown as SupabaseClient
}
