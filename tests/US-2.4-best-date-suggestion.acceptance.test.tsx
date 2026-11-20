/**
 * @file acceptanceTests/US-2.4-best-date-suggestion.acceptance.test.tsx
 * @brief Acceptance tests for US-2.4: Automatic Best-Date Suggestion.
 */

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LockDates } from '@/app/trips/[id]/lock-dates'
import * as actions from '@/app/trips/actions/lock-dates'
import { groupAvailableByDay } from '@/utils/best-dates'

vi.mock('@/app/trips/actions/lock-dates', () => ({
  lockTripDates: vi.fn(),
  unlockTripDates: vi.fn(),
}))

const windows = [
  { id: 'w1', trip_id: 'trip-1', start_date: '2099-07-01', end_date: '2099-07-06' },
  { id: 'w2', trip_id: 'trip-1', start_date: '2099-08-10', end_date: '2099-08-15' },
]

const members = [
  { user_id: 'ana', display_name: 'Ana' },
  { user_id: 'bruno', display_name: 'Bruno' },
  { user_id: 'carla', display_name: 'Carla' },
]

const availableDays = (userId: string, days: string[]) =>
  days.map((day) => ({ user_id: userId, day, status: 'available' as const }))

// July: Ana and Bruno are free on 2-4 July. August: all three are free on 11-13 August.
const rows = [
  ...availableDays('ana', ['2099-07-02', '2099-07-03', '2099-07-04', '2099-08-11', '2099-08-12', '2099-08-13']),
  ...availableDays('bruno', ['2099-07-02', '2099-07-03', '2099-07-04', '2099-08-11', '2099-08-12', '2099-08-13']),
  ...availableDays('carla', ['2099-08-11', '2099-08-12', '2099-08-13']),
]

function renderDates(props: Partial<React.ComponentProps<typeof LockDates>> = {}) {
  return render(
    <LockDates
      tripId="trip-1"
      isOrganizer
      windows={windows}
      lockedStart={null}
      lockedEnd={null}
      itineraryDayCount={0}
      members={members}
      availableByDay={groupAvailableByDay(rows)}
      hasAnswers
      {...props}
    />
  )
}

describe('US-2.4 Acceptance Tests: Automatic Best-Date Suggestion', () => {
  beforeEach(() => {
    vi.mocked(actions.lockTripDates).mockResolvedValue({ success: true })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('AC1: the organizer sees candidate ranges ranked by the number of available members', () => {
    renderDates()
    fireEvent.change(screen.getByLabelText('Trip length (days)'), { target: { value: '3' } })

    const items = screen.getAllByRole('listitem')
    expect(items[0].textContent).toContain('11 Aug 2099 → 13 Aug 2099')
    expect(items[0].textContent).toContain('3/3 can attend')
    expect(items[1].textContent).toContain('2 Jul 2099 → 4 Jul 2099')
    expect(items[1].textContent).toContain('2/3 can attend')
  })

  it('AC2: ranges with the same number of available members are ranked by earliest start', () => {
    renderDates()
    fireEvent.change(screen.getByLabelText('Trip length (days)'), { target: { value: '2' } })

    const items = screen.getAllByRole('listitem')
    // 11-12 Aug and 12-13 Aug have all 3 members, so the earliest comes first.
    expect(items[0].textContent).toContain('11 Aug 2099 → 12 Aug 2099')
    expect(items[1].textContent).toContain('12 Aug 2099 → 13 Aug 2099')
    // 2-3 Jul and 3-4 Jul have 2 members each, ahead of the rest.
    expect(items[2].textContent).toContain('2 Jul 2099 → 3 Jul 2099')
    expect(items[3].textContent).toContain('3 Jul 2099 → 4 Jul 2099')
  })

  it('AC3: a suggested range shows which members cannot attend', () => {
    renderDates()
    fireEvent.change(screen.getByLabelText('Trip length (days)'), { target: { value: '3' } })

    const items = screen.getAllByRole('listitem')
    expect(items[0].textContent).toContain('Everyone can attend')
    expect(items[1].textContent).toContain('Cannot attend: Carla')
  })

  it('AC4: choosing a suggestion pre-fills the lock dates form', async () => {
    renderDates()
    fireEvent.change(screen.getByLabelText('Trip length (days)'), { target: { value: '3' } })

    fireEvent.click(screen.getAllByRole('button', { name: 'Use these dates' })[1])

    expect((document.getElementById('lock-start') as HTMLInputElement).value).toBe('2099-07-02')
    expect((document.getElementById('lock-end') as HTMLInputElement).value).toBe('2099-07-04')

    fireEvent.click(screen.getByRole('button', { name: 'Lock dates' }))
    await waitFor(() =>
      expect(actions.lockTripDates).toHaveBeenCalledWith('trip-1', '2099-07-02', '2099-07-04')
    )
  })

  it('does not show suggestions before anyone has submitted availability', () => {
    renderDates({ availableByDay: {}, hasAnswers: false })

    expect(screen.getByText('Suggestions appear once members submit their availability.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Use these dates' })).toBeNull()
  })
})
