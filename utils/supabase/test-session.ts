import type { SupabaseClient } from '@supabase/supabase-js'
import { splitEqually } from '@/utils/expenses'

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
  pins?: Array<{
    id: string
    trip_id: string
    name: string
    description?: string | null
    date?: string | null
    category?: string | null
    lat: number
    lng: number
    proposed_by: string
    created_at?: string | null
    is_confirmed?: boolean | null
  }>
  expenses?: Array<{
    id: string
    trip_id: string
    description: string
    amount_cents: number
    paid_by: string
    created_at?: string | null
    trip_expense_participants: Array<{ user_id: string; share_cents: number }>
  }>
  pinVotes?: Array<{
    id: string
    pin_id: string
    user_id: string
    user_email: string
    trip_date?: string | null
    created_at?: string | null
  }>
}

type SessionPin = NonNullable<PlanitTestSession['pins']>[number]
type SessionPinVote = NonNullable<PlanitTestSession['pinVotes']>[number]

type CookieSetter = {
  set: (name: string, value: string, options?: { path?: string }) => void
}

type SessionTrip = NonNullable<PlanitTestSession['trips']>[number]

function findTripByFilter(
  trips: PlanitTestSession['trips'],
  tripId?: string,
  inviteCode?: string
) {
  if (!trips) return null
  return (
    trips.find((t) => (tripId && t.id === tripId) || (inviteCode && t.invite_code === inviteCode)) ?? null
  )
}

function handleProfilesSingle(
  session: PlanitTestSession,
  user: { id: string; email?: string } | null | undefined
) {
  const defaultUsername = user?.email ? user.email.split('@')[0] : 'Traveler'
  return {
    data: session.profile ?? {
      username: defaultUsername,
      avatar_url: null,
    },
    error: null,
  }
}

function handleTripsSingle(
  session: PlanitTestSession,
  filters: Record<string, unknown>
) {
  const tripId = filters['id'] as string | undefined
  const inviteCode = filters['invite_code'] as string | undefined
  const found = findTripByFilter(session.trips, tripId, inviteCode)
  return { data: found ?? session.trips?.[0] ?? null, error: null }
}

function handleTripMembersSingle(
  session: PlanitTestSession,
  filters: Record<string, unknown>
) {
  const userId = filters['user_id'] as string | undefined
  const found = session.members?.find((m) => !userId || m.user_id === userId)
  return { data: found ?? { role: 'organizer' }, error: null }
}

function handleTripDateWindowsQuery(
  session: PlanitTestSession,
  filters: Record<string, unknown>,
  action: unknown,
  syncCookie: () => void
) {
  const windowId = filters['id'] as string | undefined
  if (action === 'delete') {
    if (windowId && session.windows) {
      session.windows = session.windows.filter((w) => w.id !== windowId)
    }
    syncCookie()
    return { data: { id: windowId ?? 'w-removed' }, error: null }
  }
  const found = session.windows?.find((w) => !windowId || w.id === windowId)
  return { data: found ?? null, error: null }
}

function handleTripsMaybeSingle(
  session: PlanitTestSession,
  filters: Record<string, unknown>
) {
  const tripId = filters['id'] as string | undefined
  const inviteCode = filters['invite_code'] as string | undefined
  const found = findTripByFilter(session.trips, tripId, inviteCode)
  return { data: found ?? null, error: null }
}

function handleTripMembersMaybeSingle(
  session: PlanitTestSession,
  filters: Record<string, unknown>,
  action: unknown,
  syncCookie: () => void
) {
  const userId = filters['user_id'] as string | undefined
  if (action === 'delete') {
    if (userId && session.members) {
      session.members = session.members.filter((m) => m.user_id !== userId)
    }
    syncCookie()
    return { data: { user_id: userId ?? 'm-removed' }, error: null }
  }
  const found = session.members?.find((m) => !userId || m.user_id === userId)
  return { data: found ?? null, error: null }
}

type InsertHandler = (
  data: Record<string, unknown>,
  session: PlanitTestSession
) => unknown

function insertTrip(data: Record<string, unknown>, session: PlanitTestSession) {
  const trip = {
    id: `trip-${(session.trips?.length ?? 0) + 1}`,
    invite_code: `CODE${(session.trips?.length ?? 0) + 1}`,
    state: 'Planning',
    created_at: new Date().toISOString(),
    ...data,
  } as SessionTrip
  session.trips = [...(session.trips ?? []), trip]
  if (trip.organizer_id) {
    session.members = [
      {
        user_id: trip.organizer_id,
        email: session.user?.email,
        display_name: session.profile?.username ?? 'Organizer',
        role: 'organizer',
      },
    ]
  }
  return trip
}

function insertWindow(data: Record<string, unknown>, session: PlanitTestSession) {
  session.windows = session.windows ?? []
  session.windows.push({ id: `w-${Date.now()}`, ...data } as (typeof session.windows)[0])
  return session.windows[session.windows.length - 1]
}

function insertMember(data: Record<string, unknown>, session: PlanitTestSession) {
  session.members = session.members ?? []
  session.members.push({ display_name: 'Member', ...data } as (typeof session.members)[0])
  return session.members[session.members.length - 1]
}

function insertPin(data: Record<string, unknown>, session: PlanitTestSession) {
  const pin = {
    id: `pin-${(session.pins?.length ?? 0) + 1}-${Date.now()}`,
    created_at: new Date().toISOString(),
    is_confirmed: false,
    ...data,
  } as SessionPin
  session.pins = [...(session.pins ?? []), pin]
  return pin
}

function insertPinVote(data: Record<string, unknown>, session: PlanitTestSession) {
  const vote = {
    id: `vote-${(session.pinVotes?.length ?? 0) + 1}-${Date.now()}`,
    created_at: new Date().toISOString(),
    ...data,
  } as SessionPinVote
  session.pinVotes = [...(session.pinVotes ?? []), vote]
  return vote
}

const insertHandlers: Record<string, InsertHandler> = {
  trips: insertTrip,
  trip_date_windows: insertWindow,
  trip_members: insertMember,
  pins: insertPin,
  pin_votes: insertPinVote,
}

function handleInsert(table: string, data: unknown, session: PlanitTestSession): unknown {
  if (typeof data !== 'object' || data === null) return null
  const handler = insertHandlers[table]
  return handler ? handler(data as Record<string, unknown>, session) : null
}

function matchesFilters(row: Record<string, unknown>, filters: Record<string, unknown>) {
  return Object.entries(filters).every(
    ([key, value]) => value === undefined || row[key] === value
  )
}

function findPins(session: PlanitTestSession, filters: Record<string, unknown>) {
  return (session.pins ?? []).filter((pin) =>
    matchesFilters(pin as unknown as Record<string, unknown>, filters)
  )
}

function findPinVotes(session: PlanitTestSession, filters: Record<string, unknown>) {
  return (session.pinVotes ?? []).filter((vote) =>
    matchesFilters(vote as unknown as Record<string, unknown>, filters)
  )
}

function withPinVotes(session: PlanitTestSession, pin: SessionPin) {
  return { ...pin, pin_votes: findPinVotes(session, { pin_id: pin.id }) }
}

function applyPinUpdate(
  table: string,
  filters: Record<string, unknown>,
  data: unknown,
  session: PlanitTestSession
) {
  if (typeof data !== 'object' || data === null) return
  if (table === 'pins') {
    findPins(session, filters).forEach((pin) => Object.assign(pin, data))
  } else if (table === 'pin_votes') {
    findPinVotes(session, filters).forEach((vote) => Object.assign(vote, data))
  }
}

function applyPendingUpdate(
  table: string,
  query: Record<string, unknown>,
  session: PlanitTestSession,
  syncCookie: () => void
) {
  if (!query._updateData) return
  applyPinUpdate(
    table,
    query._filters as Record<string, unknown>,
    query._updateData,
    session
  )
  query._updateData = undefined
  syncCookie()
}

type DeleteHandler = (
  filters: Record<string, unknown>,
  session: PlanitTestSession
) => void

function deleteMember(filters: Record<string, unknown>, session: PlanitTestSession) {
  const memberId = filters['user_id'] as string | undefined
  if (memberId && session.members) {
    session.members = session.members.filter((m) => m.user_id !== memberId)
  }
}

function deleteWindow(filters: Record<string, unknown>, session: PlanitTestSession) {
  const windowId = filters['id'] as string | undefined
  if (windowId && session.windows) {
    session.windows = session.windows.filter((w) => w.id !== windowId)
  }
}

function deletePin(filters: Record<string, unknown>, session: PlanitTestSession) {
  const removed = findPins(session, filters)
  const removedIds = new Set(removed.map((pin) => pin.id))
  session.pins = (session.pins ?? []).filter((pin) => !removedIds.has(pin.id))
  session.pinVotes = (session.pinVotes ?? []).filter(
    (vote) => !removedIds.has(vote.pin_id)
  )
}

function deleteVote(filters: Record<string, unknown>, session: PlanitTestSession) {
  const voteId = filters['id'] as string | undefined
  const pinId = filters['pin_id'] as string | undefined
  session.pinVotes = (session.pinVotes ?? []).filter(
    (vote) =>
      !((voteId && vote.id === voteId) || (pinId && vote.pin_id === pinId))
  )
}

const deleteHandlers: Record<string, DeleteHandler> = {
  trip_members: deleteMember,
  trip_date_windows: deleteWindow,
  pins: deletePin,
  pin_votes: deleteVote,
}

function handleDeleteAction(
  table: string,
  filters: Record<string, unknown>,
  session: PlanitTestSession
) {
  const handler = deleteHandlers[table]
  if (handler) handler(filters, session)
}

function mapTripDates(session: PlanitTestSession, t: SessionTrip) {
  return {
    trip_date_windows: session.windows ?? t.trip_date_windows ?? [],
    trip_itinerary_days: session.itineraryDays ?? t.trip_itinerary_days ?? [],
    trip_dates: t.trip_dates ?? [],
  }
}

function mapTripMemberRow(session: PlanitTestSession, t: SessionTrip, userId?: string) {
  const dates = mapTripDates(session, t)
  return {
    user_id: userId,
    trip_id: t.id,
    trips: {
      id: t.id,
      name: t.name,
      destination: t.destination ?? 'Portugal',
      description: t.description ?? null,
      state: t.state ?? 'Planning',
      created_at: t.created_at ?? '2026-11-01',
      organizer_id: t.organizer_id ?? userId,
      locked_start_date: t.locked_start_date ?? null,
      locked_end_date: t.locked_end_date ?? null,
      ...dates,
    },
  }
}

function getTableData(table: string, session: PlanitTestSession, userId?: string): unknown {
  const map: Record<string, unknown> = {
    trips: session.trips,
    trip_members: session.trips ? session.trips.map((t) => mapTripMemberRow(session, t, userId)) : [],
    trip_date_windows: session.windows,
    trip_itinerary_days: session.itineraryDays,
    trip_availability: session.availabilities,
    pins: (session.pins ?? []).map((pin) => withPinVotes(session, pin)),
    pin_votes: session.pinVotes,
    trip_expenses: session.expenses,
  }
  return map[table] ?? []
}

function handleRpcLockTripDates(
  session: PlanitTestSession,
  args: Record<string, unknown> | undefined,
  syncCookie: () => void
) {
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

function handleRpcUnlockTripDates(session: PlanitTestSession, syncCookie: () => void) {
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

function expenseError(message: string) {
  return { data: null, error: { code: 'P0001', message } }
}

function canManageSessionExpense(
  session: PlanitTestSession,
  expense: { paid_by: string; trip_id: string },
  userId: string | undefined
) {
  const trip = session.trips?.find((t) => t.id === expense.trip_id)
  return expense.paid_by === userId || trip?.organizer_id === userId
}

function buildExpenseValues(args: Record<string, unknown> | undefined) {
  const participants = splitEqually(
    args?.p_amount_cents as number,
    (args?.p_participants as string[] | undefined) ?? []
  ).map((share) => ({ user_id: share.userId, share_cents: share.shareCents }))

  return {
    description: args?.p_description as string,
    amount_cents: args?.p_amount_cents as number,
    paid_by: args?.p_paid_by as string,
    trip_expense_participants: participants,
  }
}

function handleRpcSaveExpense(
  session: PlanitTestSession,
  args: Record<string, unknown> | undefined,
  userId: string | undefined,
  syncCookie: () => void
) {
  const values = buildExpenseValues(args)
  const expenses = (session.expenses = session.expenses ?? [])
  const expenseId = args?.p_expense_id as string | null

  if (!expenseId) {
    expenses.push({
      id: `expense-${expenses.length + 1}-${Date.now()}`,
      trip_id: args?.p_trip_id as string,
      created_at: new Date().toISOString(),
      ...values,
    })
  } else {
    const existing = expenses.find((e) => e.id === expenseId)
    if (!existing) return expenseError('The expense does not exist.')
    if (!canManageSessionExpense(session, existing, userId)) {
      return expenseError('Only the payer or the organizer can edit this expense.')
    }
    Object.assign(existing, values)
  }

  syncCookie()
  return { data: null, error: null }
}

function handleRpcDeleteExpense(
  session: PlanitTestSession,
  args: Record<string, unknown> | undefined,
  userId: string | undefined,
  syncCookie: () => void
) {
  const existing = (session.expenses ?? []).find((e) => e.id === args?.p_expense_id)
  if (!existing) return expenseError('The expense does not exist.')

  if (!canManageSessionExpense(session, existing, userId)) {
    return expenseError('Only the payer or the organizer can delete this expense.')
  }

  session.expenses = (session.expenses ?? []).filter((e) => e.id !== existing.id)
  syncCookie()
  return { data: null, error: null }
}

function handleRpcPromoteToOrganizer(
  session: PlanitTestSession,
  args: Record<string, unknown> | undefined,
  syncCookie: () => void
) {
  const tripId = args?.p_trip_id as string | undefined
  const newOrgId = args?.p_new_organizer_id as string | undefined
  const trip = session.trips?.find((t) => t.id === tripId)
  if (trip && newOrgId) {
    const oldOrgId = trip.organizer_id
    trip.organizer_id = newOrgId
    if (session.members) {
      session.members.forEach((m) => {
        if (m.user_id === newOrgId) {
          m.role = 'organizer'
        } else if (m.user_id === oldOrgId) {
          m.role = 'member'
        }
      })
    }
    syncCookie()
  }
  return { data: null, error: null }
}

function applyImmediateUpdate(
  table: string,
  data: unknown,
  query: Record<string, unknown>,
  session: PlanitTestSession
) {
  if (typeof data !== 'object' || data === null) return

  if (table === 'profiles') {
    session.profile = { ...(session.profile ?? {}), ...(data as Record<string, string>) }
    return
  }

  if (table !== 'trips') return
  const filters = query._filters as Record<string, unknown>
  const tripId = filters['id'] as string | undefined
  const trip = session.trips?.find((t) => !tripId || t.id === tripId)
  if (trip) Object.assign(trip, data)
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
        select: () => query,
        eq: (col: string, val: unknown) => {
          ;(query._filters as Record<string, unknown>)[col] = val
          return query
        },
        order: () => query,
        limit: () => query,
        in: () => query,
        neq: () => query,
        range: () => query,
        single: async () => {
          const filters = query._filters as Record<string, unknown>
          applyPendingUpdate(table, query, session, syncCookie)
          const handlers: Record<string, () => { data: unknown; error: null }> = {
            profiles: () => handleProfilesSingle(session, user),
            trips: () => {
              const inserted = query._inserted as SessionTrip | undefined
              return { data: inserted ?? handleTripsSingle(session, filters).data, error: null }
            },
            trip_members: () => handleTripMembersSingle(session, filters),
            trip_date_windows: () => handleTripDateWindowsQuery(session, filters, query._action, syncCookie),
            pins: () => {
              const inserted = query._inserted as SessionPin | undefined
              const found = inserted ?? findPins(session, filters)[0] ?? null
              return { data: found ? withPinVotes(session, found) : null, error: null }
            },
          }
          const handler = handlers[table]
          return handler ? handler() : { data: null, error: null }
        },
        maybeSingle: async () => {
          const filters = query._filters as Record<string, unknown>
          applyPendingUpdate(table, query, session, syncCookie)
          const handlers: Record<string, () => { data: unknown; error: null }> = {
            trips: () => handleTripsMaybeSingle(session, filters),
            trip_members: () => handleTripMembersMaybeSingle(session, filters, query._action, syncCookie),
            trip_date_windows: () => handleTripDateWindowsQuery(session, filters, query._action, syncCookie),
            pins: () => {
              const found = findPins(session, filters)[0] ?? null
              return { data: found ? withPinVotes(session, found) : null, error: null }
            },
            pin_votes: () => ({
              data: findPinVotes(session, filters)[0] ?? null,
              error: null,
            }),
          }
          const handler = handlers[table]
          return handler ? handler() : { data: null, error: null }
        },
        insert: (data: unknown) => {
          query._inserted = handleInsert(table, data, session)
          syncCookie()
          return query
        },
        update: (data: unknown) => {
          if (table === 'pins' || table === 'pin_votes') {
            query._updateData = data
            return query
          }
          applyImmediateUpdate(table, data, query, session)
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
            handleDeleteAction(table, filters, session)
            syncCookie()
          }
          applyPendingUpdate(table, query, session, syncCookie)
          let data = getTableData(table, session, user?.id)
          if (table === 'pins') {
            data = findPins(session, filters).map((pin) => withPinVotes(session, pin))
          } else if (table === 'pin_votes') {
            data = findPinVotes(session, filters)
          }
          const result = { data, error: null }
          return Promise.resolve(onfulfilled ? onfulfilled(result) : result)
        },
      }
      return query
    },
    storage: {
      from() {
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
        return handleRpcLockTripDates(session, args, syncCookie)
      }
      if (fn === 'unlock_trip_dates') {
        return handleRpcUnlockTripDates(session, syncCookie)
      }
      if (fn === 'save_trip_expense') {
        return handleRpcSaveExpense(session, args, user?.id, syncCookie)
      }
      if (fn === 'delete_trip_expense') {
        return handleRpcDeleteExpense(session, args, user?.id, syncCookie)
      }
      if (fn === 'promote_to_organizer') {
        return handleRpcPromoteToOrganizer(session, args, syncCookie)
      }
      return { data: null, error: null }
    },
  }

  return client as unknown as SupabaseClient
}
