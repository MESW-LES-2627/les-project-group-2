import { test, expect } from '@playwright/test'
import { setTestSession } from './helpers'

const members = [
  { user_id: 'org-1', email: 'organizer@planit.app', display_name: 'Organizer', role: 'organizer' as const },
  { user_id: 'ana-1', email: 'ana@planit.app', display_name: 'Ana', role: 'member' as const },
  { user_id: 'bruno-1', email: 'bruno@planit.app', display_name: 'Bruno', role: 'member' as const },
]

const trips = [{ id: 'trip-501', name: 'Expense Trip', organizer_id: 'org-1', state: 'Planning' }]

const asMember = (id: string, email: string, username: string) => ({
  user: { id, email },
  profile: { username },
  trips,
  members,
})

const dinner = {
  id: 'expense-dinner',
  trip_id: 'trip-501',
  description: 'Dinner at the beach',
  amount_cents: 3000,
  paid_by: 'ana-1',
  created_at: '2026-11-20T20:00:00Z',
  trip_expense_participants: [
    { user_id: 'org-1', share_cents: 1000 },
    { user_id: 'ana-1', share_cents: 1000 },
    { user_id: 'bruno-1', share_cents: 1000 },
  ],
}

test.describe('US-5.1: Log a Shared Expense', () => {
  test('Given I am in a trip, when I submit an expense, then it is saved and split equally between every member by default', async ({
    page,
    context,
  }) => {
    await setTestSession(context, asMember('ana-1', 'ana@planit.app', 'Ana'))
    await page.goto('/trips/trip-501')
    await expect(page.getByTestId('expenses-section')).toBeVisible()
    await expect(page.getByTestId('expenses-empty')).toBeVisible()

    for (const name of ['Organizer', 'Ana', 'Bruno']) {
      await expect(page.getByRole('checkbox', { name })).toBeChecked()
    }
    await expect(page.getByLabel('Paid by')).toHaveValue('ana-1')

    await page.getByLabel('What was it for?').fill('Dinner at the beach')
    await page.getByLabel('Amount (€)').fill('30')
    await page.getByRole('button', { name: 'Add expense' }).click()

    const expense = page.locator('[data-testid^="expense-expense-"]')
    await expect(expense).toContainText('Dinner at the beach')
    await expect(expense).toContainText('€30.00')
    await expect(expense).toContainText('Paid by you')
    await expect(expense).toContainText('Organizer · €10.00')
    await expect(expense).toContainText('Ana · €10.00')
    await expect(expense).toContainText('Bruno · €10.00')
    await expect(expense.getByTestId('expense-my-share')).toHaveText('Your share: €10.00')
  })

  test('Given an amount that is not greater than zero, then the expense is not saved', async ({
    page,
    context,
  }) => {
    await setTestSession(context, asMember('ana-1', 'ana@planit.app', 'Ana'))
    await page.goto('/trips/trip-501')

    await page.getByLabel('What was it for?').fill('Free lunch')
    await page.getByLabel('Amount (€)').fill('0')
    await page.getByRole('button', { name: 'Add expense' }).click()

    await expect(page.getByTestId('expenses-section').getByRole('alert')).toHaveText(
      'Enter an amount greater than zero, with at most two decimals.'
    )
    await expect(page.getByTestId('expenses-empty')).toBeVisible()
  })

  test('Given I choose only some participants, then only they share the expense', async ({
    page,
    context,
  }) => {
    await setTestSession(context, asMember('ana-1', 'ana@planit.app', 'Ana'))
    await page.goto('/trips/trip-501')

    await page.getByLabel('What was it for?').fill('Taxi')
    await page.getByLabel('Amount (€)').fill('10,01')
    await page.getByRole('checkbox', { name: 'Organizer' }).uncheck()
    await page.getByRole('button', { name: 'Add expense' }).click()

    const expense = page.locator('[data-testid^="expense-expense-"]')
    await expect(expense).toContainText('€10.01')
    await expect(expense).toContainText('Ana · €5.01')
    await expect(expense).toContainText('Bruno · €5.00')
    await expect(expense).not.toContainText('Organizer ·')
  })

  test('Given I am the payer, when I edit or delete the expense, then it is updated', async ({
    page,
    context,
  }) => {
    await setTestSession(context, { ...asMember('ana-1', 'ana@planit.app', 'Ana'), expenses: [dinner] })
    await page.goto('/trips/trip-501')
    page.on('dialog', (dialog) => dialog.accept())

    await page.getByTestId('edit-expense-expense-dinner').click()
    await page.getByLabel('Amount (€)').fill('60')
    await page.getByRole('button', { name: 'Save expense' }).click()

    const expense = page.getByTestId('expense-expense-dinner')
    await expect(expense).toContainText('€60.00')
    await expect(expense.getByTestId('expense-my-share')).toHaveText('Your share: €20.00')

    await page.getByTestId('delete-expense-expense-dinner').click()

    await expect(page.getByTestId('expense-expense-dinner')).toHaveCount(0)
    await expect(page.getByTestId('expenses-empty')).toBeVisible()
  })

  test('Given I am the organizer, then I can edit and delete an expense paid by someone else', async ({
    page,
    context,
  }) => {
    await setTestSession(context, { ...asMember('org-1', 'organizer@planit.app', 'Organizer'), expenses: [dinner] })
    await page.goto('/trips/trip-501')

    await expect(page.getByTestId('edit-expense-expense-dinner')).toBeVisible()
    await expect(page.getByTestId('delete-expense-expense-dinner')).toBeVisible()
  })

  test('Given I am neither the payer nor the organizer, then I cannot edit or delete the expense', async ({
    page,
    context,
  }) => {
    await setTestSession(context, { ...asMember('bruno-1', 'bruno@planit.app', 'Bruno'), expenses: [dinner] })
    await page.goto('/trips/trip-501')

    const expense = page.getByTestId('expense-expense-dinner')
    await expect(expense).toContainText('Paid by Ana')
    await expect(expense.getByTestId('expense-my-share')).toHaveText('Your share: €10.00')
    await expect(page.getByTestId('edit-expense-expense-dinner')).toHaveCount(0)
    await expect(page.getByTestId('delete-expense-expense-dinner')).toHaveCount(0)
  })
})
