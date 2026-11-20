import { test, expect } from '@playwright/test'
import { setTestSession } from './helpers'

test.describe('US-1.2: Trip Creation and Workspace Setup', () => {
  test('Given I fill the new trip form, then the trip is created and its workspace opens', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'org-1', email: 'organizer@planit.app' },
      profile: { username: 'Organizer Bob' },
      trips: [],
      members: [],
    })

    await page.goto('/trips/new')
    await expect(page.getByRole('heading', { name: 'Create a trip' })).toBeVisible()

    await page.locator('#name').fill('Winter in Porto')
    await page.locator('#destination').fill('Porto, Portugal')
    await page.locator('#description').fill('A long weekend with the group.')
    await page.getByRole('button', { name: 'Create trip' }).click()

    await expect(page.getByRole('heading', { name: 'Winter in Porto' })).toBeVisible()
    await expect(page.getByText('Porto, Portugal')).toBeVisible()
    await expect(page.getByText('A long weekend with the group.').first()).toBeVisible()
    await expect(page.getByText('Trip members')).toBeVisible()
  })
})
