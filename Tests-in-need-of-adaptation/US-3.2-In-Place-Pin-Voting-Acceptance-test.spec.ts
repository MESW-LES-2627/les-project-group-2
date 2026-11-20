import { test, expect } from '@playwright/test'
import { setTestSession } from './helpers'

test.describe('US-3.2: In-Place Pin Voting', () => {
  test('Given a proposed pin, when I open it, then I can vote for it or remove my vote', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'u-1', email: 'traveler@planit.app' },
      profile: { username: 'Traveler' },
      trips: [
        { id: 'trip-302', name: 'Map Trip', destination: 'Portugal', organizer_id: 'u-1' },
      ],
      members: [
        { user_id: 'u-1', email: 'traveler@planit.app', display_name: 'Traveler', role: 'organizer' },
      ],
    })

    await page.goto('/trips/trip-302/map')
    const map = page.locator('.leaflet-container')
    await expect(map).toBeVisible()

    const marker = page.locator('.custom-pin-marker').first()
    await expect(marker).toBeVisible()
    await marker.click({ force: true })

    const pinCard = page.locator('[data-testid="pin-vote-card"]')
    await expect(pinCard).toBeVisible()

    const voteButton = page.locator('[data-testid="vote-pin-button"]')
    await expect(voteButton).toBeVisible()
    await expect(voteButton).toHaveText('Vote')

    // Cast vote
    await voteButton.click()
    await expect(voteButton).toHaveText('Remove vote')

    // Remove vote
    await voteButton.click()
    await expect(voteButton).toHaveText('Vote')
  })

  test('Given I already voted on a pin, when I try to vote again, then my vote is not counted twice', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'u-1', email: 'traveler@planit.app' },
      profile: { username: 'Traveler' },
      trips: [
        { id: 'trip-302', name: 'Map Trip', destination: 'Portugal', organizer_id: 'u-1' },
      ],
      members: [
        { user_id: 'u-1', email: 'traveler@planit.app', display_name: 'Traveler', role: 'organizer' },
      ],
    })

    await page.goto('/trips/trip-302/map')
    const map = page.locator('.leaflet-container')
    await expect(map).toBeVisible()

    const marker = page.locator('.custom-pin-marker').first()
    await expect(marker).toBeVisible()
    await marker.click({ force: true })

    const pinCard = page.locator('[data-testid="pin-vote-card"]')
    await expect(pinCard).toBeVisible()

    const voteCount = page.locator('[data-testid="pin-vote-count"]')
    const voteButton = page.locator('[data-testid="vote-pin-button"]')

    await expect(voteCount).toHaveText('0 votes')

    // Vote once
    await voteButton.click()
    await expect(voteCount).toHaveText('1 vote')
    await expect(voteButton).toHaveText('Remove vote')

    // Trying to vote again removes/toggles instead of adding duplicate vote
    await voteButton.click()
    await expect(voteCount).toHaveText('0 votes')
    await expect(voteButton).toHaveText('Vote')

    // Vote again stays at 1 vote
    await voteButton.click()
    await expect(voteCount).toHaveText('1 vote')
  })

  test('Given a pin has votes, then it shows the vote count and who voted', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'u-1', email: 'traveler@planit.app' },
      profile: { username: 'Traveler' },
      trips: [
        { id: 'trip-302', name: 'Map Trip', destination: 'Portugal', organizer_id: 'u-1' },
      ],
      members: [
        { user_id: 'u-1', email: 'traveler@planit.app', display_name: 'Traveler', role: 'organizer' },
      ],
    })

    await page.goto('/trips/trip-302/map')
    const map = page.locator('.leaflet-container')
    await expect(map).toBeVisible()

    const marker = page.locator('.custom-pin-marker').first()
    await expect(marker).toBeVisible()
    await marker.click({ force: true })

    const pinCard = page.locator('[data-testid="pin-vote-card"]')
    await expect(pinCard).toBeVisible()

    const voteCount = page.locator('[data-testid="pin-vote-count"]')
    const voters = page.locator('[data-testid="pin-voters"]')
    const voteButton = page.locator('[data-testid="vote-pin-button"]')

    // Vote on the pin so it has votes
    await voteButton.click()

    await expect(voteCount).toHaveText('1 vote')
    await expect(voters).toContainText('traveler@planit.app')
  })

  test('Given a pin is proposed for a specific trip date, then its votes count for that date only', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'u-1', email: 'traveler@planit.app' },
      profile: { username: 'Traveler' },
      trips: [
        { id: 'trip-302', name: 'Map Trip', destination: 'Portugal', organizer_id: 'u-1' },
      ],
      members: [
        { user_id: 'u-1', email: 'traveler@planit.app', display_name: 'Traveler', role: 'organizer' },
      ],
    })

    await page.goto('/trips/trip-302/map')
    const map = page.locator('.leaflet-container')
    await expect(map).toBeVisible()

    const marker = page.locator('.custom-pin-marker').first()
    await expect(marker).toBeVisible()
    await marker.click({ force: true })

    const pinCard = page.locator('[data-testid="pin-vote-card"]')
    await expect(pinCard).toBeVisible()

    const dateBadge = page.locator('[data-testid="pin-date-badge"]')
    await expect(dateBadge).toBeVisible()
    await expect(dateBadge).toContainText('2026-11-15')

    const voteCount = page.locator('[data-testid="pin-vote-count"]')
    const voteButton = page.locator('[data-testid="vote-pin-button"]')

    // Vote on the date-scoped pin
    await voteButton.click()
    await expect(voteCount).toHaveText('1 vote')
  })
})
