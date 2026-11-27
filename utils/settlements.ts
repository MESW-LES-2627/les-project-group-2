/**
 * @file utils/settlements.ts
 * @brief Net balances and the smallest list of payments that settles them (US-5.2).
 *
 * All amounts are integer cents, so nothing is ever rounded and the balances of a trip always add up to zero.
 */

import type { Expense } from '@/utils/expenses'

/**
 * @brief The net balance of a member. Positive means the member is owed money, negative means they owe it.
 */
export interface Balance {
  userId: string
  cents: number
}

/**
 * @brief A payment that settles part of the debts: `from` pays `to` the given amount.
 */
export interface Settlement {
  from: string
  to: string
  cents: number
}

/** Up to this many members with a non-zero balance the smallest list of payments is found exactly. */
const EXACT_LIMIT = 18

/**
 * @brief Computes what every person is owed (positive) or owes (negative) after all the expenses.
 * The payer is credited with the whole amount and every participant is debited with their share.
 * @param expenses The expenses of the trip.
 * @return The balance of everyone that appears in an expense, largest first. They add up to zero.
 */
export function computeBalances(expenses: Expense[]): Balance[] {
  const totals = new Map<string, number>()
  const add = (userId: string, cents: number) => totals.set(userId, (totals.get(userId) ?? 0) + cents)

  for (const expense of expenses) {
    add(expense.paidBy, expense.amountCents)
    for (const participant of expense.participants) {
      add(participant.userId, -participant.shareCents)
    }
  }

  return [...totals.entries()]
    .map(([userId, cents]) => ({ userId, cents }))
    .sort((a, b) => b.cents - a.cents || a.userId.localeCompare(b.userId))
}

/**
 * @brief Pays off a group of balances that add up to zero, always matching the biggest debtor with the
 * biggest creditor. A group with no smaller group inside it needs one payment less than its size.
 */
function settleGroup(group: Balance[]): Settlement[] {
  const creditors = group.filter((b) => b.cents > 0).map((b) => ({ ...b }))
  const debtors = group.filter((b) => b.cents < 0).map((b) => ({ userId: b.userId, cents: -b.cents }))
  const bySize = (a: Balance, b: Balance) => b.cents - a.cents || a.userId.localeCompare(b.userId)
  const settlements: Settlement[] = []

  while (creditors.length > 0 && debtors.length > 0) {
    creditors.sort(bySize)
    debtors.sort(bySize)
    const creditor = creditors[0]
    const debtor = debtors[0]
    const cents = Math.min(creditor.cents, debtor.cents)

    settlements.push({ from: debtor.userId, to: creditor.userId, cents })
    creditor.cents -= cents
    debtor.cents -= cents
    if (creditor.cents === 0) creditors.shift()
    if (debtor.cents === 0) debtors.shift()
  }

  return settlements
}

/**
 * @brief Splits the people into the largest number of groups whose balances add up to zero inside each group.
 * Every group can then be settled on its own, with one payment less than its size, which is the fewest possible.
 */
function splitIntoZeroSumGroups(balances: Balance[]): Balance[][] {
  const count = balances.length
  const full = (1 << count) - 1
  const sums = new Float64Array(full + 1)
  const groups = new Int16Array(full + 1)
  const last = new Int8Array(full + 1)

  for (let mask = 1; mask <= full; mask++) {
    const lowest = Math.clz32(mask & -mask) ^ 31
    sums[mask] = sums[mask & (mask - 1)] + balances[lowest].cents

    // Order the people so that as many prefixes as possible add up to zero.
    let best = -1
    for (let i = 0; i < count; i++) {
      if (!(mask & (1 << i)) || groups[mask ^ (1 << i)] <= best) continue
      best = groups[mask ^ (1 << i)]
      last[mask] = i
    }
    groups[mask] = best + (sums[mask] === 0 ? 1 : 0)
  }

  const order: number[] = []
  for (let mask = full; mask > 0; mask ^= 1 << last[mask]) order.push(last[mask])
  order.reverse()

  const result: Balance[][] = []
  let current: Balance[] = []
  let running = 0
  for (const index of order) {
    current.push(balances[index])
    running += balances[index].cents
    if (running === 0) {
      result.push(current)
      current = []
    }
  }
  return result
}

/**
 * @brief Finds the smallest list of payments that settles every debt.
 * Up to 18 people with a balance it is the exact minimum. Beyond that it falls back to matching the
 * biggest debtor with the biggest creditor, which needs at most one payment less than the people involved.
 * @param balances The net balances of the members. They must add up to zero.
 * @return The payments, largest first.
 */
export function simplifyDebts(balances: Balance[]): Settlement[] {
  const open = balances
    .filter((balance) => balance.cents !== 0)
    .sort((a, b) => b.cents - a.cents || a.userId.localeCompare(b.userId))

  const groups = open.length <= EXACT_LIMIT ? splitIntoZeroSumGroups(open) : [open]

  return groups
    .flatMap(settleGroup)
    .sort((a, b) => b.cents - a.cents || a.from.localeCompare(b.from) || a.to.localeCompare(b.to))
}
