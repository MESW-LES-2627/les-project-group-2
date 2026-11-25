import { describe, it, expect, vi } from 'vitest'
import { buildTestSupabaseClient, type PlanitTestSession } from '@/utils/supabase/test-session'

describe('buildTestSupabaseClient', () => {
  it('handles auth operations (getUser, signIn, signUp, signOut)', async () => {
    const mockCookieStore = { set: vi.fn() }
    const client = buildTestSupabaseClient({}, mockCookieStore)

    const userRes = await client.auth.getUser()
    expect(userRes.data.user?.id).toBe('u-1')

    const wrongLogin = await client.auth.signInWithPassword({ email: 'wrong@planit.app', password: 'x' })
    expect(wrongLogin.error?.message).toBe('Invalid login credentials')

    const correctLogin = await client.auth.signInWithPassword({ email: 'valid@planit.app', password: 'pass' })
    expect(correctLogin.data.user?.email).toBe('valid@planit.app')
    expect(mockCookieStore.set).toHaveBeenCalled()

    const existingSignup = await client.auth.signUp({ email: 'existing@planit.app', password: 'pass' })
    expect(existingSignup.data.user).toBeNull()

    const newSignup = await client.auth.signUp({ email: 'new@planit.app', password: 'pass' })
    expect(newSignup.data.user?.email).toBe('new@planit.app')

    const signOutRes = await client.auth.signOut()
    expect(signOutRes.error).toBeNull()
  })

  it('handles database table queries and mutations', async () => {
    const session: PlanitTestSession = {
      trips: [{ id: 'trip-1', name: 'Algarve', invite_code: 'ALG-1', organizer_id: 'u-1' }],
      members: [{ user_id: 'u-1', display_name: 'Organizer', role: 'organizer' as const }],
      windows: [{ id: 'w-1', trip_id: 'trip-1', start_date: '2026-07-01', end_date: '2026-07-10' }],
      itineraryDays: [{ id: 'i-1', trip_id: 'trip-1', day: '2026-07-01' }],
      availabilities: [{ trip_id: 'trip-1', user_id: 'u-1', day: '2026-07-01', status: 'available' }],
    }
    const client = buildTestSupabaseClient(session)

    // profiles
    const prof = await client.from('profiles').select().single()
    expect(prof.data.username).toBe('traveler')

    // trips single & maybeSingle
    const tripSingle = await client.from('trips').select().eq('id', 'trip-1').single()
    expect(tripSingle.data.id).toBe('trip-1')

    const tripMaybe = await client.from('trips').select().eq('invite_code', 'ALG-1').maybeSingle()
    expect(tripMaybe.data.id).toBe('trip-1')

    // members
    const member = await client.from('trip_members').select().eq('user_id', 'u-1').single()
    expect(member.data.role).toBe('organizer')

    // mutations: insert, update, delete, upsert
    await client.from('trips').insert({ id: 'trip-2', name: 'Porto' })
    expect(session.trips).toHaveLength(2)

    await client.from('trip_date_windows').insert({ trip_id: 'trip-1', start_date: '2026-08-01', end_date: '2026-08-05' })
    expect(session.windows).toHaveLength(2)

    await client.from('trip_members').insert({ trip_id: 'trip-1', user_id: 'u-2', role: 'member' })
    expect(session.members).toHaveLength(2)

    await client.from('profiles').update({ username: 'UpdatedName' }).eq('id', 'u-1')
    expect(session.profile?.username).toBe('UpdatedName')

    await client.from('trips').update({ name: 'Algarve Summer' }).eq('id', 'trip-1')
    expect(session.trips?.[0]?.name).toBe('Algarve Summer')

    await client.from('trip_date_windows').delete().eq('id', 'w-1')
    expect(session.windows?.some((w) => w.id === 'w-1')).toBe(false)

    await client.from('trip_members').delete().eq('user_id', 'u-2')
    expect(session.members?.some((m) => m.user_id === 'u-2')).toBe(false)

    await client.from('trip_availability').upsert([{ trip_id: 'trip-1', user_id: 'u-1', day: '2026-07-02' }])
    expect(session.availabilities).toHaveLength(2)
  })

  it('handles RPC and storage operations', async () => {
    const session: PlanitTestSession = {
      trips: [{ id: 'trip-1', name: 'Algarve', invite_code: 'ALG-1', organizer_id: 'u-1' }],
      members: [{ user_id: 'u-1', display_name: 'Organizer', role: 'organizer' as const }],
      itineraryDays: [],
    }
    const client = buildTestSupabaseClient(session)

    // RPC
    const membersRpc = await client.rpc('get_trip_members', { p_trip_id: 'trip-1' })
    expect(membersRpc.data).toHaveLength(1)

    await client.rpc('lock_trip_dates', { p_trip_id: 'trip-1', p_start: '2026-12-01', p_end: '2026-12-05' })
    expect(session.trips?.[0]?.state).toBe('Dates locked')
    expect(session.itineraryDays).toHaveLength(5)

    await client.rpc('unlock_trip_dates', { p_trip_id: 'trip-1' })
    expect(session.trips?.[0]?.state).toBe('Planning')
    expect(session.itineraryDays).toHaveLength(0)

    // Storage
    const storage = client.storage.from('avatars')
    const uploadRes = await storage.upload('avatar.png', new Blob())
    expect(uploadRes.data?.path).toBe('avatar.png')
    expect(storage.getPublicUrl('avatar.png').data.publicUrl).toBe('/avatar.png')
    const removeRes = await storage.remove(['avatar.png'])
    expect(removeRes.error).toBeNull()
  })

  it('logs, edits and deletes shared expenses with the same permissions as the database', async () => {
    const session: PlanitTestSession = {
      user: { id: 'ana', email: 'ana@planit.app' },
      trips: [{ id: 'trip-1', name: 'Algarve', organizer_id: 'org' }],
      expenses: [],
    }
    const cookieStore = { set: vi.fn() }
    const client = buildTestSupabaseClient(session, cookieStore)
    const save = (c: typeof client, expenseId: string | null, cents: number, payer: string, parts: string[]) =>
      c.rpc('save_trip_expense', {
        p_trip_id: 'trip-1',
        p_expense_id: expenseId,
        p_description: 'Dinner',
        p_amount_cents: cents,
        p_paid_by: payer,
        p_participants: parts,
      })

    expect((await save(client, null, 1001, 'ana', ['bruno', 'ana'])).error).toBeNull()
    expect(session.expenses).toHaveLength(1)
    expect(session.expenses?.[0].trip_expense_participants).toEqual([
      { user_id: 'ana', share_cents: 501 },
      { user_id: 'bruno', share_cents: 500 },
    ])
    expect(cookieStore.set).toHaveBeenCalled()

    const listed = await client.from('trip_expenses').select().eq('trip_id', 'trip-1').order('created_at')
    expect(listed.data).toHaveLength(1)

    const expenseId = session.expenses![0].id
    expect((await save(client, expenseId, 2000, 'ana', ['ana'])).error).toBeNull()
    expect(session.expenses?.[0].amount_cents).toBe(2000)
    expect(session.expenses?.[0].trip_expense_participants).toEqual([{ user_id: 'ana', share_cents: 2000 }])

    expect((await save(client, 'nope', 1, 'ana', ['ana'])).error?.message).toBe('The expense does not exist.')
    expect((await client.rpc('delete_trip_expense', { p_expense_id: 'nope' })).error?.message).toBe(
      'The expense does not exist.'
    )

    const bruno = buildTestSupabaseClient({ ...session, user: { id: 'bruno', email: 'bruno@planit.app' } })
    expect((await save(bruno, expenseId, 1, 'bruno', ['bruno'])).error?.message).toBe(
      'Only the payer or the organizer can edit this expense.'
    )
    expect((await bruno.rpc('delete_trip_expense', { p_expense_id: expenseId })).error?.message).toBe(
      'Only the payer or the organizer can delete this expense.'
    )

    const organizer = buildTestSupabaseClient({ ...session, user: { id: 'org', email: 'org@planit.app' } })
    expect((await organizer.rpc('delete_trip_expense', { p_expense_id: expenseId })).error).toBeNull()
  })
})
