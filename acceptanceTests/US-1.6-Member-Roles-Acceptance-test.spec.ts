import { test, expect } from '@playwright/test'
import { setTestSession } from './helpers'

const baseSession = {
  user: { id: 'org-1', email: 'organizer@planit.app' },
  profile: { username: 'Organizer Bob' },
  trips: [
    {
      id: 'trip-106',
      name: 'Summer Trip',
      organizer_id: 'org-1',
    },
  ],
  members: [
    {
      user_id: 'org-1',
      email: 'organizer@planit.app',
      display_name: 'Organizer Bob',
      role: 'organizer' as const,
    },
    {
      user_id: 'member-1',
      email: 'member@planit.app',
      display_name: 'Member Alice',
      role: 'member' as const,
    },
  ],
}

test.describe('US-1.6: Member Roles and Permissions', () => {
  test('Given I am the organizer, when I transfer the organizer role, then the target member becomes the organizer', async ({
    page,
    context,
  }) => {
    await setTestSession(context, baseSession)
    await page.goto('/trips/trip-106')

    await expect(page.getByTestId('trip-organizer-name')).toHaveText('You')
    await expect(page.getByRole('button', { name: 'Transfer organizer role' })).toBeVisible()

    page.on('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Transfer organizer role' }).click()

    await expect(page.getByTestId('trip-organizer-name')).toHaveText('Member Alice')
    await expect(page.getByRole('button', { name: 'Transfer organizer role' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Remove member' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Leave trip' })).toBeVisible()
  })

  test('Given I am a regular member, then I cannot transfer the organizer role', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      ...baseSession,
      user: { id: 'member-1', email: 'member@planit.app' },
      profile: { username: 'Member Alice' },
    })
    await page.goto('/trips/trip-106')

    await expect(page.getByTestId('trip-organizer-name')).toHaveText('Organizer Bob')
    await expect(page.getByRole('button', { name: 'Transfer organizer role' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Remove member' })).toHaveCount(0)
  })

  test('Given I cancel the confirmation, then the organizer role is not transferred', async ({
    page,
    context,
  }) => {
    await setTestSession(context, baseSession)
    await page.goto('/trips/trip-106')

    page.on('dialog', (dialog) => dialog.dismiss())
    await page.getByRole('button', { name: 'Transfer organizer role' }).click()

    await expect(page.getByTestId('trip-organizer-name')).toHaveText('You')
    await expect(page.getByRole('button', { name: 'Transfer organizer role' })).toBeVisible()
  })
})
