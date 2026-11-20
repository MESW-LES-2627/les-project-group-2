import { test, expect } from '@playwright/test'
import { setTestSession } from './helpers'

const baseSession = {
  user: { id: 'org-1', email: 'organizer@planit.app' },
  profile: { username: 'Organizer' },
  trips: [
    { id: 'trip-307', name: 'Map Trip', destination: 'Portugal', organizer_id: 'org-1' },
  ],
  members: [
    { user_id: 'org-1', email: 'organizer@planit.app', display_name: 'Organizer', role: 'organizer' as const },
  ],
}

const portoResult = [
  {
    placeId: '1',
    name: 'Porto',
    displayName: 'Porto, Portugal',
    lat: 41.1496,
    lon: -8.6109,
    type: 'city',
  },
]

test.describe('US-3.7: Search Place by Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/places/search**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(portoResult),
      })
    )
  })

  test('Given I type a place name, then I see matching places', async ({ page, context }) => {
    await setTestSession(context, baseSession)
    await page.goto('/trips/trip-307/map')

    const search = page.getByPlaceholder('Search places across the map...')
    await expect(search).toBeVisible()
    await search.fill('Porto')

    await expect(page.locator('ul li button').first()).toBeVisible()
    await expect(page.locator('ul li button').first()).toContainText('Porto')
  })

  test('Given I select a result, then a pin is created with its name and location', async ({
    page,
    context,
  }) => {
    await setTestSession(context, baseSession)
    await page.goto('/trips/trip-307/map')

    const search = page.getByPlaceholder('Search places across the map...')
    await search.fill('Porto')
    await page.locator('ul li button').first().click()

    await expect(page.getByTestId('pin-vote-card')).toBeVisible()
    await expect(page.getByTestId('pin-name')).toHaveText('Porto')
    await expect(page.locator('.custom-pin-marker')).toHaveCount(1)
  })
})
