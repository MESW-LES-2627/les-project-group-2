'use server'

/**
 * @file app/trips/actions/expenses.ts
 * @brief Server actions for logging, editing and deleting shared expenses (US-5.1).
 */

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { validateExpense, type ExpenseInput } from '@/utils/expenses'

export type ExpenseResult = {
  success?: boolean
  error?: string
}

/** Postgres code raised by the `raise exception` statements of the expense functions. */
const RAISED_EXCEPTION = 'P0001'

/**
 * @brief Checks that the caller is authenticated.
 * @return The Supabase client on success, or an error message.
 */
async function authenticate() {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Authentication required.' }
  }

  return { supabase }
}

/**
 * @brief Logs a new expense, or edits an existing one, and splits it equally between the participants.
 * Only the payer or the trip organizer can edit an expense.
 * @param tripId The unique identifier of the trip.
 * @param input The description, amount (e.g. "12.50"), payer and participants.
 * @param expenseId The expense to edit. Omit it to log a new expense.
 * @return ExpenseResult with success flag or an error message.
 */
export async function saveExpense(
  tripId: string,
  input: ExpenseInput,
  expenseId?: string
): Promise<ExpenseResult> {
  if (!tripId) {
    return { error: 'Trip ID is required.' }
  }

  const validation = validateExpense(input)
  if ('error' in validation) {
    return { error: validation.error }
  }

  const auth = await authenticate()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const { expense } = validation
  const { error } = await auth.supabase.rpc('save_trip_expense', {
    p_trip_id: tripId,
    p_expense_id: expenseId ?? null,
    p_description: expense.description,
    p_amount_cents: expense.amountCents,
    p_paid_by: expense.paidBy,
    p_participants: expense.participants,
  })

  if (error) {
    console.error('Error saving expense:', error)
    return {
      error: error.code === RAISED_EXCEPTION ? error.message : 'Failed to save the expense.',
    }
  }

  revalidatePath(`/trips/${tripId}`)
  return { success: true }
}

/**
 * @brief Deletes an expense and its shares. Only the payer or the trip organizer can do it.
 * @param tripId The unique identifier of the trip.
 * @param expenseId The expense to delete.
 * @return ExpenseResult with success flag or an error message.
 */
export async function deleteExpense(tripId: string, expenseId: string): Promise<ExpenseResult> {
  if (!tripId || !expenseId) {
    return { error: 'Trip ID and expense ID are required.' }
  }

  const auth = await authenticate()
  if ('error' in auth) {
    return { error: auth.error }
  }

  const { error } = await auth.supabase.rpc('delete_trip_expense', { p_expense_id: expenseId })

  if (error) {
    console.error('Error deleting expense:', error)
    return {
      error: error.code === RAISED_EXCEPTION ? error.message : 'Failed to delete the expense.',
    }
  }

  revalidatePath(`/trips/${tripId}`)
  return { success: true }
}
