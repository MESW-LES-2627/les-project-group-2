import { test, expect } from '@playwright/test'
import { setTestSession } from './helpers'

test.describe('US-1.1: User Registration and Authentication', () => {
  /* test('Given I am on the sign-up page, when I submit a valid name, email and password, then my account is created and I am logged in', async ({
    page,
    context,
  }) => {
    await setTestSession(context, { user: null })
    await page.goto('/entry')

    // Switch to Sign Up box
    await page.getByRole('button', { name: 'Sign up' }).click()
    await expect(page.getByRole('heading', { name: 'Hello new traveller!' })).toBeVisible()

    await page.getByPlaceholder('Username').fill('ValidUser')
    await page.getByPlaceholder('Email').fill('validuser@planit.app')
    await page.getByPlaceholder('Password', { exact: true }).fill('SecurePass123!')
    await page.getByPlaceholder('Confirm password').fill('SecurePass123!')

    await page.getByRole('button', { name: 'Sign Up' }).click()
    await expect(page).toHaveURL(/.*dashboard/)
  }) */ //TODO: something really fishy regarding cookies is going on in here. 

  test('Given an email that is already registered, when I try to sign up with it, then I see an error and no account is created', async ({
    page,
    context,
  }) => {
    await setTestSession(context, { user: null })
    await page.goto('/entry')

    await page.getByRole('button', { name: 'Sign up' }).click()
    await expect(page.getByRole('heading', { name: 'Hello new traveller!' })).toBeVisible()

    await page.getByPlaceholder('Username').fill('ExistingUser')
    await page.getByPlaceholder('Email').fill('existing@planit.app')
    await page.getByPlaceholder('Password', { exact: true }).fill('Password123!')
    await page.getByPlaceholder('Confirm password').fill('Password123!')

    await page.getByRole('button', { name: 'Sign Up' }).click()

    const errorMsg = page.locator('p.text-red-400')
    await expect(errorMsg).toBeVisible()
    await expect(page).toHaveURL(/.*entry/)
  })

  test('Given I have an account, when I log in with the correct credentials, then I am redirected to my trips dashboard', async ({
    page,
    context,
  }) => {
    await setTestSession(context, { user: null })
    await page.goto('/entry')

    await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible()

    await page.getByPlaceholder('Email').fill('registered@planit.app')
    await page.getByPlaceholder('Password').fill('ValidPassword123!')

    await page.getByRole('button', { name: 'Sign In' }).click()

    await expect(page).toHaveURL(/.*dashboard/)
  })

  test('Given I enter wrong credentials, when I try to log in, then I see an error message and stay on the login page', async ({
    page,
    context,
  }) => {
    await setTestSession(context, { user: null })
    await page.goto('/entry')

    await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible()

    await page.getByPlaceholder('Email').fill('wrong@planit.app')
    await page.getByPlaceholder('Password').fill('WrongPassword!')

    await page.getByRole('button', { name: 'Sign In' }).click()

    const errorMsg = page.locator('p.text-red-400')
    await expect(errorMsg).toBeVisible()
    await expect(errorMsg).toHaveText('Invalid login credentials')
    await expect(page).toHaveURL(/.*entry/)
  })

  test('Given I am logged in, when I log out, then my session ends and protected pages redirect me to the login page', async ({
    page,
    context,
  }) => {
    await setTestSession(context, {
      user: { id: 'u-1', email: 'traveler@planit.app' },
      profile: { username: 'Traveler' },
      trips: [],
    })

    await page.goto('/dashboard')
    await expect(page.getByTitle('Sign out')).toBeVisible()

    await page.getByTitle('Sign out').click()

    await expect(page).toHaveURL(/.*entry/)
    await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible()

    // Protected page redirect
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/.*entry/)
  })
})
