/**
 * @file tests/US-5.2-view-simplified-debt-settlements.acceptance.test.tsx
 * @brief Acceptance tests for US-5.2: View Simplified Debt Settlements.
 *
 * The expenses and the balances view are the real ones. Adding, editing and deleting an expense is
 * simulated by changing the expenses given to the page and rendering it again, like the trip page
 * does after every change.
 */

import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { Balances } from '@/app/trips/[id]/balances'
import { Expenses } from '@/app/trips/[id]/expenses'
import { splitEqually, type Expense } from '@/utils/expenses'
import { computeBalances } from '@/utils/settlements'

const members = [
  { user_id: 'ana', display_name: 'Ana' },
  { user_id: 'bruno', display_name: 'Bruno' },
  { user_id: 'carla', display_name: 'Carla' },
  { user_id: 'diogo', display_name: 'Diogo' },
]

function expense(id: string, amountCents: number, paidBy: string, participants: string[]): Expense {
  return {
    id,
    description: id,
    amountCents,
    paidBy,
    createdAt: '2026-11-20T10:00:00Z',
    participants: splitEqually(amountCents, participants),
  }
}

const everyone = members.map((member) => member.user_id)

function renderPage(expenses: Expense[], currentUserId = 'ana') {
  return render(
    <>
      <Expenses
        tripId="trip-1"
        members={members}
        expenses={expenses}
        currentUserId={currentUserId}
        isOrganizer={false}
      />
      <Balances members={members} expenses={expenses} currentUserId={currentUserId} />
    </>
  )
}

const balanceText = (userId: string) => screen.getByTestId(`balance-${userId}`).textContent
const payments = () => screen.queryAllByTestId('settlement').map((item) => item.textContent)

describe('US-5.2 Acceptance Tests: View Simplified Debt Settlements', () => {
  afterEach(() => {
    cleanup()
  })

  // AC1: Given the trip has expenses, when I open the balances view, then I see the net balance of every member.
  it('AC1: the balances view shows the net balance of every member', () => {
    renderPage([
      expense('dinner', 4000, 'ana', everyone),
      expense('taxi', 1200, 'bruno', ['bruno', 'carla']),
    ])

    expect(balanceText('ana')).toBe('Youare owed €30.00')
    expect(balanceText('bruno')).toBe('Brunoowes €4.00')
    expect(balanceText('carla')).toBe('Carlaowes €16.00')
    expect(balanceText('diogo')).toBe('Diogoowes €10.00')
  })

  it('AC1: the balances view invites the group to add an expense when there are none', () => {
    renderPage([])

    expect(screen.getByTestId('balances-empty')).toBeTruthy()
  })

  // AC2: Given the balances, then I see the smallest list of payments needed to settle every debt.
  it('AC2: the payments are the smallest list that settles every debt', () => {
    renderPage([
      expense('dinner', 4000, 'ana', everyone),
      expense('taxi', 1200, 'bruno', ['bruno', 'carla']),
    ])

    // Four people with a balance, no smaller group adds up to zero: three payments.
    expect(payments()).toEqual(['Carla pays you€16.00', 'Diogo pays you€10.00', 'Bruno pays you€4.00'])
  })

  it('AC2: debts that cancel out through a middle person are paid directly', () => {
    renderPage([
      expense('one', 1000, 'bruno', ['ana']),
      expense('two', 1000, 'carla', ['bruno']),
    ])

    expect(payments()).toEqual(['You pay Carla€10.00'])
  })

  it('AC2: separate groups of people are settled separately', () => {
    renderPage([
      expense('ana-bruno', 500, 'ana', ['bruno']),
      expense('carla-diogo', 300, 'carla', ['diogo']),
    ])

    expect(payments()).toEqual(['Bruno pays you€5.00', 'Diogo pays Carla€3.00'])
  })

  // AC3: Given an expense is added, edited or deleted, then the settlements are recalculated.
  it('AC3: the settlements change when an expense is added, edited or deleted', () => {
    const dinner = expense('dinner', 3000, 'ana', ['ana', 'bruno', 'carla'])
    const { rerender } = renderPage([dinner])
    expect(payments()).toEqual(['Bruno pays you€10.00', 'Carla pays you€10.00'])

    const render2 = (expenses: Expense[]) =>
      rerender(
        <>
          <Expenses tripId="trip-1" members={members} expenses={expenses} currentUserId="ana" isOrganizer={false} />
          <Balances members={members} expenses={expenses} currentUserId="ana" />
        </>
      )

    // Added: Bruno paid 6.00 for Carla.
    render2([dinner, expense('snacks', 600, 'bruno', ['carla'])])
    expect(payments()).toEqual(['Carla pays you€16.00', 'Bruno pays you€4.00'])

    // Edited: the dinner costs 60.00.
    render2([expense('dinner', 6000, 'ana', ['ana', 'bruno', 'carla'])])
    expect(payments()).toEqual(['Bruno pays you€20.00', 'Carla pays you€20.00'])

    // Deleted: nothing is left to settle.
    render2([])
    expect(payments()).toEqual([])
    expect(screen.getByTestId('balances-empty')).toBeTruthy()
  })

  // AC4: Given any set of expenses, then the amounts are rounded to cents and the balances add up to zero.
  it('AC4: amounts are whole cents and the balances add up to zero', () => {
    const expenses = [
      expense('a', 1001, 'ana', ['ana', 'bruno', 'carla']),
      expense('b', 1, 'bruno', everyone),
      expense('c', 9999, 'carla', ['ana', 'carla', 'diogo']),
      expense('d', 7, 'diogo', ['bruno', 'carla']),
    ]
    renderPage(expenses)

    const balances = computeBalances(expenses)
    expect(balances.reduce((total, balance) => total + balance.cents, 0)).toBe(0)
    balances.forEach((balance) => expect(Number.isInteger(balance.cents)).toBe(true))

    const owed = balances.filter((balance) => balance.cents > 0).reduce((total, balance) => total + balance.cents, 0)
    const amounts = screen.getAllByTestId('settlement').map((item) => {
      const match = (item.textContent ?? '').match(/€([\d,]+\.\d{2})$/)
      expect(match).not.toBeNull()
      return Number(match![1].replace(/[,.]/g, ''))
    })

    // Every payment is a whole number of cents and together they pay back exactly what is owed.
    expect(amounts.reduce((total, cents) => total + cents, 0)).toBe(owed)
  })
})
