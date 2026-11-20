import { test, expect } from '@playwright/test'
import { setTestSession } from './helpers'

const members = [
  { user_id: 'ana', email: 'ana@planit.app', display_name: 'Ana', role: 'organizer' as const },
  { user_id: 'bruno', email: 'bruno@planit.app', display_name: 'Bruno', role: 'member' as const },
  { user_id: 'carla', email: 'carla@planit.app', display_name: 'Carla', role: 'member' as const },
]

const availableDays = (userId: string, days: string[]) =>
  days.map((day) => ({ user_id: userId, day, status: 'available' }))

const session = {
  user: { id: 'ana', email: 'ana@planit.app' },
  profile: { username: 'Ana' },
  trips: [
    { id: 'trip-204', name: 'Autumn Escape', organizer_id: 'ana' },
  ],
  members,
  windows: [
    { id: 'w1', trip_id: 'trip-204', start_date: '2099-07-01', end_date: '2099-07-06' },
    { id: 'w2', trip_id: 'trip-204', start_date: '2099-08-10', end_date: '2099-08-15' },
  ],
  itineraryDays: [],
  availabilities: [
    ...availableDays('ana', ['2099-07-02', '2099-07-03', '2099-07-04', '2099-08-11', '2099-08-12', '2099-08-13']),
    ...availableDays('bruno', ['2099-07-02', '2099-07-03', '2099-07-04', '2099-08-11', '2099-08-12', '2099-08-13']),
    ...availableDays('carla', ['2099-08-11', '2099-08-12', '2099-08-13']),
  ],
}

test.describe('US-2.4: Automatic Best-Date Suggestion', () => {
  test('Given members have answered, then the organizer sees ranges ranked by attendance and can pre-fill the lock form', async ({
    page,
    context,
  }) => {
    await setTestSession(context, session)
    await page.goto('/trips/trip-204')

    await expect(page.getByRole('heading', { name: 'Suggested dates' })).toBeVisible()
    await page.locator('#trip-length').fill('3')

    const suggestions = page.locator('ol li')
    await expect(suggestions.first()).toContainText('11 Aug 2099 → 13 Aug 2099')
    await expect(suggestions.first()).toContainText('3/3 can attend')
    await expect(suggestions.nth(1)).toContainText('2 Jul 2099 → 4 Jul 2099')
    await expect(suggestions.nth(1)).toContainText('2/3 can attend')
    await expect(suggestions.nth(1)).toContainText('Cannot attend: Carla')

    await page.getByRole('button', { name: 'Use these dates' }).nth(1).click()
    await expect(page.locator('#lock-start')).toHaveValue('2099-07-02')
    await expect(page.locator('#lock-end')).toHaveValue('2099-07-04')
  })

  test('Given nobody has answered yet, then no suggestions are shown', async ({ page, context }) => {
    await setTestSession(context, { ...session, availabilities: [] })
    await page.goto('/trips/trip-204')

    await expect(
      page.getByText('Suggestions appear once members submit their availability.')
    ).toBeVisible()
    await expect(page.getByRole('button', { name: 'Use these dates' })).toHaveCount(0)
  })
})
