import { test, expect } from '@playwright/test'
import { createPinWithCategory, makePin, setTestSession } from './helpers'

const baseSession = {
  user: { id: 'org-1', email: 'organizer@planit.app' },
  profile: { username: 'Organizer' },
  trips: [
    { id: 'trip-301', name: 'Map Trip', destination: 'Portugal', organizer_id: 'org-1' },
  ],
  members: [
    { user_id: 'org-1', email: 'organizer@planit.app', display_name: 'Organizer', role: 'organizer' as const },
  ],
}

test.describe('US-3.1: Interactive Map & Pin Dropping', () => {
  test('Given I open the trip map, then it is centred on the trip destination', async ({
    page,
    context,
  }) => {
    await setTestSession(context, baseSession)
    await page.goto('/trips/trip-301/map')
    await expect(page.locator('.leaflet-container')).toBeVisible()
  })

  test('Given I click the map, then a pin card opens for the new point', async ({
    page,
    context,
  }) => {
    await setTestSession(context, baseSession)
    await page.goto('/trips/trip-301/map')
    const map = page.locator('.leaflet-container')
    await expect(map).toBeVisible()

    await map.click({ position: { x: 500, y: 400 } })
    await createPinWithCategory(page, 'Visit')

    await expect(page.getByTestId('pin-vote-card')).toBeVisible()
    await expect(page.getByTestId('pin-name')).toContainText('Point (')
  })

  test('Given I add a point, then a marker is shown on the map', async ({ page, context }) => {
    await setTestSession(context, baseSession)
    await page.goto('/trips/trip-301/map')
    const map = page.locator('.leaflet-container')
    await expect(map).toBeVisible()

    await map.click({ position: { x: 520, y: 420 } })
    await createPinWithCategory(page, 'Visit')

    await expect(page.locator('.custom-pin-marker')).toHaveCount(1)
  })

  test('Given I click an existing pin, then I see its details', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      ...baseSession,
      pins: [makePin({ id: 'pin-301', trip_id: 'trip-301', name: 'Belém Tower' })],
    })
    await page.goto('/trips/trip-301/map')
    await expect(page.locator('.leaflet-container')).toBeVisible()

    await page.getByTitle('Belém Tower').click({ force: true })

    await expect(page.getByTestId('pin-vote-card')).toBeVisible()
    await expect(page.getByTestId('pin-name')).toHaveText('Belém Tower')
    await expect(page.getByTestId('pin-vote-card')).toContainText('Historical monument')
  })
})
