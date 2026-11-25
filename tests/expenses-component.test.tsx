/**
 * @file tests/expenses-component.test.tsx
 * @brief Unit tests for the Expenses component.
 */

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Expenses } from '@/app/trips/[id]/expenses'
import * as actions from '@/app/trips/actions/expenses'
import type { Expense } from '@/utils/expenses'

vi.mock('@/app/trips/actions/expenses', () => ({
  saveExpense: vi.fn(),
  deleteExpense: vi.fn(),
}))

const members = [
  { user_id: 'ana', display_name: 'Ana' },
  { user_id: 'bruno', display_name: 'Bruno' },
  { user_id: 'carla', display_name: 'Carla' },
]

const dinner: Expense = {
  id: 'e1',
  description: 'Dinner at the beach',
  amountCents: 3000,
  paidBy: 'bruno',
  createdAt: '2026-11-20T20:00:00Z',
  participants: [
    { userId: 'ana', shareCents: 1000 },
    { userId: 'bruno', shareCents: 1000 },
    { userId: 'carla', shareCents: 1000 },
  ],
}

const taxi: Expense = {
  id: 'e2',
  description: 'Taxi',
  amountCents: 1001,
  paidBy: 'ana',
  createdAt: '2026-11-19T20:00:00Z',
  participants: [
    { userId: 'ana', shareCents: 501 },
    { userId: 'bruno', shareCents: 500 },
  ],
}

function renderExpenses(props: Partial<React.ComponentProps<typeof Expenses>> = {}) {
  return render(
    <Expenses
      tripId="trip-1"
      members={members}
      expenses={[dinner, taxi]}
      currentUserId="ana"
      isOrganizer={false}
      {...props}
    />
  )
}

const description = () => screen.getByLabelText('What was it for?') as HTMLInputElement
const amount = () => screen.getByLabelText('Amount (€)') as HTMLInputElement
const payer = () => screen.getByLabelText('Paid by') as HTMLSelectElement
const checkbox = (name: string) => screen.getByRole('checkbox', { name }) as HTMLInputElement

describe('Expenses', () => {
  beforeEach(() => {
    vi.mocked(actions.saveExpense).mockResolvedValue({ success: true })
    vi.mocked(actions.deleteExpense).mockResolvedValue({ success: true })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('shares an expense with every member by default and pre-selects the current user as payer', () => {
    renderExpenses()

    expect(payer().value).toBe('ana')
    expect(checkbox('Ana').checked).toBe(true)
    expect(checkbox('Bruno').checked).toBe(true)
    expect(checkbox('Carla').checked).toBe(true)
  })

  it('saves an expense with the typed values', async () => {
    renderExpenses()

    fireEvent.change(description(), { target: { value: 'Groceries' } })
    fireEvent.change(amount(), { target: { value: '45,90' } })
    fireEvent.change(payer(), { target: { value: 'carla' } })
    fireEvent.click(checkbox('Bruno'))
    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }))

    await waitFor(() =>
      expect(actions.saveExpense).toHaveBeenCalledWith(
        'trip-1',
        {
          description: 'Groceries',
          amount: '45,90',
          paidBy: 'carla',
          participants: ['ana', 'carla'],
        },
        undefined
      )
    )
  })

  it('clears the form after saving', async () => {
    renderExpenses()

    fireEvent.change(description(), { target: { value: 'Groceries' } })
    fireEvent.change(amount(), { target: { value: '10' } })
    fireEvent.click(checkbox('Carla'))
    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }))

    await waitFor(() => expect(description().value).toBe(''))
    expect(amount().value).toBe('')
    expect(checkbox('Carla').checked).toBe(true)
  })

  it('shows the error and keeps the values when saving fails', async () => {
    vi.mocked(actions.saveExpense).mockResolvedValue({
      error: 'Enter an amount greater than zero, with at most two decimals.',
    })
    renderExpenses()

    fireEvent.change(description(), { target: { value: 'Groceries' } })
    fireEvent.change(amount(), { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add expense' }))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Enter an amount greater than zero, with at most two decimals.'
    )
    expect(description().value).toBe('Groceries')
  })

  it('lists each expense with its amount, payer and the share of every participant', () => {
    renderExpenses()

    const item = screen.getByTestId('expense-e1')
    expect(item.textContent).toContain('Dinner at the beach')
    expect(item.textContent).toContain('€30.00')
    expect(item.textContent).toContain('Paid by Bruno')
    expect(item.textContent).toContain('20 Nov 2026')
    expect(item.textContent).toContain('Ana · €10.00')
    expect(item.textContent).toContain('Carla · €10.00')
  })

  it('shows the share of the current user', () => {
    renderExpenses()

    expect(within(screen.getByTestId('expense-e1')).getByTestId('expense-my-share').textContent).toBe(
      'Your share: €10.00'
    )
    expect(within(screen.getByTestId('expense-e2')).getByTestId('expense-my-share').textContent).toBe(
      'Your share: €5.01'
    )
  })

  it('says when the current user is not part of an expense and names unknown members', () => {
    renderExpenses({
      currentUserId: 'carla',
      expenses: [{ ...taxi, paidBy: 'gone', participants: [...taxi.participants, { userId: 'gone', shareCents: 0 }] }],
    })

    const item = screen.getByTestId('expense-e2')
    expect(within(item).getByTestId('expense-my-share').textContent).toBe(
      'You are not part of this expense'
    )
    expect(item.textContent).toContain('Paid by A former member')
  })

  it('says "you" when the current user paid', () => {
    renderExpenses()

    expect(screen.getByTestId('expense-e2').textContent).toContain('Paid by you')
  })

  it('invites the group to add the first expense', () => {
    renderExpenses({ expenses: [] })

    expect(screen.getByTestId('expenses-empty').textContent).toContain('No expenses yet')
  })

  it('lets the payer edit and delete, but not other members', () => {
    renderExpenses()

    expect(screen.getByTestId('edit-expense-e2')).toBeTruthy()
    expect(screen.getByTestId('delete-expense-e2')).toBeTruthy()
    expect(screen.queryByTestId('edit-expense-e1')).toBeNull()
    expect(screen.queryByTestId('delete-expense-e1')).toBeNull()
  })

  it('lets the organizer edit and delete every expense', () => {
    renderExpenses({ isOrganizer: true })

    expect(screen.getByTestId('edit-expense-e1')).toBeTruthy()
    expect(screen.getByTestId('delete-expense-e1')).toBeTruthy()
  })

  it('edits an expense through the same form', async () => {
    renderExpenses()

    fireEvent.click(screen.getByTestId('edit-expense-e2'))

    expect(description().value).toBe('Taxi')
    expect(amount().value).toBe('10.01')
    expect(checkbox('Carla').checked).toBe(false)
    expect(checkbox('Bruno').checked).toBe(true)

    fireEvent.change(amount(), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save expense' }))

    await waitFor(() =>
      expect(actions.saveExpense).toHaveBeenCalledWith(
        'trip-1',
        { description: 'Taxi', amount: '12', paidBy: 'ana', participants: ['ana', 'bruno'] },
        'e2'
      )
    )
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add expense' })).toBeTruthy())
  })

  it('cancels an edit', () => {
    renderExpenses()

    fireEvent.click(screen.getByTestId('edit-expense-e2'))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(description().value).toBe('')
    expect(screen.getByRole('button', { name: 'Add expense' })).toBeTruthy()
  })

  it('asks for confirmation and deletes an expense', async () => {
    renderExpenses()

    fireEvent.click(screen.getByTestId('delete-expense-e2'))

    expect(window.confirm).toHaveBeenCalledWith('Delete the expense "Taxi"?')
    await waitFor(() => expect(actions.deleteExpense).toHaveBeenCalledWith('trip-1', 'e2'))
  })

  it('does not delete when the member cancels the confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderExpenses()

    fireEvent.click(screen.getByTestId('delete-expense-e2'))

    expect(actions.deleteExpense).not.toHaveBeenCalled()
  })

  it('shows the error when deleting fails', async () => {
    vi.mocked(actions.deleteExpense).mockResolvedValue({
      error: 'Only the payer or the organizer can delete this expense.',
    })
    renderExpenses()

    fireEvent.click(screen.getByTestId('delete-expense-e2'))

    expect((await screen.findByRole('alert')).textContent).toBe(
      'Only the payer or the organizer can delete this expense.'
    )
  })

  it('leaves edit mode when the expense being edited is deleted', async () => {
    renderExpenses()

    fireEvent.click(screen.getByTestId('edit-expense-e2'))
    fireEvent.click(screen.getByTestId('delete-expense-e2'))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Add expense' })).toBeTruthy())
    expect(description().value).toBe('')
  })
})
