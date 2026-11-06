/**
 * @file tests/date-windows-utils.test.ts
 * @brief Unit tests for the date window validation helpers.
 */

import { describe, expect, it } from 'vitest'
import { isValidIsoDate, toIsoDate, validateDateWindow } from '@/utils/date-windows'

describe('toIsoDate', () => {
  it('formats a moment as a UTC calendar date', () => {
    expect(toIsoDate(new Date('2026-12-05T23:30:00Z'))).toBe('2026-12-05')
  })

  it('defaults to the current date', () => {
    expect(toIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('isValidIsoDate', () => {
  it('accepts real calendar dates', () => {
    expect(isValidIsoDate('2026-02-28')).toBe(true)
    expect(isValidIsoDate('2028-02-29')).toBe(true)
  })

  it('rejects malformed or impossible dates', () => {
    expect(isValidIsoDate('28/02/2026')).toBe(false)
    expect(isValidIsoDate('2026-02-30')).toBe(false)
    expect(isValidIsoDate('2026-13-01')).toBe(false)
    expect(isValidIsoDate('')).toBe(false)
  })
})

describe('validateDateWindow', () => {
  const today = '2026-11-06'

  it('accepts a window in the future', () => {
    expect(validateDateWindow('2026-12-01', '2026-12-10', today)).toBeNull()
  })

  it('accepts a window starting today and a single-day window', () => {
    expect(validateDateWindow('2026-11-06', '2026-11-06', today)).toBeNull()
  })

  it('requires both dates', () => {
    expect(validateDateWindow('', '2026-12-10', today)).toMatch(/required/)
    expect(validateDateWindow('2026-12-01', '', today)).toMatch(/required/)
  })

  it('rejects invalid calendar dates', () => {
    expect(validateDateWindow('2026-02-30', '2026-12-10', today)).toMatch(/valid calendar/)
  })

  it('rejects a start date in the past', () => {
    expect(validateDateWindow('2026-11-05', '2026-12-10', today)).toBe(
      'The start date cannot be in the past.'
    )
  })

  it('rejects an end date before the start date', () => {
    expect(validateDateWindow('2026-12-10', '2026-12-01', today)).toBe(
      'The end date cannot be before the start date.'
    )
  })

  it('uses the current date when none is given', () => {
    expect(validateDateWindow('2000-01-01', '2000-01-02')).toBe(
      'The start date cannot be in the past.'
    )
  })
})
