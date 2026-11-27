/**
 * @file tests/balances-component.test.tsx
 * @brief Unit tests for the Balances component.
 */

import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { Balances } from '@/app/trips/[id]/balances'
import { splitEqually, type Expense } from '@/utils/expenses'

const members = [
  { user_id: 'ana', display_name: 'Ana' },
  { user_id: 'bruno', display_name: 'Bruno' },
  { user_id: 'carla', display_name: 'Carla' },
]

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

function renderBalances(props: Partial<React.ComponentProps<typeof Balances>> = {}) {
  return render(
    <Balances
      members={members}
      expenses={[expense('dinner', 3000, 'ana', ['ana', 'bruno', 'carla'])]}
      currentUserId="ana"
      {...props}
    />
  )
}

const balanceOf = (userId: string) => screen.getByTestId(`balance-${userId}`).textContent

describe('Balances', () => {
  afterEach(() => {
    cleanup()
  })

  it('invites the group to add an expense when there are none', () => {
    renderBalances({ expenses: [] })

    expect(screen.getByTestId('balances-empty').textContent).toBe('Add an expense to see who owes whom.')
    expect(screen.queryByTestId('settlement')).toBeNull()
  })

  it('shows the net balance of every member', () => {
    renderBalances({ currentUserId: 'bruno' })

    expect(balanceOf('ana')).toBe('Anais owed €20.00')
    expect(balanceOf('bruno')).toBe('Youowe €10.00')
    expect(balanceOf('carla')).toBe('Carlaowes €10.00')
  })

  it('uses the second person for the current user', () => {
    renderBalances({ currentUserId: 'ana' })

    expect(balanceOf('ana')).toBe('Youare owed €20.00')
  })

  it('lists members without expenses as settled up', () => {
    renderBalances({ expenses: [expense('coffee', 250, 'ana', ['ana', 'bruno'])] })

    expect(balanceOf('carla')).toBe('Carlais settled up')
  })

  it('shows the payments that settle everything', () => {
    renderBalances({ currentUserId: 'bruno' })

    const payments = screen.getAllByTestId('settlement').map((item) => item.textContent)
    expect(payments).toEqual(['You pay Ana€10.00', 'Carla pays Ana€10.00'])
  })

  it('says "pays you" when the current user receives the payment', () => {
    renderBalances({ currentUserId: 'ana' })

    expect(screen.getAllByTestId('settlement').map((item) => item.textContent)).toEqual([
      'Bruno pays you€10.00',
      'Carla pays you€10.00',
    ])
  })

  it('says everyone is settled up when the balances are all zero', () => {
    renderBalances({ expenses: [expense('coffee', 250, 'ana', ['ana'])] })

    expect(screen.getByTestId('settlements-empty').textContent).toBe('Everyone is settled up.')
    expect(balanceOf('ana')).toBe('Youare settled up')
  })

  it('recalculates when the expenses change', () => {
    const { rerender } = renderBalances()
    expect(screen.getAllByTestId('settlement')).toHaveLength(2)

    rerender(
      <Balances
        members={members}
        expenses={[
          expense('dinner', 3000, 'ana', ['ana', 'bruno', 'carla']),
          expense('refund', 1000, 'bruno', ['ana']),
          expense('refund-carla', 1000, 'carla', ['ana']),
        ]}
        currentUserId="ana"
      />
    )

    // Bruno and Carla paid Ana's part back, so every balance is back to zero.
    expect(balanceOf('ana')).toBe('Youare settled up')
    expect(balanceOf('bruno')).toBe('Brunois settled up')
    expect(within(screen.getByTestId('balances-section')).queryAllByTestId('settlement')).toHaveLength(0)
    expect(screen.getByTestId('settlements-empty')).toBeTruthy()
  })

  it('keeps the balance of someone who left the trip so the total still adds up', () => {
    renderBalances({
      members: members.slice(0, 2),
      expenses: [expense('dinner', 3000, 'ana', ['ana', 'bruno', 'carla'])],
    })

    expect(balanceOf('carla')).toBe('A former memberowes €10.00')
    expect(screen.getAllByTestId('settlement').map((item) => item.textContent)).toContain(
      'A former member pays you€10.00'
    )
  })
})
