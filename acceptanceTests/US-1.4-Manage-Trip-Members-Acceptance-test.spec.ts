import { test, expect } from '@playwright/test'
import { setTestSession } from './helpers'

test.describe('US-1.4: Manage Trip Members', () => {
  test('Given I am a member, when I open the members list, then I see every member and their role', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'm-1', email: 'member@planit.app' },
      profile: { username: 'MemberAlice' },
      trips: [
        {
          id: 'trip-100',
          name: 'Summer Trip',
          organizer_id: 'org-1',
        },
      ],
      members: [
        {
          user_id: 'org-1',
          email: 'organizer@planit.app',
          display_name: 'Organizer Bob',
          role: 'organizer',
        },
        {
          user_id: 'm-1',
          email: 'member@planit.app',
          display_name: 'Member Alice',
          role: 'member',
        },
      ],
    })

    await page.goto('/trips/trip-100')
    await expect(page.getByRole('heading', { name: 'Trip members' })).toBeVisible()

    await expect(page.getByText('Organizer Bob')).toBeVisible()
    await expect(page.getByText('Member Alice')).toBeVisible()
    await expect(page.getByText('organizer', { exact: true })).toBeVisible()
    await expect(page.getByText('member', { exact: true })).toBeVisible()
  })

  test('Given I am the organizer, when I remove a member, then they lose access to the trip', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'org-1', email: 'organizer@planit.app' },
      profile: { username: 'Organizer Bob' },
      trips: [
        {
          id: 'trip-100',
          name: 'Summer Trip',
          organizer_id: 'org-1',
        },
      ],
      members: [
        {
          user_id: 'org-1',
          email: 'organizer@planit.app',
          display_name: 'Organizer Bob',
          role: 'organizer',
        },
        {
          user_id: 'm-2',
          email: 'charlie@planit.app',
          display_name: 'Charlie Member',
          role: 'member',
        },
      ],
    })

    await page.goto('/trips/trip-100')
    await expect(page.getByText('Charlie Member')).toBeVisible()

    const removeBtn = page.getByRole('button', { name: 'Remove member' })
    await expect(removeBtn).toBeVisible()
    await removeBtn.click()

    await expect(page.getByText('Charlie Member')).not.toBeVisible()
  })

  test('Given I am a member who is not the organizer, when I leave the trip, then it no longer appears in my trips dashboard', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'm-1', email: 'member@planit.app' },
      profile: { username: 'MemberAlice' },
      trips: [
        {
          id: 'trip-100',
          name: 'Summer Trip',
          organizer_id: 'org-1',
        },
      ],
      members: [
        {
          user_id: 'org-1',
          email: 'organizer@planit.app',
          display_name: 'Organizer Bob',
          role: 'organizer',
        },
        {
          user_id: 'm-1',
          email: 'member@planit.app',
          display_name: 'Member Alice',
          role: 'member',
        },
      ],
    })

    await page.goto('/trips/trip-100')
    const leaveBtn = page.getByRole('button', { name: 'Leave trip' })
    await expect(leaveBtn).toBeVisible()
    await leaveBtn.click()

    await expect(page).toHaveURL(/.*dashboard/)
  })

  test('Given I am the only organizer, when I try to leave the trip, then I am asked to transfer the organizer role or delete the trip first', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'org-1', email: 'organizer@planit.app' },
      profile: { username: 'Organizer Bob' },
      trips: [
        {
          id: 'trip-100',
          name: 'Summer Trip',
          organizer_id: 'org-1',
        },
      ],
      members: [
        {
          user_id: 'org-1',
          email: 'organizer@planit.app',
          display_name: 'Organizer Bob',
          role: 'organizer',
        },
      ],
    })

    await page.goto('/trips/trip-100')
    const warningMsg = page.getByText('Transfer the organizer role or delete the trip first')
    await expect(warningMsg).toBeVisible()
    await expect(page.getByRole('button', { name: 'Leave trip' })).not.toBeVisible()
  })
})
