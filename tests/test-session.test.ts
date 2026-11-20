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
})
