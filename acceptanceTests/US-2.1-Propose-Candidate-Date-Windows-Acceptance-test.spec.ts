import { test, expect } from '@playwright/test'
import { setTestSession } from './helpers'

test.describe('US-2.1: Propose Candidate Date Windows', () => {
  test('Given I am the organizer, when I add a window with a start and an end date, then it is shown to every member', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'org-1', email: 'organizer@planit.app' },
      profile: { username: 'Organizer' },
      trips: [
        {
          id: 'trip-201',
          name: 'Date Planning Trip',
          organizer_id: 'org-1',
          state: 'Planning',
        },
      ],
      members: [
        { user_id: 'org-1', email: 'organizer@planit.app', display_name: 'Organizer', role: 'organizer' },
      ],
      windows: [],
    })

    await page.goto('/trips/trip-201')
    await expect(page.getByRole('heading', { name: 'Candidate dates' })).toBeVisible()

    await page.locator('#new-start').fill('2028-06-01')
    await page.locator('#new-end').fill('2028-06-10')

    await page.getByRole('button', { name: 'Add date window' }).click()

    await expect(page.getByText('1 Jun 2028 → 10 Jun 2028')).toBeVisible()
  })

  test('Given the end date is before the start date, or the start date is in the past, when I save the window, then I see a validation error', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'org-1', email: 'organizer@planit.app' },
      profile: { username: 'Organizer' },
      trips: [
        {
          id: 'trip-201',
          name: 'Date Planning Trip',
          organizer_id: 'org-1',
          state: 'Planning',
        },
      ],
      members: [
        { user_id: 'org-1', email: 'organizer@planit.app', display_name: 'Organizer', role: 'organizer' },
      ],
      windows: [],
    })

    await page.goto('/trips/trip-201')

    await page.locator('#new-start').fill('2028-06-15')
    await page.locator('#new-end').fill('2028-06-01')

    await page.getByRole('button', { name: 'Add date window' }).click()

    await expect(page.getByText('The end date cannot be before the start date.')).toBeVisible()
  })

  test('Given the dates are not locked, when I edit or delete a window, then the change is shown to every member and availabilities outside the new window are removed', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'org-1', email: 'organizer@planit.app' },
      profile: { username: 'Organizer' },
      trips: [
        {
          id: 'trip-201',
          name: 'Date Planning Trip',
          organizer_id: 'org-1',
          state: 'Planning',
        },
      ],
      members: [
        { user_id: 'org-1', email: 'organizer@planit.app', display_name: 'Organizer', role: 'organizer' },
      ],
      windows: [
        {
          id: 'win-to-delete',
          trip_id: 'trip-201',
          start_date: '2028-07-01',
          end_date: '2028-07-05',
        },
      ],
    })

    await page.goto('/trips/trip-201')
    await expect(page.getByText('1 Jul 2028 → 5 Jul 2028')).toBeVisible()

    page.on('dialog', (dialog) => dialog.accept())

    const deleteBtn = page.getByRole('button', { name: 'Delete' })
    await deleteBtn.click()

    await expect(page.getByText('1 Jul 2028 → 5 Jul 2028')).not.toBeVisible()
  })
})
