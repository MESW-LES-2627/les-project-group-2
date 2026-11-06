/**
 * @file tests/date-windows-component.test.tsx
 * @brief Unit tests for the DateWindows component.
 */

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DateWindows } from '@/app/trips/[id]/date-windows'
import * as actions from '@/app/trips/actions/date-windows'

vi.mock('@/app/trips/actions/date-windows', () => ({
  addDateWindow: vi.fn(),
  updateDateWindow: vi.fn(),
  deleteDateWindow: vi.fn(),
}))

const windows = [
  { id: 'w1', trip_id: 'trip-1', start_date: '2099-07-01', end_date: '2099-07-10' },
  { id: 'w2', trip_id: 'trip-1', start_date: '2099-08-05', end_date: '2099-08-12' },
]

function fillDates(start: string, end: string, prefix = 'new') {
  fireEvent.change(document.getElementById(`${prefix}-start`) as HTMLInputElement, {
    target: { value: start },
  })
  fireEvent.change(document.getElementById(`${prefix}-end`) as HTMLInputElement, {
    target: { value: end },
  })
}

describe('DateWindows', () => {
  beforeEach(() => {
    vi.mocked(actions.addDateWindow).mockResolvedValue({ success: true })
    vi.mocked(actions.updateDateWindow).mockResolvedValue({ success: true })
    vi.mocked(actions.deleteDateWindow).mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows an empty state when there are no windows', () => {
    render(<DateWindows tripId="trip-1" windows={[]} isOrganizer={false} />)

    expect(screen.getByText('No date windows have been proposed yet.')).toBeTruthy()
  })

  it('lists every window without management controls for members', () => {
    render(<DateWindows tripId="trip-1" windows={windows} isOrganizer={false} />)

    expect(screen.getByText(/1 Jul 2099/)).toBeTruthy()
    expect(screen.getByText(/12 Aug 2099/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Add date window' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
  })

  it('adds a valid window and resets the form', async () => {
    render(<DateWindows tripId="trip-1" windows={[]} isOrganizer />)

    fillDates('2099-09-01', '2099-09-07')
    fireEvent.click(screen.getByRole('button', { name: 'Add date window' }))

    await waitFor(() =>
      expect(actions.addDateWindow).toHaveBeenCalledWith('trip-1', '2099-09-01', '2099-09-07')
    )
    await waitFor(() =>
      expect((document.getElementById('new-start') as HTMLInputElement).value).toBe('')
    )
  })

  it('shows a validation error when the end date is before the start date', () => {
    render(<DateWindows tripId="trip-1" windows={[]} isOrganizer />)

    fillDates('2099-09-10', '2099-09-01')
    fireEvent.click(screen.getByRole('button', { name: 'Add date window' }))

    expect(screen.getByRole('alert').textContent).toBe(
      'The end date cannot be before the start date.'
    )
    expect(actions.addDateWindow).not.toHaveBeenCalled()
  })

  it('shows a validation error when the start date is in the past', () => {
    render(<DateWindows tripId="trip-1" windows={[]} isOrganizer />)

    fillDates('2000-01-01', '2099-09-01')
    fireEvent.click(screen.getByRole('button', { name: 'Add date window' }))

    expect(screen.getByRole('alert').textContent).toBe('The start date cannot be in the past.')
    expect(actions.addDateWindow).not.toHaveBeenCalled()
  })

  it('shows server errors', async () => {
    vi.mocked(actions.addDateWindow).mockResolvedValueOnce({ error: 'Failed to add the date window.' })
    render(<DateWindows tripId="trip-1" windows={[]} isOrganizer />)

    fillDates('2099-09-01', '2099-09-07')
    fireEvent.click(screen.getByRole('button', { name: 'Add date window' }))

    expect((await screen.findByRole('alert')).textContent).toBe('Failed to add the date window.')
  })

  it('edits an existing window', async () => {
    render(<DateWindows tripId="trip-1" windows={windows} isOrganizer />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    fireEvent.change(document.getElementById('start-w1') as HTMLInputElement, {
      target: { value: '2099-07-02' },
    })
    fireEvent.change(document.getElementById('end-w1') as HTMLInputElement, {
      target: { value: '2099-07-11' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save window' }))

    await waitFor(() =>
      expect(actions.updateDateWindow).toHaveBeenCalledWith(
        'trip-1',
        'w1',
        '2099-07-02',
        '2099-07-11'
      )
    )
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Save window' })).toBeNull())
  })

  it('cancels editing', () => {
    render(<DateWindows tripId="trip-1" windows={windows} isOrganizer />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0])
    expect(screen.getByRole('button', { name: 'Save window' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('button', { name: 'Save window' })).toBeNull()
  })

  it('deletes a window', async () => {
    render(<DateWindows tripId="trip-1" windows={windows} isOrganizer />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[1])

    await waitFor(() => expect(actions.deleteDateWindow).toHaveBeenCalledWith('trip-1', 'w2'))
  })

  it('shows an error when deleting fails', async () => {
    vi.mocked(actions.deleteDateWindow).mockResolvedValueOnce({ error: 'Failed to delete the date window.' })
    render(<DateWindows tripId="trip-1" windows={windows} isOrganizer />)

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0])

    expect((await screen.findByRole('alert')).textContent).toBe('Failed to delete the date window.')
  })
})
