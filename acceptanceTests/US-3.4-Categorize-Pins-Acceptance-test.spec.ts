import { test, expect } from '@playwright/test'
import { createPinWithCategory, makePin, setTestSession } from './helpers'

const baseSession = {
  user: { id: 'member-1', email: 'member@planit.app' },
  profile: { username: 'Member' },
  trips: [
    { id: 'trip-304', name: 'Map Trip', destination: 'Portugal', organizer_id: 'org-1' },
  ],
  members: [
    { user_id: 'org-1', email: 'organizer@planit.app', display_name: 'Organizer', role: 'organizer' as const },
    { user_id: 'member-1', email: 'member@planit.app', display_name: 'Member', role: 'member' as const },
  ],
}

const categorizedPins = [
  makePin({ id: 'pin-stay', trip_id: 'trip-304', name: 'Hotel Avenida', category: 'stay', lat: 38.72, lng: -9.14 }),
  makePin({ id: 'pin-visit', trip_id: 'trip-304', name: 'Belém Tower', category: 'visit', lat: 38.69, lng: -9.21 }),
  makePin({ id: 'pin-activity', trip_id: 'trip-304', name: 'Surf Lesson', category: 'activity', lat: 38.7, lng: -9.4 }),
  makePin({ id: 'pin-food', trip_id: 'trip-304', name: 'Cervejaria Ramiro', category: 'food', lat: 38.72, lng: -9.13 }),
  makePin({ id: 'pin-meeting', trip_id: 'trip-304', name: 'Rossio Square', category: 'meeting_point', lat: 38.714, lng: -9.139 }),
]

test.describe('US-3.4: Categorize Pins', () => {
  test('Given I create a pin, then I must choose one of the five categories', async ({
    page,
    context,
  }) => {
    await setTestSession(context, baseSession)
    await page.goto('/trips/trip-304/map')
    const map = page.locator('.leaflet-container')
    await expect(map).toBeVisible()

    await map.click({ position: { x: 500, y: 400 } })

    const modal = page.getByTestId('new-pin-modal')
    await expect(modal).toBeVisible()
    for (const label of ['Stay', 'Visit', 'Activity', 'Food', 'Meeting Point']) {
      await expect(modal.getByText(label, { exact: true })).toBeVisible()
    }

    await page.getByTestId('create-pin-button').click()
    await expect(page.getByTestId('new-pin-error')).toHaveText('Choose a category for the pin.')
    await expect(page.locator('.custom-pin-marker')).toHaveCount(0)

    await createPinWithCategory(page, 'Food')

    await expect(page.getByTestId('pin-vote-card')).toContainText('Food')
    await expect(page.locator('.custom-pin-marker')).toHaveCount(1)
  })

  test('Given pins of different categories, then each category has its own icon and colour', async ({
    page,
    context,
  }) => {
    await setTestSession(context, { ...baseSession, pins: categorizedPins })
    await page.goto('/trips/trip-304/map')
    await expect(page.locator('.leaflet-container')).toBeVisible()

    const expected = [
      { name: 'Hotel Avenida', icon: '🏨', color: 'rgb(139, 92, 246)' },
      { name: 'Belém Tower', icon: '🏛️', color: 'rgb(59, 130, 246)' },
      { name: 'Surf Lesson', icon: '🚴', color: 'rgb(16, 185, 129)' },
      { name: 'Cervejaria Ramiro', icon: '🍴', color: 'rgb(249, 115, 22)' },
      { name: 'Rossio Square', icon: '📍', color: 'rgb(225, 29, 72)' },
    ]

    for (const { name, icon, color } of expected) {
      const marker = page.locator(`.custom-pin-marker[title="${name}"]`)
      await expect(marker).toContainText(icon)
      await expect(marker.locator('div').first()).toHaveCSS('background-color', color)
    }
  })

  test('Given I open the map, then a legend explains each category', async ({ page, context }) => {
    await setTestSession(context, baseSession)
    await page.goto('/trips/trip-304/map')
    await expect(page.locator('.leaflet-container')).toBeVisible()

    const legend = page.getByTestId('category-legend')
    await expect(legend).toBeVisible()
    for (const label of ['Stay', 'Visit', 'Activity', 'Food', 'Meeting Point']) {
      await expect(legend).toContainText(label)
    }
  })

  test('Given I proposed a pin, when I change its category, then the new icon is shown', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      ...baseSession,
      pins: [
        makePin({
          id: 'pin-own',
          trip_id: 'trip-304',
          name: 'Belém Tower',
          category: 'visit',
          proposed_by: 'member@planit.app',
        }),
      ],
    })
    await page.goto('/trips/trip-304/map')
    await expect(page.locator('.leaflet-container')).toBeVisible()
    await expect(page.locator('.custom-pin-marker[title="Belém Tower"]')).toContainText('🏛️')

    await page.getByTitle('Belém Tower').click({ force: true })
    await page.getByTestId('edit-pin-button').click()
    await page.getByTestId('edit-pin-category').selectOption('stay')
    await page.getByTestId('save-edit-pin-button').click()

    await expect(page.getByTestId('pin-vote-card')).toContainText('Stay')
    await expect(page.locator('.custom-pin-marker[title="Belém Tower"]')).toContainText('🏨')
  })
})
