'use client'

/**
 * @file app/trips/[id]/expenses.tsx
 * @brief Shared expenses of the trip: members log what they paid, choose who shares it and see each share (US-5.1).
 */

import { useState, useTransition } from 'react'
import { deleteExpense, saveExpense } from '@/app/trips/actions/expenses'
import {
  MAX_DESCRIPTION_LENGTH,
  canManageExpense,
  formatCents,
  type Expense,
} from '@/utils/expenses'

interface ExpenseMember {
  user_id: string
  display_name: string
}

interface ExpensesProps {
  tripId: string
  members: ExpenseMember[]
  expenses: Expense[]
  currentUserId: string
  isOrganizer: boolean
}

interface FormState {
  description: string
  amount: string
  paidBy: string
  participants: string[]
}

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 [color-scheme:light] outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100'

/**
 * @brief Formats the creation date of an expense for display.
 * @param value ISO timestamp.
 * @return A date such as "20 Nov 2026", or an empty string when it is missing.
 */
function formatDate(value: string): string {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function emptyForm(members: ExpenseMember[], currentUserId: string): FormState {
  return {
    description: '',
    amount: '',
    paidBy: currentUserId,
    participants: members.map((member) => member.user_id),
  }
}

function formFromExpense(expense: Expense): FormState {
  return {
    description: expense.description,
    amount: (expense.amountCents / 100).toFixed(2),
    paidBy: expense.paidBy,
    participants: expense.participants.map((participant) => participant.userId),
  }
}

interface ExpenseFormProps {
  members: ExpenseMember[]
  form: FormState
  isEditing: boolean
  isPending: boolean
  error: string | null
  onChange: (form: FormState) => void
  onSubmit: () => void
  onCancel: () => void
}

function ExpenseForm({
  members,
  form,
  isEditing,
  isPending,
  error,
  onChange,
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const toggleParticipant = (userId: string) => {
    const selected = form.participants.includes(userId)
    onChange({
      ...form,
      participants: selected
        ? form.participants.filter((id) => id !== userId)
        : [...form.participants, userId],
    })
  }

  return (
    <form
      data-testid="expense-form"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="mt-6 grid gap-4 rounded-2xl bg-gray-50 p-5 sm:grid-cols-2"
    >
      <div className="sm:col-span-2">
        <label htmlFor="expense-description" className="mb-2 block text-sm font-medium text-gray-700">
          What was it for?
        </label>
        <input
          id="expense-description"
          value={form.description}
          maxLength={MAX_DESCRIPTION_LENGTH}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          placeholder="e.g. Dinner at the beach"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="expense-amount" className="mb-2 block text-sm font-medium text-gray-700">
          Amount (€)
        </label>
        <input
          id="expense-amount"
          inputMode="decimal"
          value={form.amount}
          onChange={(e) => onChange({ ...form, amount: e.target.value })}
          placeholder="0.00"
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="expense-payer" className="mb-2 block text-sm font-medium text-gray-700">
          Paid by
        </label>
        <select
          id="expense-payer"
          value={form.paidBy}
          onChange={(e) => onChange({ ...form, paidBy: e.target.value })}
          className={inputClass}
        >
          {members.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {member.display_name}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="sm:col-span-2">
        <legend className="mb-2 block text-sm font-medium text-gray-700">Shared by</legend>
        <div className="flex flex-wrap gap-2">
          {members.map((member) => (
            <label
              key={member.user_id}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-800"
            >
              <input
                type="checkbox"
                checked={form.participants.includes(member.user_id)}
                onChange={() => toggleParticipant(member.user_id)}
                className="h-4 w-4 accent-blue-700"
              />
              {member.display_name}
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="text-sm text-red-700 sm:col-span-2">
          {error}
        </p>
      )}

      <div className="flex gap-3 sm:col-span-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
        >
          {isEditing ? 'Save expense' : 'Add expense'}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-300"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

interface ExpenseItemProps {
  expense: Expense
  names: Map<string, string>
  currentUserId: string
  canManage: boolean
  isPending: boolean
  onEdit: () => void
  onDelete: () => void
}

function ExpenseItem({
  expense,
  names,
  currentUserId,
  canManage,
  isPending,
  onEdit,
  onDelete,
}: ExpenseItemProps) {
  const myShare = expense.participants.find((participant) => participant.userId === currentUserId)
  const payerName = names.get(expense.paidBy) ?? 'A former member'
  const date = formatDate(expense.createdAt)

  return (
    <li data-testid={`expense-${expense.id}`} className="py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">{expense.description}</p>
          <p className="mt-1 text-sm text-gray-500">
            Paid by {expense.paidBy === currentUserId ? 'you' : payerName}
            {date ? ` · ${date}` : ''}
          </p>
        </div>
        <p data-testid="expense-amount" className="text-lg font-bold text-gray-900">
          {formatCents(expense.amountCents)}
        </p>
      </div>

      <p data-testid="expense-my-share" className="mt-2 text-sm font-medium text-blue-800">
        {myShare ? `Your share: ${formatCents(myShare.shareCents)}` : 'You are not part of this expense'}
      </p>

      <ul className="mt-2 flex flex-wrap gap-2">
        {expense.participants.map((participant) => (
          <li
            key={participant.userId}
            className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
          >
            {names.get(participant.userId) ?? 'A former member'} · {formatCents(participant.shareCents)}
          </li>
        ))}
      </ul>

      {canManage && (
        <div className="mt-3 flex gap-4">
          <button
            type="button"
            data-testid={`edit-expense-${expense.id}`}
            onClick={onEdit}
            className="text-sm font-semibold text-blue-700 transition hover:text-blue-900"
          >
            Edit
          </button>
          <button
            type="button"
            data-testid={`delete-expense-${expense.id}`}
            disabled={isPending}
            onClick={onDelete}
            className="text-sm font-semibold text-red-700 transition hover:text-red-900 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      )}
    </li>
  )
}

/**
 * @brief Expenses section of the trip workspace: logging form plus the list of expenses with every share.
 * @param props Component properties.
 */
export function Expenses({ tripId, members, expenses, currentUserId, isOrganizer }: ExpensesProps) {
  const [form, setForm] = useState<FormState>(() => emptyForm(members, currentUserId))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const names = new Map(members.map((member) => [member.user_id, member.display_name]))

  const reset = () => {
    setForm(emptyForm(members, currentUserId))
    setEditingId(null)
    setError(null)
  }

  const handleSubmit = () => {
    setError(null)
    startTransition(async () => {
      const result = await saveExpense(tripId, form, editingId ?? undefined)
      if (result.error) {
        setError(result.error)
        return
      }
      reset()
    })
  }

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id)
    setForm(formFromExpense(expense))
    setError(null)
  }

  const handleDelete = (expense: Expense) => {
    if (!window.confirm(`Delete the expense "${expense.description}"?`)) return

    setError(null)
    startTransition(async () => {
      const result = await deleteExpense(tripId, expense.id)
      if (result.error) {
        setError(result.error)
        return
      }
      if (editingId === expense.id) reset()
    })
  }

  return (
    <section data-testid="expenses-section" className="mt-8 rounded-3xl bg-white p-7 shadow-sm sm:p-8">
      <h2 className="text-xl font-bold text-gray-900">Expenses</h2>
      <p className="mt-1 text-sm text-gray-500">
        Log what you paid and who shares it. Every expense is split equally between the people it is shared by.
      </p>

      <ExpenseForm
        members={members}
        form={form}
        isEditing={editingId !== null}
        isPending={isPending}
        error={error}
        onChange={setForm}
        onSubmit={handleSubmit}
        onCancel={reset}
      />

      {expenses.length === 0 ? (
        <p data-testid="expenses-empty" className="mt-6 text-sm text-gray-500">
          No expenses yet. Add the first one above.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-gray-100">
          {expenses.map((expense) => (
            <ExpenseItem
              key={expense.id}
              expense={expense}
              names={names}
              currentUserId={currentUserId}
              canManage={canManageExpense(expense, currentUserId, isOrganizer)}
              isPending={isPending}
              onEdit={() => handleEdit(expense)}
              onDelete={() => handleDelete(expense)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
