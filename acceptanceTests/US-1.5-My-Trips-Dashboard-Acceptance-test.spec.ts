import { test, expect } from '@playwright/test'
import { setTestSession } from './helpers'

test.describe('US-1.5: My Trips Dashboard', () => {
  test('Given I am logged in, when I open the dashboard, then I see every trip I belong to', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'u-1', email: 'traveler@planit.app' },
      profile: { username: 'Traveler' },
      trips: [
        { id: 'trip-1', name: 'Trip Alpha', organizer_id: 'u-1', state: 'Planning' },
        { id: 'trip-2', name: 'Trip Beta', organizer_id: 'u-1', state: 'Dates locked' },
      ],
    })

    await page.goto('/dashboard')
    await page.locator('[data-testid="toggle-trips-card-button"]').click()

    await expect(page.getByRole('region', { name: 'Member trips panel' })).toBeVisible()
    await expect(page.getByText('Trip Alpha')).toBeVisible()
    await expect(page.getByText('Trip Beta')).toBeVisible()
  })

  test('Given a trip in the list, then it shows its name, its dates (or "Dates not set") and its status: Planning, Dates locked or Finished', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'u-1', email: 'traveler@planit.app' },
      profile: { username: 'Traveler' },
      trips: [
        {
          id: 'trip-1',
          name: 'Algarve Adventure',
          organizer_id: 'u-1',
          state: 'Planning',
          trip_dates: [],
        },
      ],
    })

    await page.goto('/dashboard')
    await page.locator('[data-testid="toggle-trips-card-button"]').click()

    const tripCard = page.locator('[data-testid="trip-rectangle-trip-1"]')
    await expect(tripCard).toBeVisible()
    await expect(tripCard.getByText('Algarve Adventure')).toBeVisible()
    await expect(tripCard.getByText('Planning')).toBeVisible()
    await expect(tripCard.getByText('Dates not set')).toBeVisible()
  })

  test('Given I click a trip, then its workspace opens', async ({ page, context }) => {
    await setTestSession(context, {
      user: { id: 'u-1', email: 'traveler@planit.app' },
      profile: { username: 'Traveler' },
      trips: [
        { id: 'trip-open', name: 'Trip Workspace Target', organizer_id: 'u-1', state: 'Planning' },
      ],
      members: [
        { user_id: 'u-1', email: 'traveler@planit.app', display_name: 'Traveler', role: 'organizer' },
      ],
    })

    await page.goto('/dashboard')
    await page.locator('[data-testid="toggle-trips-card-button"]').click()

    await page.locator('[data-testid="trip-rectangle-trip-open"]').click()

    await expect(page).toHaveURL(/.*trips\/trip-open/)
  })

  test('Given I do not belong to any trip, when I open the dashboard, then I see an empty state with a "Create trip" button', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'u-1', email: 'traveler@planit.app' },
      profile: { username: 'Traveler' },
      trips: [],
    })

    await page.goto('/dashboard')
    await page.locator('[data-testid="toggle-trips-card-button"]').click()

    await expect(page.locator('[data-testid="no-trips-message"]')).toBeVisible()
    await expect(page.getByText('No trips found')).toBeVisible()

    const createTripBtn = page.getByRole('button', { name: 'Create trip' })
    await expect(createTripBtn).toBeVisible()
  })
})
