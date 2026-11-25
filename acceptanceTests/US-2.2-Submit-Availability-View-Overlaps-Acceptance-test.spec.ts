import { test, expect } from '@playwright/test'
import { setTestSession } from './helpers'

test.describe('US-2.2: Submit Availability & View Overlaps', () => {
  test('Given candidate windows exist, when I mark days as available or unavailable, then my answer is saved', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'm-1', email: 'member@planit.app' },
      profile: { username: 'Alice' },
      trips: [
        {
          id: 'trip-avail',
          name: 'Availability Trip',
          organizer_id: 'org-1',
          state: 'Planning',
        },
      ],
      members: [
        { user_id: 'org-1', email: 'org@planit.app', display_name: 'Bob', role: 'organizer' },
        { user_id: 'm-1', email: 'member@planit.app', display_name: 'Alice', role: 'member' },
      ],
      windows: [
        {
          id: 'w-1',
          trip_id: 'trip-avail',
          start_date: '2028-08-01',
          end_date: '2028-08-02',
        },
      ],
      availabilities: [],
    })

    await page.goto('/trips/trip-avail')
    await expect(page.getByRole('heading', { name: 'Availability', exact: true })).toBeVisible()

    const select = page.locator('#answer-2028-08-01')
    await expect(select).toBeVisible()
    await select.selectOption('available')

    await page.getByRole('button', { name: 'Save my availability' }).click()

    await expect(page.getByText('Your availability was saved.')).toBeVisible()
  })

  test("Given members have answered, when I view the calendar, then each day shows how many members are available and who they are", async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'm-1', email: 'member@planit.app' },
      profile: { username: 'Alice' },
      trips: [
        {
          id: 'trip-avail',
          name: 'Availability Trip',
          organizer_id: 'org-1',
          state: 'Planning',
        },
      ],
      members: [
        { user_id: 'org-1', email: 'org@planit.app', display_name: 'Bob', role: 'organizer' },
        { user_id: 'm-1', email: 'member@planit.app', display_name: 'Alice', role: 'member' },
      ],
      windows: [
        {
          id: 'w-1',
          trip_id: 'trip-avail',
          start_date: '2028-08-01',
          end_date: '2028-08-01',
        },
      ],
      availabilities: [
        { trip_id: 'trip-avail', user_id: 'm-1', day: '2028-08-01', status: 'available' },
      ],
    })

    await page.goto('/trips/trip-avail')

    await expect(page.getByText('1/2 available')).toBeVisible()
    await expect(page.locator('p').filter({ hasText: /^Alice$/ })).toBeVisible()
  })

  test('Given some members have not answered yet, when I view the calendar, then I can see who is still missing', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'm-1', email: 'member@planit.app' },
      profile: { username: 'Alice' },
      trips: [
        {
          id: 'trip-avail',
          name: 'Availability Trip',
          organizer_id: 'org-1',
          state: 'Planning',
        },
      ],
      members: [
        { user_id: 'org-1', email: 'org@planit.app', display_name: 'Bob', role: 'organizer' },
        { user_id: 'm-1', email: 'member@planit.app', display_name: 'Alice', role: 'member' },
      ],
      windows: [
        {
          id: 'w-1',
          trip_id: 'trip-avail',
          start_date: '2028-08-01',
          end_date: '2028-08-01',
        },
      ],
      availabilities: [
        { trip_id: 'trip-avail', user_id: 'm-1', day: '2028-08-01', status: 'available' },
      ],
    })

    await page.goto('/trips/trip-avail')

    const missingSection = page.getByText('Still waiting for: Bob')
    await expect(missingSection).toBeVisible()
  })
})
