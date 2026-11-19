import { test, expect } from '@playwright/test'
import { setTestSession } from './helpers'

const VALID_1X1_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
)

test.describe('US-1.7: Edit Profile', () => {
  test('Given I am on my profile page, when I change my display name and save, then the new name is shown everywhere in the app', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'u-1', email: 'traveler@planit.app' },
      profile: { username: 'OldName', avatar_url: null },
      trips: [],
    })

    await page.goto('/dashboard')
    await page.getByTitle('OldName').click()

    await expect(page.getByRole('heading', { name: 'OldName' })).toBeVisible()

    await page.getByRole('button', { name: 'Edit' }).click()

    const nameInput = page.getByPlaceholder('Enter your name')
    await nameInput.fill('BrandNewName')

    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('heading', { name: 'BrandNewName' })).toBeVisible()
    await expect(page.getByTitle('BrandNewName')).toBeVisible()
  })

  test('Given I upload an image within the allowed size, when I save, then it is shown as my avatar in member lists', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'u-1', email: 'traveler@planit.app' },
      profile: { username: 'Traveler', avatar_url: null },
      trips: [],
    })

    await page.goto('/dashboard')
    await page.getByTitle('Traveler').click()

    await page.getByRole('button', { name: 'Edit' }).click()

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: VALID_1X1_PNG,
    })

    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByRole('heading', { name: 'Traveler' })).toBeVisible()
    const avatarImg = page.getByRole('dialog', { name: 'Profile' }).getByRole('img', { name: 'Traveler' })
    await expect(avatarImg).toBeVisible()
  })

  test('Given the display name is empty, when I save, then I see a validation error', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'u-1', email: 'traveler@planit.app' },
      profile: { username: 'Traveler', avatar_url: null },
      trips: [],
    })

    await page.goto('/dashboard')
    await page.getByTitle('Traveler').click()

    await page.getByRole('button', { name: 'Edit' }).click()

    const nameInput = page.getByPlaceholder('Enter your name')
    await nameInput.fill('')

    await expect(page.getByText("Hey! You can't do that")).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()
  })
})
