/**
 * @file tests/availability-calendar-component.test.tsx
 * @brief Unit tests for the AvailabilityCalendar component.
 */

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AvailabilityCalendar } from '@/app/trips/[id]/availability-calendar'
import * as actions from '@/app/trips/actions/availability'

vi.mock('@/app/trips/actions/availability', () => ({
  saveAvailability: vi.fn(),
}))

const days = [
  { day: '2099-07-01', available: ['Ana', 'Bruno'], unavailable: ['Carla'] },
  { day: '2099-07-02', available: [], unavailable: [] },
]

function renderCalendar(
  props: Partial<React.ComponentProps<typeof AvailabilityCalendar>> = {}
) {
  return render(
    <AvailabilityCalendar
      tripId="trip-1"
      days={days}
      missing={[]}
      memberCount={3}
      myAnswers={{}}
      {...props}
    />
  )
}

describe('AvailabilityCalendar', () => {
  beforeEach(() => {
    vi.mocked(actions.saveAvailability).mockResolvedValue({ success: true })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows how many members are available each day and who they are', () => {
    renderCalendar()

    expect(screen.getByText('2/3 available')).toBeTruthy()
    expect(screen.getByText('Ana, Bruno')).toBeTruthy()
    expect(screen.getByText('Unavailable: Carla')).toBeTruthy()
    expect(screen.getByText('0/3 available')).toBeTruthy()
    expect(screen.getByText('Nobody yet')).toBeTruthy()
  })

  it('shows who is still missing', () => {
    renderCalendar({ missing: ['Carla', 'Diogo'] })

    expect(screen.getByText('Carla, Diogo')).toBeTruthy()
  })

  it('does not show the missing banner when everyone answered', () => {
    renderCalendar()

    expect(screen.queryByText(/still waiting for/i)).toBeNull()
  })

  it('preselects the answers the user already saved', () => {
    renderCalendar({ myAnswers: { '2099-07-01': 'unavailable' } })

    expect((screen.getAllByRole('combobox')[0] as HTMLSelectElement).value).toBe('unavailable')
    expect((screen.getAllByRole('combobox')[1] as HTMLSelectElement).value).toBe('none')
  })

  it('saves only the days that changed', async () => {
    renderCalendar({ myAnswers: { '2099-07-01': 'available' } })

    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'unavailable' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save my availability' }))

    await waitFor(() =>
      expect(actions.saveAvailability).toHaveBeenCalledWith('trip-1', [
        { day: '2099-07-02', choice: 'unavailable' },
      ])
    )
    expect((await screen.findByRole('status')).textContent).toBe('Your availability was saved.')
  })

  it('does not restore or resubmit an answer after its day is pruned and reintroduced', async () => {
    const props = { tripId: 'trip-1', missing: [], memberCount: 3 }
    const view = render(
      <AvailabilityCalendar {...props} days={days} myAnswers={{ '2099-07-01': 'available' }} />
    )

    view.rerender(<AvailabilityCalendar {...props} days={[days[1]]} myAnswers={{}} />)
    view.rerender(<AvailabilityCalendar {...props} days={days} myAnswers={{}} />)

    expect((screen.getAllByRole('combobox')[0] as HTMLSelectElement).value).toBe('none')
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'unavailable' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save my availability' }))

    await waitFor(() => expect(actions.saveAvailability).toHaveBeenCalledWith('trip-1', [
      { day: '2099-07-02', choice: 'unavailable' },
    ]))
  })

  it('updates untouched answers from the server while preserving unsaved edits', () => {
    const props = { tripId: 'trip-1', missing: [], memberCount: 3, days }
    const view = render(<AvailabilityCalendar {...props} myAnswers={{}} />)

    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'unavailable' } })
    view.rerender(
      <AvailabilityCalendar {...props} myAnswers={{ '2099-07-01': 'available' }} />
    )

    expect((screen.getAllByRole('combobox')[0] as HTMLSelectElement).value).toBe('available')
    expect((screen.getAllByRole('combobox')[1] as HTMLSelectElement).value).toBe('unavailable')
  })

  it('discards unsaved edits for removed days but keeps edits for remaining days', () => {
    const props = { tripId: 'trip-1', missing: [], memberCount: 3, myAnswers: {} }
    const view = render(<AvailabilityCalendar {...props} days={days} />)

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'available' } })
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'unavailable' } })
    view.rerender(<AvailabilityCalendar {...props} days={[days[1]]} />)
    view.rerender(<AvailabilityCalendar {...props} days={days} />)

    expect((screen.getAllByRole('combobox')[0] as HTMLSelectElement).value).toBe('none')
    expect((screen.getAllByRole('combobox')[1] as HTMLSelectElement).value).toBe('unavailable')
  })

  it('does not resubmit an edit after refreshed props confirm it was saved', async () => {
    const props = { tripId: 'trip-1', missing: [], memberCount: 3, days }
    const view = render(<AvailabilityCalendar {...props} myAnswers={{}} />)
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'available' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save my availability' }))
    await screen.findByText('Your availability was saved.')

    view.rerender(<AvailabilityCalendar {...props} myAnswers={{ '2099-07-01': 'available' }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save my availability' }))

    expect(actions.saveAvailability).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('status').textContent).toBe('No changes to save.')
  })

  it('sends "none" when an answer is cleared', async () => {
    renderCalendar({ myAnswers: { '2099-07-01': 'available' } })

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'none' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save my availability' }))

    await waitFor(() =>
      expect(actions.saveAvailability).toHaveBeenCalledWith('trip-1', [
        { day: '2099-07-01', choice: 'none' },
      ])
    )
  })

  it('does not call the server when nothing changed', () => {
    renderCalendar()

    fireEvent.click(screen.getByRole('button', { name: 'Save my availability' }))

    expect(screen.getByRole('status').textContent).toBe('No changes to save.')
    expect(actions.saveAvailability).not.toHaveBeenCalled()
  })

  it('shows server errors', async () => {
    vi.mocked(actions.saveAvailability).mockResolvedValueOnce({
      error: 'Failed to save your availability.',
    })
    renderCalendar()

    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'available' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save my availability' }))

    expect((await screen.findByRole('alert')).textContent).toBe('Failed to save your availability.')
  })
})
