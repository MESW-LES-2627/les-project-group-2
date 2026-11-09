/**
 * @file tests/trip-lock-utils.test.ts
 * @brief Unit tests for the trip date lock validation helper.
 */

import { describe, expect, it } from 'vitest'
import { DATES_LOCKED_STATE, validateLockRange } from '@/utils/trip-lock'

const windows = [
  { start_date: '2099-07-01', end_date: '2099-07-10' },
  { start_date: '2099-07-11', end_date: '2099-07-15' },
]

describe('validateLockRange', () => {
  it('accepts a range inside a single window', () => {
    expect(validateLockRange('2099-07-02', '2099-07-05', windows)).toBeNull()
  })

  it('accepts a range spanning adjacent windows', () => {
    expect(validateLockRange('2099-07-08', '2099-07-13', windows)).toBeNull()
  })

  it('accepts a single-day range', () => {
    expect(validateLockRange('2099-07-01', '2099-07-01', windows)).toBeNull()
  })

  it('requires both dates', () => {
    expect(validateLockRange('', '2099-07-05', windows)).toMatch(/required/)
    expect(validateLockRange('2099-07-02', '', windows)).toMatch(/required/)
  })

  it('rejects invalid calendar dates', () => {
    expect(validateLockRange('2099-02-30', '2099-07-05', windows)).toMatch(/valid calendar/)
  })

  it('rejects an end date before the start date', () => {
    expect(validateLockRange('2099-07-05', '2099-07-02', windows)).toBe(
      'The end date cannot be before the start date.'
    )
  })

  it('rejects ranges with days outside the candidate windows', () => {
    expect(validateLockRange('2099-07-14', '2099-07-16', windows)).toBe(
      'The locked dates must be inside the candidate date windows.'
    )
  })

  it('rejects ranges when there are no windows', () => {
    expect(validateLockRange('2099-07-02', '2099-07-05', [])).toMatch(/inside the candidate/)
  })

  it('exposes the trip state label used while the dates are locked', () => {
    expect(DATES_LOCKED_STATE).toBe('Dates locked')
  })
})
