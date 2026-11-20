/**
 * @file acceptanceTests/US-2.2-submit-availability.acceptance.test.tsx
 * @brief Acceptance tests for US-2.2: Submit Availability & View Overlaps.
 */

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AvailabilityCalendar } from '@/app/trips/[id]/availability-calendar'
import { saveAvailability } from '@/app/trips/actions/availability'
import { buildAvailabilityCalendar, type AvailabilityRow } from '@/utils/availability'
import * as supabaseServer from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

const windows = [{ start_date: '2099-07-01', end_date: '2099-07-03' }]
const members = [
  { user_id: 'ana', display_name: 'Ana' },
  { user_id: 'bruno', display_name: 'Bruno' },
  { user_id: 'carla', display_name: 'Carla' },
]

/**
 * @brief Builds an in-memory Supabase stand-in so the real server action can be exercised.
 */
function createFakeSupabase(userId: string, stored: AvailabilityRow[]) {
  const membersQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'm1' }, error: null }),
  }
  const windowsQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ data: windows, error: null }),
  }
  const availabilityQuery = {
    upsert: vi.fn((rows: { user_id: string; day: string; status: AvailabilityRow['status'] }[]) => {
      for (const row of rows) {
        const index = stored.findIndex((item) => item.user_id === row.user_id && item.day === row.day)
        const next = { user_id: row.user_id, day: row.day, status: row.status }
        if (index >= 0) stored[index] = next
        else stored.push(next)
      }
      return Promise.resolve({ error: null })
    }),
  }

  return {
    availabilityQuery,
    client: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }) },
      from: vi.fn((table: string) => {
        if (table === 'trip_members') return membersQuery
        if (table === 'trip_date_windows') return windowsQuery
        return availabilityQuery
      }),
    } as unknown as SupabaseClient,
  }
}

describe('US-2.2 Acceptance Tests: Submit Availability & View Overlaps', () => {
  let stored: AvailabilityRow[]

  beforeEach(() => {
    stored = []
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('AC1: a member marks days as available or unavailable and the answer is saved', async () => {
    const { client, availabilityQuery } = createFakeSupabase('ana', stored)
    vi.mocked(supabaseServer.createClient).mockResolvedValue(client)

    const calendar = buildAvailabilityCalendar(windows, stored, members)
    render(
      <AvailabilityCalendar
        tripId="trip-1"
        days={calendar.days}
        missing={calendar.missing}
        memberCount={members.length}
        myAnswers={{}}
      />
    )

    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'available' } })
    fireEvent.change(selects[1], { target: { value: 'unavailable' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save my availability' }))

    await waitFor(() => expect(availabilityQuery.upsert).toHaveBeenCalled())
    expect(stored).toEqual([
      { user_id: 'ana', day: '2099-07-01', status: 'available' },
      { user_id: 'ana', day: '2099-07-02', status: 'unavailable' },
    ])
  })

  it('AC1: only days inside a candidate window can be answered', async () => {
    const { client, availabilityQuery } = createFakeSupabase('ana', stored)
    vi.mocked(supabaseServer.createClient).mockResolvedValue(client)

    await expect(
      saveAvailability('trip-1', [{ day: '2099-12-25', choice: 'available' }])
    ).resolves.toEqual({
      error: 'Availability can only be set for days inside a candidate window.',
    })
    expect(availabilityQuery.upsert).not.toHaveBeenCalled()
  })

  it('AC2: each day shows how many members are available and who they are', () => {
    stored.push(
      { user_id: 'ana', day: '2099-07-01', status: 'available' },
      { user_id: 'bruno', day: '2099-07-01', status: 'available' },
      { user_id: 'carla', day: '2099-07-01', status: 'unavailable' }
    )
    const calendar = buildAvailabilityCalendar(windows, stored, members)

    render(
      <AvailabilityCalendar
        tripId="trip-1"
        days={calendar.days}
        missing={calendar.missing}
        memberCount={members.length}
        myAnswers={{}}
      />
    )

    expect(screen.getByText('2/3 available')).toBeTruthy()
    expect(screen.getByText('Ana, Bruno')).toBeTruthy()
  })

  it('AC3: members who have not answered yet are listed as missing', () => {
    stored.push({ user_id: 'ana', day: '2099-07-02', status: 'available' })
    const calendar = buildAvailabilityCalendar(windows, stored, members)

    render(
      <AvailabilityCalendar
        tripId="trip-1"
        days={calendar.days}
        missing={calendar.missing}
        memberCount={members.length}
        myAnswers={{}}
      />
    )

    expect(screen.getByText('Bruno, Carla')).toBeTruthy()
  })
})
