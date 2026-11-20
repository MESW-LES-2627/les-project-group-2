/**
 * @file tests/best-dates-utils.test.ts
 * @brief Unit tests for the best-date suggestion helpers.
 */

import { describe, expect, it } from 'vitest'
import { defaultTripLength, groupAvailableByDay, suggestBestDates } from '@/utils/best-dates'

const members = [
  { user_id: 'ana', display_name: 'Ana' },
  { user_id: 'bruno', display_name: 'Bruno' },
  { user_id: 'carla', display_name: 'Carla' },
]

const windows = [{ start_date: '2099-07-01', end_date: '2099-07-05' }]

const availableByDay = {
  '2099-07-01': ['ana', 'bruno'],
  '2099-07-02': ['ana', 'bruno', 'carla'],
  '2099-07-03': ['ana', 'bruno', 'carla'],
  '2099-07-04': ['ana'],
  '2099-07-05': ['ana'],
}

describe('groupAvailableByDay', () => {
  it('groups only the available answers by day', () => {
    expect(
      groupAvailableByDay([
        { user_id: 'ana', day: '2099-07-01', status: 'available' },
        { user_id: 'bruno', day: '2099-07-01', status: 'available' },
        { user_id: 'carla', day: '2099-07-01', status: 'unavailable' },
        { user_id: 'ana', day: '2099-07-02', status: 'available' },
      ])
    ).toEqual({
      '2099-07-01': ['ana', 'bruno'],
      '2099-07-02': ['ana'],
    })
  })

  it('returns an empty object without answers', () => {
    expect(groupAvailableByDay([])).toEqual({})
  })
})

describe('defaultTripLength', () => {
  it('is the length of the shortest candidate window', () => {
    expect(
      defaultTripLength([
        { start_date: '2099-07-01', end_date: '2099-07-03' },
        { start_date: '2099-08-10', end_date: '2099-08-14' },
      ])
    ).toBe(3)
  })

  it('is 1 without windows', () => {
    expect(defaultTripLength([])).toBe(1)
  })
})

describe('suggestBestDates', () => {
  it('ranks ranges by the number of members who can attend every day', () => {
    const suggestions = suggestBestDates(windows, availableByDay, members, 2)

    expect(suggestions.map((s) => [s.start, s.end, s.attending.length])).toEqual([
      ['2099-07-02', '2099-07-03', 3],
      ['2099-07-01', '2099-07-02', 2],
      ['2099-07-03', '2099-07-04', 1],
      ['2099-07-04', '2099-07-05', 1],
    ])
  })

  it('puts the earliest start first when two ranges have the same number of members', () => {
    const suggestions = suggestBestDates(windows, availableByDay, members, 2)

    expect(suggestions[2].start).toBe('2099-07-03')
    expect(suggestions[3].start).toBe('2099-07-04')
  })

  it('shows which members cannot attend each range', () => {
    const [best, second, third] = suggestBestDates(windows, availableByDay, members, 2)

    expect(best.attending).toEqual(['Ana', 'Bruno', 'Carla'])
    expect(best.notAttending).toEqual([])
    expect(second.attending).toEqual(['Ana', 'Bruno'])
    expect(second.notAttending).toEqual(['Carla'])
    expect(third.notAttending).toEqual(['Bruno', 'Carla'])
  })

  it('counts a member only if they are available on every day of the range', () => {
    const [first] = suggestBestDates(windows, availableByDay, members, 5)

    expect(first.start).toBe('2099-07-01')
    expect(first.end).toBe('2099-07-05')
    expect(first.attending).toEqual(['Ana'])
    expect(first.notAttending).toEqual(['Bruno', 'Carla'])
  })

  it('treats members without answers as unable to attend', () => {
    const [first] = suggestBestDates(windows, {}, members, 2)

    expect(first.attending).toEqual([])
    expect(first.notAttending).toEqual(['Ana', 'Bruno', 'Carla'])
    expect(first.start).toBe('2099-07-01')
  })

  it('does not build ranges across a gap between windows', () => {
    const suggestions = suggestBestDates(
      [
        { start_date: '2099-07-01', end_date: '2099-07-03' },
        { start_date: '2099-07-10', end_date: '2099-07-12' },
      ],
      {},
      members,
      2
    )

    expect(suggestions.map((s) => s.start)).toEqual([
      '2099-07-01',
      '2099-07-02',
      '2099-07-10',
      '2099-07-11',
    ])
  })

  it('builds ranges across adjacent windows', () => {
    const suggestions = suggestBestDates(
      [
        { start_date: '2099-07-01', end_date: '2099-07-03' },
        { start_date: '2099-07-04', end_date: '2099-07-06' },
      ],
      {},
      members,
      4
    )

    expect(suggestions.map((s) => [s.start, s.end])).toEqual([
      ['2099-07-01', '2099-07-04'],
      ['2099-07-02', '2099-07-05'],
      ['2099-07-03', '2099-07-06'],
    ])
  })

  it('returns nothing when no range of that length fits', () => {
    expect(suggestBestDates(windows, availableByDay, members, 6)).toEqual([])
  })

  it('returns nothing for an invalid length', () => {
    expect(suggestBestDates(windows, availableByDay, members, 0)).toEqual([])
    expect(suggestBestDates(windows, availableByDay, members, 1.5)).toEqual([])
    expect(suggestBestDates(windows, availableByDay, members, Number.NaN)).toEqual([])
  })

  it('limits the number of suggestions', () => {
    expect(suggestBestDates(windows, availableByDay, members, 1, 2)).toHaveLength(2)
    expect(suggestBestDates(windows, availableByDay, members, 1)).toHaveLength(5)
  })

  it('returns nothing without windows', () => {
    expect(suggestBestDates([], availableByDay, members, 2)).toEqual([])
  })
})
