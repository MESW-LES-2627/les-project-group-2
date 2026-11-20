/**
 * @file tests/create-pin-action.test.ts
 * @brief Unit tests for the createPinAction server action.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPinAction } from '@/app/trips/actions/create-pin'
import * as cache from 'next/cache'
import * as supabaseServer from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('createPinAction', () => {
  let insertQuery: {
    insert: ReturnType<typeof vi.fn>
    select: ReturnType<typeof vi.fn>
    single: ReturnType<typeof vi.fn>
  }
  let mockGetUser: ReturnType<typeof vi.fn>
  let insertedRow: Record<string, unknown>
  let insertError: unknown

  const input = {
    name: '  Torre de Belém  ',
    description: 'Iconic tower',
    date: '2026-11-15',
    category: 'sightseeing' as const,
    lat: 38.6916,
    lng: -9.216,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    insertError = null
    insertedRow = {
      id: 'pin-1',
      trip_id: 'trip-1',
      name: input.name.trim(),
      description: input.description,
      date: input.date,
      category: input.category,
      lat: input.lat,
      lng: input.lng,
      proposed_by: 'organizer@planit.app',
      created_at: '2026-11-01T00:00:00Z',
      is_confirmed: false,
    }

    insertQuery = {
      insert: vi.fn(() => insertQuery),
      select: vi.fn(() => insertQuery),
      single: vi.fn(() => Promise.resolve({ data: insertedRow, error: insertError })),
    }

    mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'org-user-1', email: 'organizer@planit.app' } },
      error: null,
    })

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: { getUser: mockGetUser },
      from: vi.fn(() => insertQuery),
    } as unknown as SupabaseClient)
  })

  it('rejects missing trip ID or name', async () => {
    await expect(createPinAction('', input)).resolves.toEqual({
      error: 'Trip ID and pin name are required.',
    })
    await expect(createPinAction('trip-1', { ...input, name: '   ' })).resolves.toEqual({
      error: 'Trip ID and pin name are required.',
    })
  })

  it('rejects invalid coordinates', async () => {
    await expect(
      createPinAction('trip-1', { ...input, lat: 999 })
    ).resolves.toEqual({ error: 'Pin coordinates are invalid.' })
  })

  it('rejects unauthenticated callers', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    await expect(createPinAction('trip-1', input)).resolves.toEqual({
      error: 'Authentication required.',
    })
  })

  it('inserts a pin and returns the mapped result', async () => {
    const result = await createPinAction('trip-1', input)

    expect(insertQuery.insert).toHaveBeenCalledWith({
      trip_id: 'trip-1',
      name: 'Torre de Belém',
      description: 'Iconic tower',
      date: '2026-11-15',
      category: 'sightseeing',
      lat: 38.6916,
      lng: -9.216,
      proposed_by: 'organizer@planit.app',
    })
    expect(result.success).toBe(true)
    expect(result.pin).toMatchObject({ id: 'pin-1', tripId: 'trip-1', isConfirmed: false })
    expect(cache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1/map')
  })

  it('falls back to a default proposer when the email is missing', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'org-user-1', email: null } },
      error: null,
    })

    await createPinAction('trip-1', input)

    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({ proposed_by: 'member@planit.app' })
    )
  })

  it('returns an error when the insert fails', async () => {
    insertQuery.single.mockResolvedValue({
      data: null,
      error: { message: 'duplicate' },
    })

    await expect(createPinAction('trip-1', input)).resolves.toEqual({
      error: 'Failed to create pin.',
    })
  })
})
