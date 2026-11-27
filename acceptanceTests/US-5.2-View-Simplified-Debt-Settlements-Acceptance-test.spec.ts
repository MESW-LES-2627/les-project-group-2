import { test, expect } from '@playwright/test'
import { setTestSession } from './helpers'

const members = [
  { user_id: 'ana-1', email: 'ana@planit.app', display_name: 'Ana', role: 'organizer' as const },
  { user_id: 'bruno-1', email: 'bruno@planit.app', display_name: 'Bruno', role: 'member' as const },
  { user_id: 'carla-1', email: 'carla@planit.app', display_name: 'Carla', role: 'member' as const },
]

const trips = [{ id: 'trip-502', name: 'Settlement Trip', organizer_id: 'ana-1', state: 'Planning' }]

const expense = (
  id: string,
  description: string,
  amount_cents: number,
  paid_by: string,
  shares: Array<[string, number]>
) => ({
  id,
  trip_id: 'trip-502',
  description,
  amount_cents,
  paid_by,
  created_at: '2026-11-20T20:00:00Z',
  trip_expense_participants: shares.map(([user_id, share_cents]) => ({ user_id, share_cents })),
})

// Ana paid 30.00 for the three of them, and Bruno paid 12.00 for himself and Carla.
const expenses = [
  expense('dinner', 'Dinner', 3000, 'ana-1', [
    ['ana-1', 1000],
    ['bruno-1', 1000],
    ['carla-1', 1000],
  ]),
  expense('taxi', 'Taxi', 1200, 'bruno-1', [
    ['bruno-1', 600],
    ['carla-1', 600],
  ]),
]

const session = {
  user: { id: 'ana-1', email: 'ana@planit.app' },
  profile: { username: 'Ana' },
  trips,
  members,
  expenses,
}

test.describe('US-5.2: View Simplified Debt Settlements', () => {
  test('Given the trip has expenses, when I open the balances view, then I see the net balance of every member', async ({
    page,
    context,
  }) => {
    await setTestSession(context, session)
    await page.goto('/trips/trip-502')

    await expect(page.getByTestId('balances-section')).toBeVisible()
    await expect(page.getByTestId('balance-ana-1')).toContainText('You')
    await expect(page.getByTestId('balance-ana-1')).toContainText('are owed €20.00')
    await expect(page.getByTestId('balance-bruno-1')).toContainText('Bruno')
    await expect(page.getByTestId('balance-bruno-1')).toContainText('owes €4.00')
    await expect(page.getByTestId('balance-carla-1')).toContainText('owes €16.00')
  })

  test('Given the balances, then I see the smallest list of payments that settles every debt', async ({
    page,
    context,
  }) => {
    await setTestSession(context, session)
    await page.goto('/trips/trip-502')

    const payments = page.getByTestId('settlement')
    await expect(payments).toHaveCount(2)
    await expect(payments.nth(0)).toContainText('Carla pays you')
    await expect(payments.nth(0)).toContainText('€16.00')
    await expect(payments.nth(1)).toContainText('Bruno pays you')
    await expect(payments.nth(1)).toContainText('€4.00')
  })

  test('Given an expense is added, edited or deleted, then the settlements are recalculated', async ({
    page,
    context,
  }) => {
    await setTestSession(context, session)
    await page.goto('/trips/trip-502')
    page.on('dialog', (dialog) => dialog.accept())
    await expect(page.getByTestId('settlement')).toHaveCount(2)

    // Added: Carla pays 10.00 for the three of them.
    await page.getByLabel('What was it for?').fill('Tickets')
    await page.getByLabel('Amount (€)').fill('10')
    await page.getByLabel('Paid by').selectOption('carla-1')
    await page.getByRole('button', { name: 'Add expense' }).click()
    await expect(page.getByTestId('balance-carla-1')).toContainText('owes €9.33')
    await expect(page.getByTestId('balance-ana-1')).toContainText('are owed €16.66')

    // Edited: the dinner costs 60.00.
    await page.getByTestId('edit-expense-dinner').click()
    await page.getByLabel('Amount (€)').fill('60')
    await page.getByRole('button', { name: 'Save expense' }).click()
    await expect(page.getByTestId('balance-ana-1')).toContainText('are owed €36.66')

    // Deleted: only Ana's share of the tickets is left to pay.
    await page.getByTestId('delete-expense-dinner').click()
    await expect(page.getByTestId('balance-ana-1')).toContainText('owe €3.34')
  })

  test('Given everyone has paid their share, then everyone is settled up', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      ...session,
      expenses: [
        expense('coffee', 'Coffee', 300, 'ana-1', [['ana-1', 300]]),
        expense('lunch', 'Lunch', 2000, 'bruno-1', [
          ['ana-1', 1000],
          ['bruno-1', 1000],
        ]),
        expense('refund', 'Refund', 1000, 'ana-1', [['bruno-1', 1000]]),
      ],
    })
    await page.goto('/trips/trip-502')

    await expect(page.getByTestId('settlements-empty')).toHaveText('Everyone is settled up.')
    await expect(page.getByTestId('settlement')).toHaveCount(0)
  })

  test('Given the trip has no expenses, then the balances view invites me to add one', async ({
    page,
    context,
  }) => {
    await setTestSession(context, { ...session, expenses: [] })
    await page.goto('/trips/trip-502')

    await expect(page.getByTestId('balances-empty')).toHaveText('Add an expense to see who owes whom.')
  })
})
