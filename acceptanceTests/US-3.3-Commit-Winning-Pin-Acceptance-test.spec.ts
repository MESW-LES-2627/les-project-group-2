import { test, expect } from '@playwright/test'
import { makePin, setTestSession } from './helpers'

const baseSession = {
  user: { id: 'org-1', email: 'organizer@planit.app' },
  profile: { username: 'Organizer' },
  trips: [
    { id: 'trip-303', name: 'Map Trip', destination: 'Portugal', organizer_id: 'org-1' },
  ],
  members: [
    { user_id: 'org-1', email: 'organizer@planit.app', display_name: 'Organizer', role: 'organizer' as const },
    { user_id: 'member-1', email: 'member@planit.app', display_name: 'Member', role: 'member' as const },
  ],
}

test.describe('US-3.3: Commit Winning Pin to Itinerary', () => {
  test('Given I am the organizer, when I confirm a pin, then it becomes a confirmed spot and voting closes', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      ...baseSession,
      pins: [makePin({ id: 'pin-303', trip_id: 'trip-303', name: 'Belém Tower' })],
    })
    await page.goto('/trips/trip-303/map')
    await expect(page.locator('.leaflet-container')).toBeVisible()

    await page.getByTitle('Belém Tower').click({ force: true })
    await expect(page.getByTestId('pin-vote-card')).toBeVisible()
    await page.getByTestId('confirm-pin-button').click()

    await expect(page.getByTestId('toggle-confirmed-spots-button')).toContainText('Confirmed (1)')
    await expect(page.getByTestId('pin-confirmed-badge')).toBeVisible()
    await expect(page.getByTestId('voting-closed-badge')).toBeVisible()
    await expect(page.getByTitle('★ Belém Tower (Confirmed)')).toBeVisible()

    await page.getByTestId('toggle-confirmed-spots-button').click()
    await expect(page.getByTestId('confirmed-spots-card')).toBeVisible()
    await expect(page.getByTestId('confirmed-spot-item-pin-303')).toBeVisible()
    await expect(page.getByTestId('confirmed-spot-name-pin-303')).toHaveText('Belém Tower')
  })

  test('Given a pin is confirmed, when I revert it, then it becomes proposed again', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      ...baseSession,
      pins: [
        makePin({
          id: 'pin-303',
          trip_id: 'trip-303',
          name: 'Belém Tower',
          is_confirmed: true,
        }),
      ],
    })
    await page.goto('/trips/trip-303/map')
    await expect(page.locator('.leaflet-container')).toBeVisible()

    await page.getByTitle('★ Belém Tower (Confirmed)').click({ force: true })
    await page.getByTestId('revert-pin-button').click()

    await expect(page.getByTestId('toggle-confirmed-spots-button')).toContainText('Confirmed (0)')
    await expect(page.getByTestId('pin-confirmed-badge')).toHaveCount(0)
    await expect(page.getByTestId('vote-pin-button')).toBeVisible()
  })

  test('Given I am a member, then I cannot confirm a proposed pin', async ({ page, context }) => {
    await setTestSession(context, {
      ...baseSession,
      user: { id: 'member-1', email: 'member@planit.app' },
      profile: { username: 'Member' },
      pins: [makePin({ id: 'pin-303', trip_id: 'trip-303', name: 'Belém Tower' })],
    })
    await page.goto('/trips/trip-303/map')
    await expect(page.locator('.leaflet-container')).toBeVisible()

    await page.getByTitle('Belém Tower').click({ force: true })
    await expect(page.getByTestId('pin-vote-card')).toBeVisible()
    await expect(page.getByTestId('confirm-pin-button')).toHaveCount(0)
  })
})
