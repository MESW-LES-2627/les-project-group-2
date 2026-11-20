import { test, expect } from '@playwright/test'
import { setTestSession } from './helpers'

test.describe('US-2.3: Lock Official Trip Dates', () => {
  test('Given members have submitted availability, when I select a date range and confirm, then the trip dates are locked and shown to every member', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'org-1', email: 'organizer@planit.app' },
      profile: { username: 'Organizer' },
      trips: [
        {
          id: 'trip-lock-test',
          name: 'Official Date Trip',
          organizer_id: 'org-1',
          state: 'Planning',
        },
      ],
      members: [
        { user_id: 'org-1', email: 'organizer@planit.app', display_name: 'Organizer', role: 'organizer' },
      ],
      windows: [
        {
          id: 'w-1',
          trip_id: 'trip-lock-test',
          start_date: '2028-09-01',
          end_date: '2028-09-10',
        },
      ],
      itineraryDays: [],
    })

    await page.goto('/trips/trip-lock-test')
    await expect(page.getByRole('heading', { name: 'Trip dates' })).toBeVisible()

    page.on('dialog', (dialog) => dialog.accept())


    await page.locator('#new-start').fill('2028-09-01')
    await page.locator('#new-end').fill('2028-09-10')

    await page.getByRole('button', { name: 'Add date window' }).click()
    
    await page.locator('#lock-start').fill('2028-09-01')
    await page.locator('#lock-end').fill('2028-09-05')

    await page.getByRole('button', { name: 'Lock dates' }).click()

    await expect(page.getByText('Dates locked').first()).toBeVisible()
    await expect(page.getByText(/1 Sep.* 2028 → 5 Sep.* 2028/)).toBeVisible()
  })

  test('Given the dates are locked, then members can no longer change their availability and the trip status changes to "Dates locked"', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'm-1', email: 'member@planit.app' },
      profile: { username: 'Member' },
      trips: [
        {
          id: 'trip-lock-test',
          name: 'Official Date Trip',
          organizer_id: 'org-1',
          state: 'Dates locked',
          locked_start_date: '2028-09-01',
          locked_end_date: '2028-09-05',
        },
      ],
      members: [
        { user_id: 'org-1', email: 'organizer@planit.app', display_name: 'Organizer', role: 'organizer' },
        { user_id: 'm-1', email: 'member@planit.app', display_name: 'Member', role: 'member' },
      ],
      windows: [
        {
          id: 'w-1',
          trip_id: 'trip-lock-test',
          start_date: '2028-09-01',
          end_date: '2028-09-10',
        },
      ],
      itineraryDays: [
        { id: 'i-1', trip_id: 'trip-lock-test', day: '2028-09-01' },
      ],
    })

    await page.goto('/trips/trip-lock-test')

    await expect(page.getByText('Dates locked').first()).toBeVisible()
    await expect(
      page.getByText('The trip dates are locked, so availability is read-only.')
    ).toBeVisible()
  })

  test('Given the dates are locked, then one itinerary day is created for each day in the range', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'org-1', email: 'organizer@planit.app' },
      profile: { username: 'Organizer' },
      trips: [
        {
          id: 'trip-lock-test',
          name: 'Official Date Trip',
          organizer_id: 'org-1',
          state: 'Dates locked',
          locked_start_date: '2028-09-01',
          locked_end_date: '2028-09-05',
        },
      ],
      members: [
        { user_id: 'org-1', email: 'organizer@planit.app', display_name: 'Organizer', role: 'organizer' },
      ],
      windows: [
        {
          id: 'w-1',
          trip_id: 'trip-lock-test',
          start_date: '2028-09-01',
          end_date: '2028-09-10',
        },
      ],
      itineraryDays: [
        { id: 'i-1', trip_id: 'trip-lock-test', day: '2028-09-01' },
        { id: 'i-2', trip_id: 'trip-lock-test', day: '2028-09-02' },
        { id: 'i-3', trip_id: 'trip-lock-test', day: '2028-09-03' },
        { id: 'i-4', trip_id: 'trip-lock-test', day: '2028-09-04' },
        { id: 'i-5', trip_id: 'trip-lock-test', day: '2028-09-05' },
      ],
    })

    await page.goto('/trips/trip-lock-test')

    await expect(
      page.getByText('5 itinerary days created. Availability and candidate dates are read-only.')
    ).toBeVisible()
  })

  test('Given the dates are locked, when I unlock them and confirm, then members can edit their availability again', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'org-1', email: 'organizer@planit.app' },
      profile: { username: 'Organizer' },
      trips: [
        {
          id: 'trip-lock-test',
          name: 'Official Date Trip',
          organizer_id: 'org-1',
          state: 'Dates locked',
          locked_start_date: '2028-09-01',
          locked_end_date: '2028-09-05',
        },
      ],
      members: [
        { user_id: 'org-1', email: 'organizer@planit.app', display_name: 'Organizer', role: 'organizer' },
      ],
      windows: [
        {
          id: 'w-1',
          trip_id: 'trip-lock-test',
          start_date: '2028-09-01',
          end_date: '2028-09-10',
        },
      ],
      itineraryDays: [
        { id: 'i-1', trip_id: 'trip-lock-test', day: '2028-09-01' },
      ],
    })

    await page.goto('/trips/trip-lock-test')
    await expect(page.getByRole('button', { name: 'Unlock dates' })).toBeVisible()

    page.on('dialog', (dialog) => dialog.accept())

    await page.getByRole('button', { name: 'Unlock dates' }).click()

    await expect(page.getByRole('button', { name: 'Lock dates' })).toBeVisible()
    await expect(
      page.getByText('Mark the days that work for you and see where the group overlaps.')
    ).toBeVisible()
  })
})
