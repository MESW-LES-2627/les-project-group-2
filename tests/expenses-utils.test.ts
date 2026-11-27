/**
 * @file tests/expenses-utils.test.ts
 * @brief Unit tests for the shared expense helpers.
 */

import { describe, expect, it } from 'vitest'
import {
  MAX_EXPENSE_CENTS,
  canManageExpense,
  formatCents,
  mapExpenseRows,
  parseAmountToCents,
  splitEqually,
  validateExpense,
  type Expense,
} from '@/utils/expenses'

describe('parseAmountToCents', () => {
  it('converts whole and decimal amounts to cents', () => {
    expect(parseAmountToCents('12')).toBe(1200)
    expect(parseAmountToCents('12.5')).toBe(1250)
    expect(parseAmountToCents('12.50')).toBe(1250)
    expect(parseAmountToCents('0.05')).toBe(5)
    expect(parseAmountToCents('1000000')).toBe(100_000_000)
  })

  it('accepts a comma as the decimal separator and ignores surrounding spaces', () => {
    expect(parseAmountToCents(' 12,5 ')).toBe(1250)
  })

  it('does not suffer from floating point errors', () => {
    expect(parseAmountToCents('19.99')).toBe(1999)
    expect(parseAmountToCents('0.29')).toBe(29)
  })

  it('rejects text, negatives, more than two decimals and empty values', () => {
    for (const input of ['', 'abc', '-5', '1.234', '1.2.3', '1e3', '€5', '.5', '5.']) {
      expect(parseAmountToCents(input)).toBeNull()
    }
  })

  it('rejects amounts too large to be exact', () => {
    expect(parseAmountToCents('9'.repeat(30))).toBeNull()
  })

  it('parses zero so the validation can reject it with a clear message', () => {
    expect(parseAmountToCents('0')).toBe(0)
  })
})

describe('formatCents', () => {
  it('formats cents as euros', () => {
    expect(formatCents(1250)).toBe('€12.50')
    expect(formatCents(5)).toBe('€0.05')
    expect(formatCents(100)).toBe('€1.00')
    expect(formatCents(123456789)).toBe('€1,234,567.89')
  })

  it('formats negative amounts', () => {
    expect(formatCents(-250)).toBe('-€2.50')
  })
})

describe('splitEqually', () => {
  it('splits an amount that divides evenly', () => {
    expect(splitEqually(3000, ['b', 'a', 'c'])).toEqual([
      { userId: 'a', shareCents: 1000 },
      { userId: 'b', shareCents: 1000 },
      { userId: 'c', shareCents: 1000 },
    ])
  })

  it('gives the extra cents to the first participants so the shares add up', () => {
    const shares = splitEqually(1000, ['c', 'b', 'a'])

    expect(shares.map((share) => share.shareCents)).toEqual([334, 333, 333])
    expect(shares.reduce((sum, share) => sum + share.shareCents, 0)).toBe(1000)
    expect(splitEqually(1001, ['a', 'b', 'c']).map((s) => s.shareCents)).toEqual([334, 334, 333])
  })

  it('always adds up to the amount', () => {
    for (const amount of [1, 2, 7, 99, 1000, 12345]) {
      for (const count of [1, 2, 3, 4, 7]) {
        const ids = Array.from({ length: count }, (_, index) => `member-${index}`)
        const total = splitEqually(amount, ids).reduce((sum, share) => sum + share.shareCents, 0)
        expect(total).toBe(amount)
      }
    }
  })

  it('counts a repeated participant once', () => {
    expect(splitEqually(100, ['a', 'a', 'b']).map((share) => share.shareCents)).toEqual([50, 50])
  })

  it('returns nothing without participants', () => {
    expect(splitEqually(100, [])).toEqual([])
  })
})

describe('validateExpense', () => {
  const valid = {
    description: '  Dinner  ',
    amount: '12,50',
    paidBy: 'ana',
    participants: ['ana', 'bruno', 'ana'],
  }

  it('cleans a valid expense', () => {
    expect(validateExpense(valid)).toEqual({
      expense: {
        description: 'Dinner',
        amountCents: 1250,
        paidBy: 'ana',
        participants: ['ana', 'bruno'],
      },
    })
  })

  it('requires a description', () => {
    expect(validateExpense({ ...valid, description: '   ' })).toEqual({
      error: 'Describe what the expense was for.',
    })
  })

  it('limits the description to 200 characters', () => {
    expect(validateExpense({ ...valid, description: 'a'.repeat(201) })).toEqual({
      error: 'The description can have at most 200 characters.',
    })
  })

  it('requires an amount greater than zero with at most two decimals', () => {
    const expected = { error: 'Enter an amount greater than zero, with at most two decimals.' }

    expect(validateExpense({ ...valid, amount: '0' })).toEqual(expected)
    expect(validateExpense({ ...valid, amount: '0.00' })).toEqual(expected)
    expect(validateExpense({ ...valid, amount: '-3' })).toEqual(expected)
    expect(validateExpense({ ...valid, amount: 'ten' })).toEqual(expected)
    expect(validateExpense({ ...valid, amount: '1.999' })).toEqual(expected)
  })

  it('limits the amount', () => {
    expect(validateExpense({ ...valid, amount: String(MAX_EXPENSE_CENTS / 100 + 1) })).toEqual({
      error: 'The amount can be at most €1,000,000.00.',
    })
    expect('expense' in validateExpense({ ...valid, amount: String(MAX_EXPENSE_CENTS / 100) })).toBe(true)
  })

  it('requires a payer', () => {
    expect(validateExpense({ ...valid, paidBy: '' })).toEqual({ error: 'Choose who paid.' })
  })

  it('requires at least one participant', () => {
    expect(validateExpense({ ...valid, participants: [] })).toEqual({
      error: 'Choose at least one participant.',
    })
  })
})

describe('mapExpenseRows', () => {
  it('maps rows with their participants, newest first', () => {
    const expenses = mapExpenseRows([
      {
        id: 'old',
        description: 'Taxi',
        amount_cents: 999,
        paid_by: 'ana',
        created_at: '2026-11-19T10:00:00Z',
        trip_expense_participants: [{ user_id: 'ana', share_cents: 999 }],
      },
      {
        id: 'new',
        description: 'Dinner',
        amount_cents: 3000,
        paid_by: 'bruno',
        created_at: '2026-11-20T10:00:00Z',
        trip_expense_participants: [
          { user_id: 'ana', share_cents: 1500 },
          { user_id: 'bruno', share_cents: 1500 },
        ],
      },
    ])

    expect(expenses.map((expense) => expense.id)).toEqual(['new', 'old'])
    expect(expenses[0]).toEqual({
      id: 'new',
      description: 'Dinner',
      amountCents: 3000,
      paidBy: 'bruno',
      createdAt: '2026-11-20T10:00:00Z',
      participants: [
        { userId: 'ana', shareCents: 1500 },
        { userId: 'bruno', shareCents: 1500 },
      ],
    })
  })

  it('handles missing dates and participants', () => {
    const [expense] = mapExpenseRows([
      { id: 'x', description: 'Tickets', amount_cents: 100, paid_by: 'ana' },
    ])

    expect(expense.createdAt).toBe('')
    expect(expense.participants).toEqual([])
  })
})

describe('canManageExpense', () => {
  const expense: Expense = {
    id: 'e1',
    description: 'Dinner',
    amountCents: 3000,
    paidBy: 'ana',
    createdAt: '',
    participants: [],
  }

  it('lets the payer and the organizer manage an expense', () => {
    expect(canManageExpense(expense, 'ana', false)).toBe(true)
    expect(canManageExpense(expense, 'org', true)).toBe(true)
  })

  it('does not let another member manage it', () => {
    expect(canManageExpense(expense, 'bruno', false)).toBe(false)
  })
})
