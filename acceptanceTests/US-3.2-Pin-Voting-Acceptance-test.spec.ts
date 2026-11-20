import { test, expect } from '@playwright/test'
import { makePin, setTestSession } from './helpers'

const baseSession = {
  user: { id: 'org-1', email: 'organizer@planit.app' },
  profile: { username: 'Organizer' },
  trips: [
    { id: 'trip-302', name: 'Map Trip', destination: 'Portugal', organizer_id: 'org-1' },
  ],
  members: [
    { user_id: 'org-1', email: 'organizer@planit.app', display_name: 'Organizer', role: 'organizer' as const },
  ],
}

test.describe('US-3.2: In-Place Pin Voting', () => {
  test('Given a proposed pin, when I open it, then I can vote and remove my vote', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      ...baseSession,
      pins: [makePin({ id: 'pin-302', trip_id: 'trip-302', name: 'Belém Tower' })],
    })
    await page.goto('/trips/trip-302/map')
    await expect(page.locator('.leaflet-container')).toBeVisible()

    await page.getByTitle('Belém Tower').click({ force: true })
    await expect(page.getByTestId('pin-vote-card')).toBeVisible()

    const voteButton = page.getByTestId('vote-pin-button')
    await expect(voteButton).toHaveText('Vote')
    await voteButton.click()
    await expect(voteButton).toHaveText('Remove vote')
    await voteButton.click()
    await expect(voteButton).toHaveText('Vote')
  })

  test('Given a pin has votes, then it shows the count and who voted', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      ...baseSession,
      pins: [makePin({ id: 'pin-302', trip_id: 'trip-302', name: 'Belém Tower' })],
    })
    await page.goto('/trips/trip-302/map')
    await expect(page.locator('.leaflet-container')).toBeVisible()

    await page.getByTitle('Belém Tower').click({ force: true })
    await page.getByTestId('vote-pin-button').click()

    await expect(page.getByTestId('pin-vote-count')).toHaveText('1 vote')
    await expect(page.getByTestId('pin-voters')).toContainText('organizer@planit.app')
  })

  test('Given a pin is scoped to a trip date, then its date badge is shown', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      ...baseSession,
      pins: [
        makePin({
          id: 'pin-302',
          trip_id: 'trip-302',
          name: 'Belém Tower',
          date: '2026-11-15',
        }),
      ],
    })
    await page.goto('/trips/trip-302/map')
    await expect(page.locator('.leaflet-container')).toBeVisible()

    await page.getByTitle('Belém Tower').click({ force: true })
    await expect(page.getByTestId('pin-date-badge')).toContainText('2026-11-15')
    await page.getByTestId('vote-pin-button').click()
    await expect(page.getByTestId('pin-vote-count')).toHaveText('1 vote')
  })
})
