import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getUserMemberTrips } from '@/app/trips/actions/get-member-trips'
import { formatEventDate } from '@/utils/date-formatter'
import * as supabaseServer from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

describe('formatEventDate', () => {
  it('formats valid ISO date strings nicely', () => {
    const formatted = formatEventDate('2026-06-15T10:30:00Z')
    expect(formatted).toContain('2026')
    expect(formatted).toContain('Jun')
  })

  it('returns "Dates not set" for null, undefined, or empty strings', () => {
    expect(formatEventDate(null)).toBe('Dates not set')
    expect(formatEventDate(undefined)).toBe('Dates not set')
    expect(formatEventDate('')).toBe('Dates not set')
  })

  it('returns "Dates not set" for invalid date strings', () => {
    expect(formatEventDate('not-a-date')).toBe('Dates not set')
  })
})

describe('getUserMemberTrips', () => {
  let mockGetUser: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser = vi.fn().mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
  })

  it('returns an empty array if createClient returns an invalid client', async () => {
    vi.mocked(supabaseServer.createClient).mockResolvedValueOnce(
      null as unknown as SupabaseClient
    )
    const result = await getUserMemberTrips()
    expect(result).toEqual([])
  })

  it('returns an empty array if client does not have from method', async () => {
    vi.mocked(supabaseServer.createClient).mockResolvedValueOnce({
      auth: { getUser: mockGetUser },
    } as unknown as SupabaseClient)
    const result = await getUserMemberTrips()
    expect(result).toEqual([])
  })

  it('returns an empty array if user is not authenticated', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    })

    vi.mocked(supabaseServer.createClient).mockResolvedValueOnce({
      auth: { getUser: mockGetUser },
      from: vi.fn(),
    } as unknown as SupabaseClient)

    const result = await getUserMemberTrips()
    expect(result).toEqual([])
  })

  it('returns an empty array if getUser returns an error', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: new Error('Auth failure'),
    })

    vi.mocked(supabaseServer.createClient).mockResolvedValueOnce({
      auth: { getUser: mockGetUser },
      from: vi.fn(),
    } as unknown as SupabaseClient)

    const result = await getUserMemberTrips()
    expect(result).toEqual([])
  })

  it('returns an empty array if profile query fails with error', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: new Error('Profile lookup error'),
      }),
    })

    vi.mocked(supabaseServer.createClient).mockResolvedValueOnce({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    } as unknown as SupabaseClient)

    const result = await getUserMemberTrips()
    expect(result).toEqual([])
    expect(mockFrom).toHaveBeenCalledWith('trip_members')
  })

  it('returns an empty array if user profile does not exist or has no shell_id', async () => {
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { shell_id: null },
        error: null,
      }),
    })

    vi.mocked(supabaseServer.createClient).mockResolvedValueOnce({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    } as unknown as SupabaseClient)

    const result = await getUserMemberTrips()
    expect(result).toEqual([])
  })

  it('returns an empty array if trip_memebers query fails with error', async () => {
    const mockFrom = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { shell_id: 42 },
            error: null,
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Members query error'),
        }),
      }
    })

    vi.mocked(supabaseServer.createClient).mockResolvedValueOnce({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    } as unknown as SupabaseClient)

    const result = await getUserMemberTrips()
    expect(result).toEqual([])
  })

  it('returns an empty array if trip_memebers returns null data', async () => {
    const mockFrom = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { shell_id: 42 },
            error: null,
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }
    })

    vi.mocked(supabaseServer.createClient).mockResolvedValueOnce({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    } as unknown as SupabaseClient)

    const result = await getUserMemberTrips()
    expect(result).toEqual([])
  })

  it('returns member trips with chronologically sorted dates and deduplicates trips', async () => {
    const sampleRows = [
      {
        member_id: 42,
        trip_id: 'trip-1',
        trips: {
          id: 'trip-1',
          name: 'Azores Adventure',
          destination: 'São Miguel',
          description: 'Exploring lakes and volcanoes',
          state: 'planning',
          created_at: '2026-01-01T00:00:00Z',
          organizer_id: 'org-1',
          trip_dates: [
            {
              date_id: 'd-2',
              date_itself: '2026-07-20T12:00:00Z',
              event: 'Volcano hike',
            },
            {
              date_id: 'd-1',
              date_itself: '2026-07-15T09:00:00Z',
              event: 'Arrival and car rental',
            },
          ],
        },
      },
      // Duplicate entry for same trip
      {
        member_id: 42,
        trip_id: 'trip-1',
        trips: {
          id: 'trip-1',
          name: 'Azores Adventure',
        },
      },
      // Trip with array-shaped trips return from PostgREST and no dates
      {
        member_id: 42,
        trip_id: 'trip-2',
        trips: [
          {
            id: 'trip-2',
            name: 'Porto Wine Weekend',
            destination: 'Porto',
            description: null,
            state: 'confirmed',
            created_at: null,
            organizer_id: null,
            trip_dates: null,
          },
        ],
      },
      // Invalid entry without trip
      {
        member_id: 42,
        trip_id: 'trip-3',
        trips: null,
      },
    ]

    const mockFrom = vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { shell_id: 42 },
            error: null,
          }),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: sampleRows,
          error: null,
        }),
      }
    })

    vi.mocked(supabaseServer.createClient).mockResolvedValueOnce({
      auth: { getUser: mockGetUser },
      from: mockFrom,
    } as unknown as SupabaseClient)

    const result = await getUserMemberTrips()
    expect(result).toHaveLength(2)

    // Verify chronological order for trip 1
    const trip1 = result.find((t) => t.id === 'trip-1')
    expect(trip1).toBeDefined()
    expect(trip1?.name).toBe('Azores Adventure')
    expect(trip1?.destination).toBe('São Miguel')
    expect(trip1?.trip_dates).toHaveLength(2)
    expect(trip1?.trip_dates[0].date_id).toBe('d-1') // Earlier date first
    expect(trip1?.trip_dates[1].date_id).toBe('d-2') // Later date second

    // Verify trip 2
    const trip2 = result.find((t) => t.id === 'trip-2')
    expect(trip2).toBeDefined()
    expect(trip2?.name).toBe('Porto Wine Weekend')
    expect(trip2?.trip_dates).toEqual([])
  })

  it('handles unexpected exceptions and returns empty array', async () => {
    vi.mocked(supabaseServer.createClient).mockRejectedValueOnce(
      new Error('Fatal network crash')
    )
    const result = await getUserMemberTrips()
    expect(result).toEqual([])
  })
})
