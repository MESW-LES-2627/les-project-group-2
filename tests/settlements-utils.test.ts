/**
 * @file tests/settlements-utils.test.ts
 * @brief Unit tests for the net balances and the smallest list of payments (US-5.2).
 */

import { describe, expect, it } from 'vitest'
import { computeBalances, simplifyDebts, type Balance, type Settlement } from '@/utils/settlements'
import { splitEqually, type Expense } from '@/utils/expenses'

function expense(id: string, amountCents: number, paidBy: string, participants: string[]): Expense {
  return {
    id,
    description: id,
    amountCents,
    paidBy,
    createdAt: '',
    participants: splitEqually(amountCents, participants),
  }
}

const sum = (balances: Balance[]) => balances.reduce((total, balance) => total + balance.cents, 0)

/** Applies the payments to the balances and returns what is left, which must be nothing. */
function remainingAfter(balances: Balance[], settlements: Settlement[]): Record<string, number> {
  const left: Record<string, number> = Object.fromEntries(balances.map((b) => [b.userId, b.cents]))
  for (const payment of settlements) {
    left[payment.from] += payment.cents
    left[payment.to] -= payment.cents
  }
  return left
}

/** The fewest payments needed, found by brute force: people minus the most groups that add up to zero. */
function fewestPayments(balances: Balance[]): number {
  const open = balances.filter((b) => b.cents !== 0)
  let mostGroups = 0
  for (let mask = 1; mask < 1 << open.length; mask++) {
    // Count the groups with a recursive partition search on small inputs.
    mostGroups = Math.max(mostGroups, partitionCount(open, mask))
  }
  return open.length - mostGroups
}

function partitionCount(open: Balance[], mask: number): number {
  const total = open.reduce((t, b, i) => (mask & (1 << i) ? t + b.cents : t), 0)
  if (total !== 0) return 0
  let best = 1
  const lowest = mask & -mask
  for (let sub = (mask - 1) & mask; sub > 0; sub = (sub - 1) & mask) {
    if (!(sub & lowest)) continue
    const subTotal = open.reduce((t, b, i) => (sub & (1 << i) ? t + b.cents : t), 0)
    if (subTotal !== 0) continue
    best = Math.max(best, 1 + partitionCount(open, mask ^ sub))
  }
  return best
}

describe('computeBalances', () => {
  it('credits the payer and debits every participant', () => {
    const balances = computeBalances([expense('dinner', 3000, 'ana', ['ana', 'bruno', 'carla'])])

    expect(balances).toEqual([
      { userId: 'ana', cents: 2000 },
      { userId: 'bruno', cents: -1000 },
      { userId: 'carla', cents: -1000 },
    ])
  })

  it('adds up the balances of several expenses', () => {
    const balances = computeBalances([
      expense('dinner', 3000, 'ana', ['ana', 'bruno', 'carla']),
      expense('taxi', 1200, 'bruno', ['ana', 'bruno']),
      expense('tickets', 900, 'carla', ['bruno', 'carla']),
    ])

    expect(Object.fromEntries(balances.map((b) => [b.userId, b.cents]))).toEqual({
      ana: 2000 - 600,
      bruno: -1000 + 1200 - 600 - 450,
      carla: -1000 + 900 - 450,
    })
  })

  it('gives a balance of zero to someone who pays only for themselves', () => {
    expect(computeBalances([expense('coffee', 250, 'ana', ['ana'])])).toEqual([{ userId: 'ana', cents: 0 }])
  })

  it('returns nothing without expenses', () => {
    expect(computeBalances([])).toEqual([])
  })

  it('always adds up to zero, whatever the amounts and participants', () => {
    const members = ['a', 'b', 'c', 'd', 'e', 'f', 'g']
    const expenses: Expense[] = []
    for (let i = 0; i < 60; i++) {
      const amount = 1 + ((i * 7919) % 50000)
      const participants = members.filter((_, index) => (i + index) % 3 !== 0 || index === i % members.length)
      expenses.push(expense(`e${i}`, amount, members[(i * 5) % members.length], participants))
    }

    expect(sum(computeBalances(expenses))).toBe(0)
  })

  it('keeps every amount a whole number of cents', () => {
    const balances = computeBalances([
      expense('a', 1001, 'ana', ['ana', 'bruno', 'carla']),
      expense('b', 1, 'bruno', ['ana', 'bruno', 'carla']),
    ])

    balances.forEach((balance) => expect(Number.isInteger(balance.cents)).toBe(true))
    expect(sum(balances)).toBe(0)
  })
})

describe('simplifyDebts', () => {
  it('needs no payments when everyone is settled', () => {
    expect(simplifyDebts([])).toEqual([])
    expect(simplifyDebts([{ userId: 'ana', cents: 0 }])).toEqual([])
  })

  it('settles a single debt with one payment', () => {
    expect(
      simplifyDebts([
        { userId: 'ana', cents: 1500 },
        { userId: 'bruno', cents: -1500 },
      ])
    ).toEqual([{ from: 'bruno', to: 'ana', cents: 1500 }])
  })

  it('lets one person pay several others', () => {
    const settlements = simplifyDebts([
      { userId: 'ana', cents: 700 },
      { userId: 'bruno', cents: 300 },
      { userId: 'carla', cents: -1000 },
    ])

    expect(settlements).toEqual([
      { from: 'carla', to: 'ana', cents: 700 },
      { from: 'carla', to: 'bruno', cents: 300 },
    ])
  })

  it('does not chain payments through a middle person', () => {
    // Ana owes Bruno 10 and Bruno owes Carla 10: Ana can pay Carla directly.
    const balances = computeBalances([
      expense('one', 1000, 'bruno', ['ana']),
      expense('two', 1000, 'carla', ['bruno']),
    ])

    expect(simplifyDebts(balances)).toEqual([{ from: 'ana', to: 'carla', cents: 1000 }])
  })

  it('settles independent groups separately so fewer payments are needed than a greedy match', () => {
    // Two separate pairs: {+5, -5} and {+3, -3}. A greedy match of the biggest amounts could mix them.
    const balances: Balance[] = [
      { userId: 'a', cents: 5 },
      { userId: 'b', cents: 3 },
      { userId: 'c', cents: -3 },
      { userId: 'd', cents: -5 },
    ]

    const settlements = simplifyDebts(balances)

    expect(settlements).toHaveLength(2)
    expect(settlements).toEqual([
      { from: 'd', to: 'a', cents: 5 },
      { from: 'c', to: 'b', cents: 3 },
    ])
  })

  it('finds the exact minimum when a greedy match would need more payments', () => {
    // {+4, -4} and {+3, +3, -2, -4}: greedy would pair 4 with 4 only by luck, so make the groups hidden.
    const balances: Balance[] = [
      { userId: 'p1', cents: 4 },
      { userId: 'p2', cents: 3 },
      { userId: 'p3', cents: 3 },
      { userId: 'n1', cents: -4 },
      { userId: 'n2', cents: -2 },
      { userId: 'n3', cents: -4 },
    ]

    const settlements = simplifyDebts(balances)

    expect(settlements.length).toBe(fewestPayments(balances))
    expect(settlements).toHaveLength(4)
    Object.values(remainingAfter(balances, settlements)).forEach((left) => expect(left).toBe(0))
  })

  it('settles every balance exactly, with positive whole-cent payments', () => {
    const members = ['a', 'b', 'c', 'd', 'e', 'f']
    for (let round = 0; round < 40; round++) {
      const expenses: Expense[] = []
      for (let i = 0; i < 8; i++) {
        const amount = 1 + ((round * 131 + i * 977) % 20000)
        const participants = members.filter((_, index) => (round + i + index) % 4 !== 0)
        expenses.push(
          expense(`e${round}-${i}`, amount, members[(round + i * 3) % members.length], participants.length ? participants : ['a'])
        )
      }
      const balances = computeBalances(expenses)
      const settlements = simplifyDebts(balances)

      Object.values(remainingAfter(balances, settlements)).forEach((left) => expect(left).toBe(0))
      settlements.forEach((payment) => {
        expect(payment.cents).toBeGreaterThan(0)
        expect(Number.isInteger(payment.cents)).toBe(true)
        expect(payment.from).not.toBe(payment.to)
      })
    }
  })

  it('never needs more payments than the true minimum', () => {
    const cases: number[][] = [
      [5, -5],
      [3, 3, -2, -4],
      [10, -4, -6, 7, -7],
      [1, 1, 1, -3],
      [6, 4, -3, -3, -4],
      [8, -2, -2, -2, -2],
      [9, 1, -4, -3, -3],
    ]

    for (const amounts of cases) {
      const balances = amounts.map((cents, index) => ({ userId: `u${index}`, cents }))
      expect(sum(balances)).toBe(0)
      expect(simplifyDebts(balances)).toHaveLength(fewestPayments(balances))
    }
  })

  it('is deterministic', () => {
    const balances: Balance[] = [
      { userId: 'b', cents: 100 },
      { userId: 'a', cents: 100 },
      { userId: 'd', cents: -100 },
      { userId: 'c', cents: -100 },
    ]

    expect(simplifyDebts(balances)).toEqual(simplifyDebts([...balances].reverse()))
  })

  it('falls back to a greedy match for a big group while still settling everyone', () => {
    const balances: Balance[] = []
    for (let i = 0; i < 12; i++) {
      balances.push({ userId: `creditor-${String(i).padStart(2, '0')}`, cents: 100 + i })
      balances.push({ userId: `debtor-${String(i).padStart(2, '0')}`, cents: -(100 + ((i + 5) % 12)) })
    }
    expect(sum(balances)).toBe(0)

    const settlements = simplifyDebts(balances)

    Object.values(remainingAfter(balances, settlements)).forEach((left) => expect(left).toBe(0))
    expect(settlements.length).toBeLessThanOrEqual(balances.length - 1)
  })
})
