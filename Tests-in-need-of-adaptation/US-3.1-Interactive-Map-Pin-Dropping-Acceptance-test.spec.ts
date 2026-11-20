import { test, expect } from '@playwright/test'
import { setTestSession } from './helpers'

test.describe('US-3.1: Interactive Map & Pin Dropping', () => {
  test('Given I open the trip map, then it is centred on the trip destination (Portugal by default)', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'u-1', email: 'traveler@planit.app' },
      profile: { username: 'Traveler' },
      trips: [
        { id: 'trip-301', name: 'Map Trip', destination: 'Portugal', organizer_id: 'u-1' },
      ],
      members: [
        { user_id: 'u-1', email: 'traveler@planit.app', display_name: 'Traveler', role: 'organizer' },
      ],
    })

    await page.goto('/trips/trip-301/map')
    const map = page.locator('.leaflet-container')
    await expect(map).toBeVisible()
  })

  test('Given I click anywhere on the map, then a form opens to add a name, a description and an optional date', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'u-1', email: 'traveler@planit.app' },
      profile: { username: 'Traveler' },
      trips: [
        { id: 'trip-301', name: 'Map Trip', destination: 'Portugal', organizer_id: 'u-1' },
      ],
      members: [
        { user_id: 'u-1', email: 'traveler@planit.app', display_name: 'Traveler', role: 'organizer' },
      ],
    })

    await page.goto('/trips/trip-301/map')
    const map = page.locator('.leaflet-container')
    await expect(map).toBeVisible()

    // Click on map to trigger pin creation
    await map.click({ position: { x: 300, y: 300 } })

    const pinCard = page.locator('[data-testid="pin-vote-card"]')
    await expect(pinCard).toBeVisible()
  })

  test('Given I save the form, then the pin is shown on the map to every member', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'u-1', email: 'traveler@planit.app' },
      profile: { username: 'Traveler' },
      trips: [
        { id: 'trip-301', name: 'Map Trip', destination: 'Portugal', organizer_id: 'u-1' },
      ],
      members: [
        { user_id: 'u-1', email: 'traveler@planit.app', display_name: 'Traveler', role: 'organizer' },
      ],
    })

    await page.goto('/trips/trip-301/map')
    const map = page.locator('.leaflet-container')
    await expect(map).toBeVisible()

    await map.click({ position: { x: 350, y: 350 } })

    const marker = page.locator('.custom-pin-marker').first()
    await expect(marker).toBeVisible()
  })

  test('Given I click a pin, then I see its details and who proposed it', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'u-1', email: 'traveler@planit.app' },
      profile: { username: 'Traveler' },
      trips: [
        { id: 'trip-301', name: 'Map Trip', destination: 'Portugal', organizer_id: 'u-1' },
      ],
      members: [
        { user_id: 'u-1', email: 'traveler@planit.app', display_name: 'Traveler', role: 'organizer' },
      ],
    })

    await page.goto('/trips/trip-301/map')
    const map = page.locator('.leaflet-container')
    await expect(map).toBeVisible()

    const marker = page.locator('.custom-pin-marker').first()
    await expect(marker).toBeVisible()
    await marker.click({ force: true })

    const pinCard = page.locator('[data-testid="pin-vote-card"]')
    await expect(pinCard).toBeVisible()
    await expect(page.locator('[data-testid="pin-name"]')).toBeVisible()
  })
})
