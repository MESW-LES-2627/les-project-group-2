import { test, expect } from '@playwright/test'
import { setTestSession } from './helpers'

test.describe('US-3.7: Search Place by Name', () => {
  test('Given I type a place name in the search bar, then I see a list of matching places', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'u-1', email: 'traveler@planit.app' },
      profile: { username: 'Traveler' },
      trips: [
        { id: 'trip-307', name: 'Map Trip', destination: 'Portugal', organizer_id: 'u-1' },
      ],
      members: [
        { user_id: 'u-1', email: 'traveler@planit.app', display_name: 'Traveler', role: 'organizer' },
      ],
    })

    await page.goto('/trips/trip-307/map')
    const searchInput = page.getByPlaceholder('Search places across the map...')
    await expect(searchInput).toBeVisible()

    await searchInput.fill('Porto')

    const firstResult = page.locator('ul li button').first()
    await expect(firstResult).toBeVisible({ timeout: 10000 })
  })

  test('Given I select a result, then the map centres on it and the new pin form opens with its name and location filled in', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'u-1', email: 'traveler@planit.app' },
      profile: { username: 'Traveler' },
      trips: [
        { id: 'trip-307', name: 'Map Trip', destination: 'Portugal', organizer_id: 'u-1' },
      ],
      members: [
        { user_id: 'u-1', email: 'traveler@planit.app', display_name: 'Traveler', role: 'organizer' },
      ],
    })

    await page.goto('/trips/trip-307/map')
    const searchInput = page.getByPlaceholder('Search places across the map...')
    await expect(searchInput).toBeVisible()

    await searchInput.fill('Porto')

    const firstResult = page.locator('ul li button').first()
    await expect(firstResult).toBeVisible({ timeout: 10000 })
    await firstResult.click()

    const pinCard = page.locator('[data-testid="pin-vote-card"]')
    await expect(pinCard).toBeVisible()

    const pinName = page.locator('[data-testid="pin-name"]')
    await expect(pinName).toBeVisible()
    await expect(pinName).toContainText('Porto')
  })
})
