/**
 * @file tests/lock-dates-component.test.tsx
 * @brief Unit tests for the LockDates component.
 */

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LockDates } from '@/app/trips/[id]/lock-dates'
import * as actions from '@/app/trips/actions/lock-dates'

vi.mock('@/app/trips/actions/lock-dates', () => ({
  lockTripDates: vi.fn(),
  unlockTripDates: vi.fn(),
}))

const windows = [{ id: 'w1', trip_id: 'trip-1', start_date: '2099-07-01', end_date: '2099-07-10' }]

function renderLockDates(props: Partial<React.ComponentProps<typeof LockDates>> = {}) {
  return render(
    <LockDates
      tripId="trip-1"
      isOrganizer
      windows={windows}
      lockedStart={null}
      lockedEnd={null}
      itineraryDayCount={0}
      {...props}
    />
  )
}

function fillRange(start: string, end: string) {
  fireEvent.change(document.getElementById('lock-start') as HTMLInputElement, {
    target: { value: start },
  })
  fireEvent.change(document.getElementById('lock-end') as HTMLInputElement, {
    target: { value: end },
  })
}

describe('LockDates', () => {
  beforeEach(() => {
    vi.mocked(actions.lockTripDates).mockResolvedValue({ success: true })
    vi.mocked(actions.unlockTripDates).mockResolvedValue({ success: true })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('tells members the dates are not locked yet', () => {
    renderLockDates({ isOrganizer: false })

    expect(screen.getByText('The organizer has not locked the trip dates yet.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Lock dates' })).toBeNull()
  })

  it('shows the locked dates and status to members, without controls', () => {
    renderLockDates({
      isOrganizer: false,
      lockedStart: '2099-07-02',
      lockedEnd: '2099-07-05',
      itineraryDayCount: 4,
    })

    expect(screen.getByText('Dates locked')).toBeTruthy()
    expect(screen.getByText('2 Jul 2099 → 5 Jul 2099')).toBeTruthy()
    expect(screen.getByText(/4 itinerary days created/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Unlock dates' })).toBeNull()
  })

  it('uses the singular for a single itinerary day', () => {
    renderLockDates({
      lockedStart: '2099-07-02',
      lockedEnd: '2099-07-02',
      itineraryDayCount: 1,
    })

    expect(screen.getByText(/1 itinerary day created/)).toBeTruthy()
  })

  it('asks for confirmation and locks a valid range', async () => {
    renderLockDates()

    fillRange('2099-07-02', '2099-07-05')
    fireEvent.click(screen.getByRole('button', { name: 'Lock dates' }))

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('2 Jul 2099 to 5 Jul 2099'))
    await waitFor(() =>
      expect(actions.lockTripDates).toHaveBeenCalledWith('trip-1', '2099-07-02', '2099-07-05')
    )
  })

  it('does not lock when the organizer cancels the confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderLockDates()

    fillRange('2099-07-02', '2099-07-05')
    fireEvent.click(screen.getByRole('button', { name: 'Lock dates' }))

    expect(actions.lockTripDates).not.toHaveBeenCalled()
  })

  it('shows a validation error for a range outside the candidate windows', () => {
    renderLockDates()

    fillRange('2099-07-08', '2099-07-12')
    fireEvent.click(screen.getByRole('button', { name: 'Lock dates' }))

    expect(screen.getByRole('alert').textContent).toBe(
      'The locked dates must be inside the candidate date windows.'
    )
    expect(window.confirm).not.toHaveBeenCalled()
    expect(actions.lockTripDates).not.toHaveBeenCalled()
  })

  it('shows server errors', async () => {
    vi.mocked(actions.lockTripDates).mockResolvedValueOnce({ error: 'The trip dates are already locked.' })
    renderLockDates()

    fillRange('2099-07-02', '2099-07-05')
    fireEvent.click(screen.getByRole('button', { name: 'Lock dates' }))

    expect((await screen.findByRole('alert')).textContent).toBe('The trip dates are already locked.')
  })

  it('asks for confirmation and unlocks the dates', async () => {
    renderLockDates({ lockedStart: '2099-07-02', lockedEnd: '2099-07-05', itineraryDayCount: 4 })

    fireEvent.click(screen.getByRole('button', { name: 'Unlock dates' }))

    expect(window.confirm).toHaveBeenCalled()
    await waitFor(() => expect(actions.unlockTripDates).toHaveBeenCalledWith('trip-1'))
  })

  it('does not unlock when the organizer cancels the confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderLockDates({ lockedStart: '2099-07-02', lockedEnd: '2099-07-05', itineraryDayCount: 4 })

    fireEvent.click(screen.getByRole('button', { name: 'Unlock dates' }))

    expect(actions.unlockTripDates).not.toHaveBeenCalled()
  })

  it('shows unlock errors', async () => {
    vi.mocked(actions.unlockTripDates).mockResolvedValueOnce({ error: 'The trip dates are not locked.' })
    renderLockDates({ lockedStart: '2099-07-02', lockedEnd: '2099-07-05', itineraryDayCount: 4 })

    fireEvent.click(screen.getByRole('button', { name: 'Unlock dates' }))

    expect((await screen.findByRole('alert')).textContent).toBe('The trip dates are not locked.')
  })
})
