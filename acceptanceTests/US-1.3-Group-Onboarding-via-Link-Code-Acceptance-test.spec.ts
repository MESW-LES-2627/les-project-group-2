import { test, expect } from '@playwright/test'
import { setTestSession } from './helpers'

test.describe('US-1.3: Group Onboarding via Link/Code', () => {
  test('Given I am the organizer, when I open the trip settings, then I can copy a unique invite link and code', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'org-1', email: 'organizer@planit.app' },
      profile: { username: 'Organizer' },
      trips: [
        {
          id: 'trip-100',
          name: 'Summer Trip',
          organizer_id: 'org-1',
          invite_code: 'SUMMER26',
        },
      ],
      members: [
        {
          user_id: 'org-1',
          email: 'organizer@planit.app',
          display_name: 'Organizer',
          role: 'organizer',
        },
      ],
    })

    await page.goto('/trips/trip-100')
    const inviteSection = page.locator('[data-testid="invite-settings"]')
    await expect(inviteSection).toBeVisible()

    const displayedCode = page.locator('[data-testid="displayed-invite-code"]')
    await expect(displayedCode).toHaveText('SUMMER26')

    const copyCodeBtn = page.locator('[data-testid="copy-code-button"]')
    await expect(copyCodeBtn).toBeVisible()
    await copyCodeBtn.click()

    const copyLinkBtn = page.locator('[data-testid="copy-link-button"]')
    await expect(copyLinkBtn).toBeVisible()
    await copyLinkBtn.click()
  })

  test('Given a logged-in user with a valid link or code, when they open or enter it, then they are added to the trip as a member', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'u-member', email: 'friend@planit.app' },
      profile: { username: 'Friend' },
      trips: [
        {
          id: 'trip-100',
          name: 'Summer Trip',
          organizer_id: 'org-1',
          invite_code: 'SUMMER26',
        },
      ],
      members: [
        {
          user_id: 'org-1',
          email: 'organizer@planit.app',
          display_name: 'Organizer',
          role: 'organizer',
        },
      ],
    })

    await page.goto('/trips/join')
    await expect(page.getByRole('heading', { name: 'Join a Trip' })).toBeVisible()

    await page.locator('input[name="code"]').fill('SUMMER26')
    await page.getByRole('button', { name: 'Join trip' }).click()

    await expect(page).toHaveURL(/.*trips\/trip-100/)
  })

  test('Given a user who is not logged in, when they open the invite link, then they are asked to log in or sign up and are added to the trip afterwards', async ({
    page,
    context,
  }) => {
    await setTestSession(context, { user: null })
    await page.goto('/trips/join?code=SUMMER26')

    await expect(page).toHaveURL(/.*entry\?redirectTo=.*SUMMER26/)
    await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible()
  })

  test('Given an invalid or revoked code, when a user enters it, then they see an error and are not added to the trip', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'u-member', email: 'friend@planit.app' },
      profile: { username: 'Friend' },
      trips: [
        {
          id: 'trip-100',
          name: 'Summer Trip',
          organizer_id: 'org-1',
          invite_code: 'SUMMER26',
        },
      ],
    })

    await page.goto('/trips/join')
    await page.locator('input[name="code"]').fill('INVALID999')
    await page.getByRole('button', { name: 'Join trip' }).click()

    const errorMsg = page.locator('[data-testid="form-error-message"], [data-testid="join-error-message"]')
    await expect(errorMsg).toBeVisible()
    await expect(errorMsg).toContainText('Invalid or revoked invite code')
    await expect(page).toHaveURL(/.*trips\/join/)
  })

  test('Given I am the organizer, when I regenerate the invite code, then the previous link and code stop working', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'org-1', email: 'organizer@planit.app' },
      profile: { username: 'Organizer' },
      trips: [
        {
          id: 'trip-100',
          name: 'Summer Trip',
          organizer_id: 'org-1',
          invite_code: 'SUMMER26',
        },
      ],
      members: [
        {
          user_id: 'org-1',
          email: 'organizer@planit.app',
          display_name: 'Organizer',
          role: 'organizer',
        },
      ],
    })

    await page.goto('/trips/trip-100')
    const displayedCode = page.locator('[data-testid="displayed-invite-code"]')
    await expect(displayedCode).toHaveText('SUMMER26')

    const regenBtn = page.locator('[data-testid="regenerate-code-button"]')
    await regenBtn.click()

    await expect(page.getByText('New invite code generated successfully')).toBeVisible()
    await expect(displayedCode).not.toHaveText('SUMMER26')
  })
})
