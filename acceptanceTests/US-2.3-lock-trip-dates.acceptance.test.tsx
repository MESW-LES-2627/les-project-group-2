/**
 * @file acceptanceTests/US-2.3-lock-trip-dates.acceptance.test.tsx
 * @brief Acceptance tests for US-2.3: Lock Official Trip Dates.
 */

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LockDates } from '@/app/trips/[id]/lock-dates'
import { AvailabilityCalendar } from '@/app/trips/[id]/availability-calendar'
import { DateWindows } from '@/app/trips/[id]/date-windows'
import { lockTripDates, unlockTripDates } from '@/app/trips/actions/lock-dates'
import * as supabaseServer from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

const windows = [{ id: 'w1', trip_id: 'trip-1', start_date: '2099-07-01', end_date: '2099-07-10' }]
const days = [
  { day: '2099-07-02', available: ['Ana'], unavailable: [] },
  { day: '2099-07-03', available: [], unavailable: [] },
]

/**
 * @brief Builds a Supabase stand-in whose lock functions behave like the database ones.
 */
function createFakeSupabase(isOrganizer: boolean) {
  const state = { locked: false }
  const rpc = vi.fn(async (name: string) => {
    if (!isOrganizer) {
      return { error: { code: 'P0001', message: `Only the organizer can ${name === 'lock_trip_dates' ? 'lock' : 'unlock'} the trip dates.` } }
    }
    if (name === 'lock_trip_dates') {
      state.locked = true
    } else {
      state.locked = false
    }
    return { error: null }
  })

  return {
    state,
    rpc,
    client: {
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
      rpc,
    } as unknown as SupabaseClient,
  }
}

describe('US-2.3 Acceptance Tests: Lock Official Trip Dates', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('AC1: the organizer selects a range, confirms, and the locked dates are shown to every member', async () => {
    const { client, rpc, state } = createFakeSupabase(true)
    vi.mocked(supabaseServer.createClient).mockResolvedValue(client)

    render(
      <LockDates
        tripId="trip-1"
        isOrganizer
        windows={windows}
        lockedStart={null}
        lockedEnd={null}
        itineraryDayCount={0}
      />
    )

    fireEvent.change(document.getElementById('lock-start') as HTMLInputElement, {
      target: { value: '2099-07-02' },
    })
    fireEvent.change(document.getElementById('lock-end') as HTMLInputElement, {
      target: { value: '2099-07-05' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Lock dates' }))

    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => expect(state.locked).toBe(true))
    expect(rpc).toHaveBeenCalledWith('lock_trip_dates', {
      p_trip_id: 'trip-1',
      p_start: '2099-07-02',
      p_end: '2099-07-05',
    })

    cleanup()
    render(
      <LockDates
        tripId="trip-1"
        isOrganizer={false}
        windows={windows}
        lockedStart="2099-07-02"
        lockedEnd="2099-07-05"
        itineraryDayCount={4}
      />
    )
    expect(screen.getByText('2 Jul 2099 → 5 Jul 2099')).toBeTruthy()
  })

  it('AC1: a member cannot lock the dates', async () => {
    const { client } = createFakeSupabase(false)
    vi.mocked(supabaseServer.createClient).mockResolvedValue(client)
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(lockTripDates('trip-1', '2099-07-02', '2099-07-05')).resolves.toEqual({
      error: 'Only the organizer can lock the trip dates.',
    })
  })

  it('AC2: once locked, availability is read-only and the trip status is "Dates locked"', () => {
    render(
      <LockDates
        tripId="trip-1"
        isOrganizer={false}
        windows={windows}
        lockedStart="2099-07-02"
        lockedEnd="2099-07-03"
        itineraryDayCount={2}
      />
    )
    expect(screen.getByText('Dates locked')).toBeTruthy()

    cleanup()
    render(
      <AvailabilityCalendar
        tripId="trip-1"
        days={days}
        missing={[]}
        memberCount={2}
        myAnswers={{ '2099-07-02': 'available' }}
        locked
      />
    )
    for (const select of screen.getAllByRole('combobox')) {
      expect((select as HTMLSelectElement).disabled).toBe(true)
    }
    expect(screen.queryByRole('button', { name: 'Save my availability' })).toBeNull()

    cleanup()
    render(<DateWindows tripId="trip-1" windows={windows} isOrganizer locked />)
    expect(screen.queryByRole('button', { name: 'Add date window' })).toBeNull()
  })

  it('AC3: the itinerary days created by the lock are reported to the group', () => {
    render(
      <LockDates
        tripId="trip-1"
        isOrganizer={false}
        windows={windows}
        lockedStart="2099-07-02"
        lockedEnd="2099-07-05"
        itineraryDayCount={4}
      />
    )

    expect(screen.getByText(/4 itinerary days created/)).toBeTruthy()
  })

  it('AC4: the organizer unlocks the dates and members can edit their availability again', async () => {
    const { client, rpc, state } = createFakeSupabase(true)
    state.locked = true
    vi.mocked(supabaseServer.createClient).mockResolvedValue(client)

    render(
      <LockDates
        tripId="trip-1"
        isOrganizer
        windows={windows}
        lockedStart="2099-07-02"
        lockedEnd="2099-07-05"
        itineraryDayCount={4}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Unlock dates' }))

    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => expect(state.locked).toBe(false))
    expect(rpc).toHaveBeenCalledWith('unlock_trip_dates', { p_trip_id: 'trip-1' })
    await expect(unlockTripDates('trip-1')).resolves.toEqual({ success: true })

    cleanup()
    render(
      <AvailabilityCalendar
        tripId="trip-1"
        days={days}
        missing={[]}
        memberCount={2}
        myAnswers={{}}
        locked={false}
      />
    )
    for (const select of screen.getAllByRole('combobox')) {
      expect((select as HTMLSelectElement).disabled).toBe(false)
    }
    expect(screen.getByRole('button', { name: 'Save my availability' })).toBeTruthy()
  })
})
