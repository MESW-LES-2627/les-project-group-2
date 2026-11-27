import { test, expect } from '@playwright/test'
import { makePin, setTestSession } from './helpers'

const memberSession = {
  user: { id: 'member-1', email: 'member@planit.app' },
  profile: { username: 'Member' },
  trips: [
    { id: 'trip-306', name: 'Map Trip', destination: 'Portugal', organizer_id: 'org-1' },
  ],
  members: [
    { user_id: 'org-1', email: 'organizer@planit.app', display_name: 'Organizer', role: 'organizer' as const },
    { user_id: 'member-1', email: 'member@planit.app', display_name: 'Member', role: 'member' as const },
  ],
  pins: [
    makePin({
      id: 'pin-306',
      trip_id: 'trip-306',
      name: 'Belém Tower',
      proposed_by: 'organizer@planit.app',
    }),
  ],
  pinComments: [
    {
      id: 'comment-org',
      pin_id: 'pin-306',
      user_id: 'org-1',
      author_name: 'Organizer',
      body: 'Is it open on Sundays?',
      created_at: '2026-11-20T10:00:00Z',
    },
  ],
}

async function openComments(page: import('@playwright/test').Page) {
  await page.goto('/trips/trip-306/map')
  await expect(page.locator('.leaflet-container')).toBeVisible()
  await page.getByTitle('Belém Tower').click({ force: true })
  await page.getByTestId('toggle-pin-comments').click()
}

test.describe('US-3.6: Comment on a Pin', () => {
  test('Given a pin, when I write a comment, then it is shown with my name and the date', async ({
    page,
    context,
  }) => {
    await setTestSession(context, memberSession)
    await openComments(page)
    await expect(page.getByTestId('pin-comment-comment-org')).toContainText('Organizer')
    await expect(page.getByTestId('pin-comment-comment-org')).toContainText('20 Nov 2026')

    await page.getByTestId('pin-comment-input').fill('Yes, I checked and it opens at 10am')
    await page.getByTestId('send-pin-comment').click()

    const mine = page.locator('[data-testid^="pin-comment-comment-"]').filter({ hasText: 'Member' })
    await expect(mine).toContainText('Yes, I checked and it opens at 10am')
    await expect(mine.getByTestId('pin-comment-author')).toHaveText('Member')
    await expect(mine.getByTestId('pin-comment-date')).not.toBeEmpty()
    await expect(page.getByTestId('toggle-pin-comments')).toContainText('Comments (2)')
    await expect(page.getByTestId('pin-comment-input')).toHaveValue('')
  })

  test('Given I wrote a comment, when I delete it, then it is removed', async ({
    page,
    context,
  }) => {
    await setTestSession(context, memberSession)
    await openComments(page)

    await page.getByTestId('pin-comment-input').fill('A comment to delete')
    await page.getByTestId('send-pin-comment').click()
    const mine = page.locator('[data-testid^="pin-comment-comment-"]').filter({ hasText: 'A comment to delete' })
    await expect(mine).toBeVisible()

    await mine.getByRole('button', { name: 'Delete comment' }).click()

    await expect(page.getByText('A comment to delete')).toHaveCount(0)
    await expect(page.getByTestId('toggle-pin-comments')).toContainText('Comments (1)')
  })

  test('Given a comment written by another member, then I cannot delete it', async ({
    page,
    context,
  }) => {
    await setTestSession(context, memberSession)
    await openComments(page)

    await expect(page.getByTestId('pin-comment-comment-org')).toBeVisible()
    await expect(page.getByTestId('delete-pin-comment-comment-org')).toHaveCount(0)
  })
})
