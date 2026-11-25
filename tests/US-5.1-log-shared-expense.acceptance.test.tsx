/**
 * @file tests/US-5.1-log-shared-expense.acceptance.test.tsx
 * @brief Acceptance tests for US-5.1: Log a Shared Expense.
 *
 * The component and the server actions are the real ones. The database functions are replaced by an
 * in-memory fake that follows the same rules (equal split, only the payer or the organizer can edit),
 * and revalidatePath re-renders the section with the stored expenses, like the trip page does.
 */

import React, { useEffect, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, configure, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Expenses } from '@/app/trips/[id]/expenses'
import { mapExpenseRows, splitEqually, type ExpenseRow } from '@/utils/expenses'

const store = vi.hoisted(() => ({
  rows: [] as ExpenseRow[],
  currentUser: 'ana',
  organizer: 'org',
  refresh: null as (() => void) | null,
  nextId: 1,
}))

vi.mock('next/cache', () => ({
  revalidatePath: () => store.refresh?.(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: store.currentUser } }, error: null }),
    },
    rpc: async (name: string, args: Record<string, unknown>) => {
      const fail = (message: string) => ({ data: null, error: { code: 'P0001', message } })
      const canManage = (paidBy: string) => paidBy === store.currentUser || store.currentUser === store.organizer

      if (name === 'save_trip_expense') {
        const existing = store.rows.find((row) => row.id === args.p_expense_id)
        if (args.p_expense_id && !existing) return fail('The expense does not exist.')
        if (existing && !canManage(existing.paid_by)) {
          return fail('Only the payer or the organizer can edit this expense.')
        }

        const values = {
          description: args.p_description as string,
          amount_cents: args.p_amount_cents as number,
          paid_by: args.p_paid_by as string,
          trip_expense_participants: splitEqually(
            args.p_amount_cents as number,
            args.p_participants as string[]
          ).map((share) => ({ user_id: share.userId, share_cents: share.shareCents })),
        }
        if (existing) Object.assign(existing, values)
        else {
          store.rows.push({
            id: `expense-${store.nextId++}`,
            created_at: new Date(2026, 10, 20, 10, store.nextId).toISOString(),
            ...values,
          })
        }
        return { data: null, error: null }
      }

      const existing = store.rows.find((row) => row.id === args.p_expense_id)
      if (!existing) return fail('The expense does not exist.')
      if (!canManage(existing.paid_by)) return fail('Only the payer or the organizer can delete this expense.')
      store.rows = store.rows.filter((row) => row.id !== existing.id)
      return { data: null, error: null }
    },
  }),
}))

const members = [
  { user_id: 'org', display_name: 'Organizer' },
  { user_id: 'ana', display_name: 'Ana' },
  { user_id: 'bruno', display_name: 'Bruno' },
]

function Harness({ currentUserId }: { currentUserId: string }) {
  const [expenses, setExpenses] = useState(() => mapExpenseRows(store.rows))
  useEffect(() => {
    store.refresh = () => setExpenses(mapExpenseRows(store.rows))
    return () => {
      store.refresh = null
    }
  }, [])

  return (
    <Expenses
      tripId="trip-1"
      members={members}
      expenses={expenses}
      currentUserId={currentUserId}
      isOrganizer={currentUserId === store.organizer}
    />
  )
}

function renderAs(userId: string) {
  store.currentUser = userId
  return render(<Harness currentUserId={userId} />)
}

// The buttons are disabled while a previous action is still being saved.
async function clickWhenReady(testId: string) {
  const button = (await screen.findByTestId(testId)) as HTMLButtonElement
  await waitFor(() => expect(button.disabled).toBe(false))
  fireEvent.click(button)
}

function logExpense(descriptionText: string, amountText: string) {
  fireEvent.change(screen.getByLabelText('What was it for?'), { target: { value: descriptionText } })
  fireEvent.change(screen.getByLabelText('Amount (€)'), { target: { value: amountText } })
  fireEvent.click(screen.getByRole('button', { name: 'Add expense' }))
}

describe('US-5.1 Acceptance Tests: Log a Shared Expense', () => {
  beforeEach(() => {
    // Several server action round trips run per test, so give them room when the machine is busy.
    configure({ asyncUtilTimeout: 5000 })
    store.rows = []
    store.nextId = 1
    store.refresh = null
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  // AC1: Given I am in a trip, when I submit an expense with a description, an amount greater than zero,
  // the payer and the participants, then it is saved.
  it('AC1: an expense with description, amount, payer and participants is saved and listed', async () => {
    renderAs('ana')

    fireEvent.change(screen.getByLabelText('Paid by'), { target: { value: 'bruno' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Organizer' }))
    logExpense('Dinner at the beach', '30')

    const item = await screen.findByTestId('expense-expense-1')
    expect(item.textContent).toContain('Dinner at the beach')
    expect(item.textContent).toContain('€30.00')
    expect(item.textContent).toContain('Paid by Bruno')
    expect(store.rows).toHaveLength(1)
    expect(store.rows[0].paid_by).toBe('bruno')
    expect((store.rows[0].trip_expense_participants ?? []).map((p) => p.user_id).sort()).toEqual(['ana', 'bruno'])
  })

  it('AC1: an amount of zero, a missing description or no participants are not saved', async () => {
    renderAs('ana')

    logExpense('Free lunch', '0')
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Enter an amount greater than zero, with at most two decimals.'
    )

    logExpense('', '10')
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe('Describe what the expense was for.')
    )

    fireEvent.change(screen.getByLabelText('What was it for?'), { target: { value: 'Snacks' } })
    for (const name of ['Organizer', 'Ana', 'Bruno']) {
      fireEvent.click(screen.getByRole('checkbox', { name }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }))
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe('Choose at least one participant.')
    )

    expect(store.rows).toHaveLength(0)
  })

  // AC2: Given I do not change the participants, then the expense is shared by every member.
  it('AC2: without changing the participants the expense is shared by every member', async () => {
    renderAs('ana')

    logExpense('Groceries', '45.90')

    await screen.findByTestId('expense-expense-1')
    expect((store.rows[0].trip_expense_participants ?? []).map((p) => p.user_id).sort()).toEqual([
      'ana',
      'bruno',
      'org',
    ])
  })

  // AC3: Given an expense is saved, then it is split equally among the participants and each one sees their share.
  it('AC3: the expense is split equally and each participant sees their share', async () => {
    renderAs('ana')
    logExpense('Dinner', '30')

    const item = await screen.findByTestId('expense-expense-1')
    expect(item.textContent).toContain('Organizer · €10.00')
    expect(item.textContent).toContain('Ana · €10.00')
    expect(item.textContent).toContain('Bruno · €10.00')
    expect(within(item).getByTestId('expense-my-share').textContent).toBe('Your share: €10.00')

    cleanup()
    renderAs('bruno')
    expect(within(screen.getByTestId('expense-expense-1')).getByTestId('expense-my-share').textContent).toBe(
      'Your share: €10.00'
    )
  })

  it('AC3: cents that do not divide evenly are shared out so the shares add up to the amount', async () => {
    renderAs('ana')
    logExpense('Taxi', '10.01')

    const item = await screen.findByTestId('expense-expense-1')
    const shares = (store.rows[0].trip_expense_participants ?? []).map((p) => p.share_cents)
    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(1001)
    expect(Math.max(...shares) - Math.min(...shares)).toBe(1)
    expect(item.textContent).toContain('€10.01')
  })

  // AC4: Given I am the payer or the organizer, when I edit or delete the expense, then the shares are updated.
  it('AC4: the payer edits an expense and the shares are recalculated', async () => {
    renderAs('ana')
    logExpense('Dinner', '30')
    await screen.findByTestId('expense-expense-1')

    fireEvent.click(screen.getByTestId('edit-expense-expense-1'))
    fireEvent.change(screen.getByLabelText('Amount (€)'), { target: { value: '40' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Organizer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }))

    await waitFor(() =>
      expect(screen.getByTestId('expense-my-share').textContent).toBe('Your share: €20.00')
    )
    expect(screen.getByTestId('expense-expense-1').textContent).toContain('€40.00')
    expect(store.rows[0].trip_expense_participants ?? []).toHaveLength(2)
  })

  it('AC4: the payer deletes an expense and it disappears', async () => {
    renderAs('ana')
    logExpense('Dinner', '30')
    await screen.findByTestId('expense-expense-1')

    await clickWhenReady('delete-expense-expense-1')

    await waitFor(() => expect(screen.queryByTestId('expense-expense-1')).toBeNull())
    expect(store.rows).toHaveLength(0)
    expect(screen.getByTestId('expenses-empty')).toBeTruthy()
  })

  it('AC4: the organizer can edit and delete an expense paid by someone else', async () => {
    renderAs('ana')
    logExpense('Dinner', '30')
    await screen.findByTestId('expense-expense-1')
    cleanup()

    renderAs('org')
    fireEvent.click(screen.getByTestId('edit-expense-expense-1'))
    fireEvent.change(screen.getByLabelText('What was it for?'), { target: { value: 'Dinner (fixed)' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }))
    await waitFor(() =>
      expect(screen.getByTestId('expense-expense-1').textContent).toContain('Dinner (fixed)')
    )

    await clickWhenReady('delete-expense-expense-1')
    await waitFor(() => expect(screen.queryByTestId('expense-expense-1')).toBeNull())
  })

  it('AC4: another member can neither edit nor delete the expense', async () => {
    renderAs('ana')
    logExpense('Dinner', '30')
    await screen.findByTestId('expense-expense-1')
    cleanup()

    renderAs('bruno')

    expect(screen.getByTestId('expense-expense-1')).toBeTruthy()
    expect(screen.queryByTestId('edit-expense-expense-1')).toBeNull()
    expect(screen.queryByTestId('delete-expense-expense-1')).toBeNull()
  })

  it('AC4: the database refusal is shown if a member who cannot manage the expense tries anyway', async () => {
    renderAs('ana')
    logExpense('Dinner', '30')
    await screen.findByTestId('expense-expense-1')
    fireEvent.click(screen.getByTestId('edit-expense-expense-1'))

    store.currentUser = 'bruno'
    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Only the payer or the organizer can edit this expense.'
    )
  })
})
