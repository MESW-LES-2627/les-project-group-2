import { test, expect } from '@playwright/test'
import { makePin, setTestSession } from './helpers'

const memberSession = {
  user: { id: 'member-1', email: 'member@planit.app' },
  profile: { username: 'Member' },
  trips: [
    { id: 'trip-305', name: 'Map Trip', destination: 'Portugal', organizer_id: 'org-1' },
  ],
  members: [
    { user_id: 'org-1', email: 'organizer@planit.app', display_name: 'Organizer', role: 'organizer' as const },
    { user_id: 'member-1', email: 'member@planit.app', display_name: 'Member', role: 'member' as const },
  ],
  pins: [
    makePin({
      id: 'pin-305',
      trip_id: 'trip-305',
      name: 'Belém Tower',
      proposed_by: 'member@planit.app',
    }),
    makePin({
      id: 'pin-305-confirmed',
      trip_id: 'trip-305',
      name: 'Confirmed Monastery',
      proposed_by: 'member@planit.app',
      lat: 41.1496,
      lng: -8.6109,
      is_confirmed: true,
    }),
  ],
}

const organizerSession = {
  ...memberSession,
  user: { id: 'org-1', email: 'organizer@planit.app' },
  profile: { username: 'Organizer' },
}

test.describe('US-3.5: Edit/Delete Own Pin Proposal', () => {
  test('Given I proposed a pin, when I edit it, then the changes are shown', async ({
    page,
    context,
  }) => {
    await setTestSession(context, memberSession)
    await page.goto('/trips/trip-305/map')
    await expect(page.locator('.leaflet-container')).toBeVisible()

    await page.getByTitle('Belém Tower').click({ force: true })
    await page.getByTestId('edit-pin-button').click()
    await expect(page.getByTestId('edit-pin-modal')).toBeVisible()

    await page.getByTestId('edit-pin-name').fill('Belém Tower (Renamed)')
    await page.getByTestId('edit-pin-description').fill('Updated description')
    await page.getByTestId('edit-pin-category').selectOption('activity')
    await page.getByTestId('save-edit-pin-button').click()

    await expect(page.getByTestId('edit-pin-modal')).toHaveCount(0)
    await expect(page.getByTestId('pin-name')).toHaveText('Belém Tower (Renamed)')
    await expect(page.getByTestId('pin-vote-card')).toContainText('Updated description')
    await expect(page.locator('.custom-pin-marker[title="Belém Tower (Renamed)"]')).toBeVisible()
  })

  test('Given I proposed a pin, when I delete it, then it is removed from the map', async ({
    page,
    context,
  }) => {
    await setTestSession(context, memberSession)
    await page.goto('/trips/trip-305/map')
    await expect(page.locator('.leaflet-container')).toBeVisible()

    await page.getByTitle('Belém Tower').click({ force: true })
    await page.getByTestId('delete-pin-button').click()

    await expect(page.getByTestId('pin-vote-card')).toHaveCount(0)
    await expect(page.getByTitle('Belém Tower')).toHaveCount(0)
  })

  test('Given a pin is confirmed, then a member cannot edit or delete it but the organizer can', async ({
    page,
    context,
  }) => {
    await setTestSession(context, memberSession)
    await page.goto('/trips/trip-305/map')
    await expect(page.locator('.leaflet-container')).toBeVisible()

    await page.getByTitle('★ Confirmed Monastery (Confirmed)').click({ force: true })
    await expect(page.getByTestId('pin-confirmed-badge')).toBeVisible()
    await expect(page.getByTestId('edit-pin-button')).toHaveCount(0)
    await expect(page.getByTestId('delete-pin-button')).toHaveCount(0)

    await context.clearCookies()
    await setTestSession(context, organizerSession)
    await page.goto('/trips/trip-305/map')
    await expect(page.locator('.leaflet-container')).toBeVisible()

    await page.getByTitle('★ Confirmed Monastery (Confirmed)').click({ force: true })
    await expect(page.getByTestId('edit-pin-button')).toBeVisible()
    await expect(page.getByTestId('delete-pin-button')).toBeVisible()
  })
})
