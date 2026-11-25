/**
 * @file tests/expenses-actions.test.ts
 * @brief Unit tests for the saveExpense and deleteExpense server actions.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteExpense, saveExpense } from '@/app/trips/actions/expenses'
import * as cache from 'next/cache'
import * as supabaseServer from '@/utils/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
}))

const input = {
  description: '  Dinner  ',
  amount: '30,00',
  paidBy: 'ana',
  participants: ['ana', 'bruno'],
}

describe('expense server actions', () => {
  let getUser: ReturnType<typeof vi.fn>
  let rpc: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'ana' } }, error: null })
    rpc = vi.fn().mockResolvedValue({ data: 'expense-1', error: null })

    vi.mocked(supabaseServer.createClient).mockResolvedValue({
      auth: { getUser },
      rpc,
    } as unknown as SupabaseClient)
  })

  describe('saveExpense', () => {
    it('requires a trip', async () => {
      await expect(saveExpense('', input)).resolves.toEqual({ error: 'Trip ID is required.' })
    })

    it('validates the values before calling the database', async () => {
      await expect(saveExpense('trip-1', { ...input, amount: '0' })).resolves.toEqual({
        error: 'Enter an amount greater than zero, with at most two decimals.',
      })
      await expect(saveExpense('trip-1', { ...input, participants: [] })).resolves.toEqual({
        error: 'Choose at least one participant.',
      })
      expect(rpc).not.toHaveBeenCalled()
    })

    it('rejects unauthenticated callers', async () => {
      getUser.mockResolvedValue({ data: { user: null }, error: null })

      await expect(saveExpense('trip-1', input)).resolves.toEqual({
        error: 'Authentication required.',
      })
      expect(rpc).not.toHaveBeenCalled()
    })

    it('logs a new expense with the amount in cents', async () => {
      const result = await saveExpense('trip-1', input)

      expect(rpc).toHaveBeenCalledWith('save_trip_expense', {
        p_trip_id: 'trip-1',
        p_expense_id: null,
        p_description: 'Dinner',
        p_amount_cents: 3000,
        p_paid_by: 'ana',
        p_participants: ['ana', 'bruno'],
      })
      expect(result).toEqual({ success: true })
      expect(cache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1')
    })

    it('edits an existing expense', async () => {
      await saveExpense('trip-1', input, 'expense-9')

      expect(rpc).toHaveBeenCalledWith(
        'save_trip_expense',
        expect.objectContaining({ p_expense_id: 'expense-9' })
      )
    })

    it('shows the messages raised by the database', async () => {
      rpc.mockResolvedValue({
        data: null,
        error: { code: 'P0001', message: 'Only the payer or the organizer can edit this expense.' },
      })

      await expect(saveExpense('trip-1', input, 'expense-9')).resolves.toEqual({
        error: 'Only the payer or the organizer can edit this expense.',
      })
      expect(cache.revalidatePath).not.toHaveBeenCalled()
    })

    it('hides unexpected database errors', async () => {
      rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied' } })

      await expect(saveExpense('trip-1', input)).resolves.toEqual({
        error: 'Failed to save the expense.',
      })
    })
  })

  describe('deleteExpense', () => {
    it('requires a trip and an expense', async () => {
      await expect(deleteExpense('', 'expense-1')).resolves.toEqual({
        error: 'Trip ID and expense ID are required.',
      })
      await expect(deleteExpense('trip-1', '')).resolves.toEqual({
        error: 'Trip ID and expense ID are required.',
      })
    })

    it('rejects unauthenticated callers', async () => {
      getUser.mockResolvedValue({ data: { user: null }, error: null })

      await expect(deleteExpense('trip-1', 'expense-1')).resolves.toEqual({
        error: 'Authentication required.',
      })
    })

    it('deletes the expense and refreshes the trip page', async () => {
      const result = await deleteExpense('trip-1', 'expense-1')

      expect(rpc).toHaveBeenCalledWith('delete_trip_expense', { p_expense_id: 'expense-1' })
      expect(result).toEqual({ success: true })
      expect(cache.revalidatePath).toHaveBeenCalledWith('/trips/trip-1')
    })

    it('shows the messages raised by the database', async () => {
      rpc.mockResolvedValue({
        data: null,
        error: { code: 'P0001', message: 'Only the payer or the organizer can delete this expense.' },
      })

      await expect(deleteExpense('trip-1', 'expense-1')).resolves.toEqual({
        error: 'Only the payer or the organizer can delete this expense.',
      })
    })

    it('hides unexpected database errors', async () => {
      rpc.mockResolvedValue({ data: null, error: { code: 'XX000', message: 'boom' } })

      await expect(deleteExpense('trip-1', 'expense-1')).resolves.toEqual({
        error: 'Failed to delete the expense.',
      })
    })
  })
})
