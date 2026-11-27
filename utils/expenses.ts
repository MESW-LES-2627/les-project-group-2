/**
 * @file utils/expenses.ts
 * @brief Pure helpers for shared trip expenses (US-5.1): amount parsing, equal splitting and validation.
 */

/** Smallest amount, in cents, of an expense. */
export const MIN_EXPENSE_CENTS = 1

/** Largest amount, in cents, of an expense (1,000,000.00). */
export const MAX_EXPENSE_CENTS = 100_000_000

/** Longest description of an expense. */
export const MAX_DESCRIPTION_LENGTH = 200

/**
 * @brief An expense of a trip with what each participant owes.
 */
export interface Expense {
  id: string
  description: string
  amountCents: number
  paidBy: string
  createdAt: string
  participants: Array<{ userId: string; shareCents: number }>
}

/**
 * @brief Database shape of an expense with its nested participants.
 */
export interface ExpenseRow {
  id: string
  description: string
  amount_cents: number
  paid_by: string
  created_at?: string | null
  trip_expense_participants?: Array<{ user_id: string; share_cents: number }> | null
}

/**
 * @brief The values collected by the expense form, before validation.
 */
export interface ExpenseInput {
  description: string
  amount: string
  paidBy: string
  participants: string[]
}

/**
 * @brief Expense values that passed validation, ready to be saved.
 */
export interface ValidExpense {
  description: string
  amountCents: number
  paidBy: string
  participants: string[]
}

/**
 * @brief Converts the amount typed by a member (e.g. "12.5" or "12,50") to cents.
 * @param input The text of the amount field.
 * @return The amount in cents, or null when it is not a positive amount with at most two decimals.
 */
export function parseAmountToCents(input: string): number | null {
  const text = input.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null

  const [euros, cents = ''] = text.split('.')
  const total = Number(euros) * 100 + Number(cents.padEnd(2, '0'))
  return Number.isSafeInteger(total) ? total : null
}

/**
 * @brief Formats an amount in cents as euros, e.g. 1250 becomes "€12.50".
 * @param cents The amount in cents.
 * @return The formatted amount.
 */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? '-' : ''
  const absolute = Math.abs(cents)
  const euros = Math.floor(absolute / 100)
  const rest = String(absolute % 100).padStart(2, '0')
  return `${sign}€${euros.toLocaleString('en-GB')}.${rest}`
}

/**
 * @brief Splits an amount equally between the participants. Cents that do not divide evenly go to the
 * first participants in alphabetical order of their ids, exactly as the database does.
 * @param amountCents The amount to split.
 * @param participants The ids of the participants.
 * @return The share of every participant. The shares add up to the amount.
 */
export function splitEqually(
  amountCents: number,
  participants: string[]
): Array<{ userId: string; shareCents: number }> {
  const ids = [...new Set(participants)].sort()
  if (ids.length === 0) return []

  const base = Math.floor(amountCents / ids.length)
  const remainder = amountCents % ids.length
  return ids.map((userId, index) => ({
    userId,
    shareCents: base + (index < remainder ? 1 : 0),
  }))
}

/**
 * @brief Validates the values of the expense form.
 * @param input The values typed by the member.
 * @return The cleaned expense, or an error message to show to the member.
 */
export function validateExpense(input: ExpenseInput): { expense: ValidExpense } | { error: string } {
  const description = input.description.trim()
  if (!description) return { error: 'Describe what the expense was for.' }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return { error: `The description can have at most ${MAX_DESCRIPTION_LENGTH} characters.` }
  }

  const amountCents = parseAmountToCents(input.amount)
  if (amountCents === null || amountCents < MIN_EXPENSE_CENTS) {
    return { error: 'Enter an amount greater than zero, with at most two decimals.' }
  }
  if (amountCents > MAX_EXPENSE_CENTS) {
    return { error: `The amount can be at most ${formatCents(MAX_EXPENSE_CENTS)}.` }
  }

  if (!input.paidBy) return { error: 'Choose who paid.' }

  const participants = [...new Set(input.participants)]
  if (participants.length === 0) return { error: 'Choose at least one participant.' }

  return { expense: { description, amountCents, paidBy: input.paidBy, participants } }
}

/**
 * @brief Maps the expense rows of the database to the client model, newest first.
 * @param rows Expense rows with their nested participants.
 * @return The expenses.
 */
export function mapExpenseRows(rows: ExpenseRow[]): Expense[] {
  return rows
    .map((row) => ({
      id: row.id,
      description: row.description,
      amountCents: row.amount_cents,
      paidBy: row.paid_by,
      createdAt: row.created_at ?? '',
      participants: (row.trip_expense_participants ?? []).map((participant) => ({
        userId: participant.user_id,
        shareCents: participant.share_cents,
      })),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/**
 * @brief Checks whether a member can edit or delete an expense: its payer or the trip organizer.
 * @param expense The expense.
 * @param userId The current user.
 * @param isOrganizer Whether the current user is the trip organizer.
 * @return True when the member may edit or delete it.
 */
export function canManageExpense(expense: Expense, userId: string, isOrganizer: boolean): boolean {
  return isOrganizer || expense.paidBy === userId
}
