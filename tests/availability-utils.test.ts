/**
 * @file tests/availability-utils.test.ts
 * @brief Unit tests for the availability calendar helpers.
 */

import { describe, expect, it } from 'vitest'
import { buildAvailabilityCalendar, expandWindowDays } from '@/utils/availability'

const members = [
  { user_id: 'u1', display_name: 'Ana' },
  { user_id: 'u2', display_name: 'Bruno' },
  { user_id: 'u3', display_name: 'Carla' },
]

describe('expandWindowDays', () => {
  it('lists every day of a window, inclusive', () => {
    expect(expandWindowDays([{ start_date: '2099-07-30', end_date: '2099-08-02' }])).toEqual([
      '2099-07-30',
      '2099-07-31',
      '2099-08-01',
      '2099-08-02',
    ])
  })

  it('merges overlapping windows without duplicates, sorted', () => {
    const days = expandWindowDays([
      { start_date: '2099-07-05', end_date: '2099-07-07' },
      { start_date: '2099-07-01', end_date: '2099-07-05' },
    ])

    expect(days).toEqual([
      '2099-07-01',
      '2099-07-02',
      '2099-07-03',
      '2099-07-04',
      '2099-07-05',
      '2099-07-06',
      '2099-07-07',
    ])
  })

  it('returns nothing without windows', () => {
    expect(expandWindowDays([])).toEqual([])
  })
})

describe('buildAvailabilityCalendar', () => {
  const windows = [{ start_date: '2099-07-01', end_date: '2099-07-03' }]

  it('shows how many members are available each day and who they are', () => {
    const calendar = buildAvailabilityCalendar(
      windows,
      [
        { user_id: 'u1', day: '2099-07-01', status: 'available' },
        { user_id: 'u2', day: '2099-07-01', status: 'available' },
        { user_id: 'u2', day: '2099-07-02', status: 'unavailable' },
      ],
      members
    )

    expect(calendar.days).toEqual([
      { day: '2099-07-01', available: ['Ana', 'Bruno'], unavailable: [] },
      { day: '2099-07-02', available: [], unavailable: ['Bruno'] },
      { day: '2099-07-03', available: [], unavailable: [] },
    ])
  })

  it('lists members who have not answered yet', () => {
    const calendar = buildAvailabilityCalendar(
      windows,
      [{ user_id: 'u1', day: '2099-07-02', status: 'available' }],
      members
    )

    expect(calendar.missing).toEqual(['Bruno', 'Carla'])
  })

  it('has nobody missing once everyone answered at least one day', () => {
    const calendar = buildAvailabilityCalendar(
      windows,
      members.map((member) => ({ user_id: member.user_id, day: '2099-07-01', status: 'available' as const })),
      members
    )

    expect(calendar.missing).toEqual([])
  })

  it('ignores answers from non-members and for days outside the windows', () => {
    const calendar = buildAvailabilityCalendar(
      windows,
      [
        { user_id: 'stranger', day: '2099-07-01', status: 'available' },
        { user_id: 'u1', day: '2099-09-01', status: 'available' },
      ],
      members
    )

    expect(calendar.days.every((day) => day.available.length === 0)).toBe(true)
    expect(calendar.missing).toEqual(['Ana', 'Bruno', 'Carla'])
  })

  it('returns an empty calendar when there are no windows', () => {
    expect(buildAvailabilityCalendar([], [], members)).toEqual({
      days: [],
      missing: ['Ana', 'Bruno', 'Carla'],
    })
  })
})
