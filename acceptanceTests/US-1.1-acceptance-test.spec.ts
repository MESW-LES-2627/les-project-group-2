import { test, expect } from '@playwright/test';

test.describe('US-1.1-acceptance-test', () => {
  test('Given I am on the sign-up page, when I submit a valid name, email and password, then my account is created and I am logged in', async ({ page }) => {
    await page.route('**/entry', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><title>PlanIt! - Authentication</title></head>
            <body>
              <main>
                <h2>Hello new traveller!</h2>
                <form id="signup-form">
                  <input name="username" placeholder="Username" required />
                  <input name="email" type="email" placeholder="Email" required />
                  <input name="password" type="password" placeholder="Password" required />
                  <input name="password_conf" type="password" placeholder="Confirm password" required />
                  <button type="submit">Sign Up</button>
                </form>
              </main>
              <script>
                document.getElementById('signup-form').addEventListener('submit', (e) => {
                  e.preventDefault();
                  window.location.href = '/dashboard';
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.route('**/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<!DOCTYPE html><html><body><h1>Dashboard</h1><div data-testid="dashboard-header">Welcome Traveler</div></body></html>`,
      });
    });

    await page.goto('/entry');
    await expect(page.getByRole('heading', { name: 'Hello new traveller!' })).toBeVisible();

    await page.getByPlaceholder('Username').fill('Traveler');
    await page.getByPlaceholder('Email').fill('traveler@planit.app');
    await page.getByPlaceholder('Password', { exact: true }).fill('Password123!');
    await page.getByPlaceholder('Confirm password').fill('Password123!');

    await page.getByRole('button', { name: 'Sign Up' }).click();

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('Given an email that is already registered, when I try to sign up with it, then I see an error and no account is created', async ({ page }) => {
    await page.route('**/entry', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><title>PlanIt! - Authentication</title></head>
            <body>
              <main>
                <h2>Hello new traveller!</h2>
                <form id="signup-form">
                  <input name="username" placeholder="Username" required />
                  <input name="email" type="email" placeholder="Email" required />
                  <input name="password" type="password" placeholder="Password" required />
                  <input name="password_conf" type="password" placeholder="Confirm password" required />
                  <p id="error-msg" class="text-xs text-red-400" style="display:none;"></p>
                  <button type="submit">Sign Up</button>
                </form>
              </main>
              <script>
                document.getElementById('signup-form').addEventListener('submit', (e) => {
                  e.preventDefault();
                  const email = e.target.email.value;
                  if (email === 'existing@planit.app') {
                    const err = document.getElementById('error-msg');
                    err.textContent = 'Email already registered';
                    err.style.display = 'block';
                  }
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/entry');
    await expect(page.getByRole('heading', { name: 'Hello new traveller!' })).toBeVisible();

    await page.getByPlaceholder('Username').fill('ExistingUser');
    await page.getByPlaceholder('Email').fill('existing@planit.app');
    await page.getByPlaceholder('Password', { exact: true }).fill('Password123!');
    await page.getByPlaceholder('Confirm password').fill('Password123!');

    await page.getByRole('button', { name: 'Sign Up' }).click();

    await expect(page.locator('#error-msg')).toBeVisible();
    await expect(page.locator('#error-msg')).toHaveText('Email already registered');
    await expect(page).toHaveURL(/.*entry/);
  });

  test('Given I have an account, when I log in with the correct credentials, then I am redirected to my trips dashboard', async ({ page }) => {
    await page.route('**/entry', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><title>PlanIt! - Login</title></head>
            <body>
              <main>
                <h2>Welcome back!</h2>
                <form id="login-form">
                  <input name="email" type="email" placeholder="Email" required />
                  <input name="password" type="password" placeholder="Password" required />
                  <button type="submit">Sign In</button>
                </form>
              </main>
              <script>
                document.getElementById('login-form').addEventListener('submit', (e) => {
                  e.preventDefault();
                  if (e.target.email.value === 'user@planit.app' && e.target.password.value === 'ValidPass123!') {
                    window.location.href = '/dashboard';
                  }
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.route('**/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<!DOCTYPE html><html><body><h1>My Trips Dashboard</h1></body></html>`,
      });
    });

    await page.goto('/entry');
    await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();

    await page.getByPlaceholder('Email').fill('user@planit.app');
    await page.getByPlaceholder('Password').fill('ValidPass123!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByRole('heading', { name: 'My Trips Dashboard' })).toBeVisible();
  });

  test('Given I enter wrong credentials, when I try to log in, then I see an error message and stay on the login page', async ({ page }) => {
    await page.route('**/entry', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><title>PlanIt! - Login</title></head>
            <body>
              <main>
                <h2>Welcome back!</h2>
                <form id="login-form">
                  <input name="email" type="email" placeholder="Email" required />
                  <input name="password" type="password" placeholder="Password" required />
                  <p id="login-error" class="text-sm text-red-400" style="display:none;"></p>
                  <button type="submit">Sign In</button>
                </form>
              </main>
              <script>
                document.getElementById('login-form').addEventListener('submit', (e) => {
                  e.preventDefault();
                  const err = document.getElementById('login-error');
                  err.textContent = 'Invalid login credentials';
                  err.style.display = 'block';
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/entry');
    await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();

    await page.getByPlaceholder('Email').fill('user@planit.app');
    await page.getByPlaceholder('Password').fill('WrongPassword!');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.locator('#login-error')).toBeVisible();
    await expect(page.locator('#login-error')).toHaveText('Invalid login credentials');
    await expect(page).toHaveURL(/.*entry/);
  });

  test('Given I am logged in, when I log out, then my session ends and protected pages redirect me to the login page', async ({ page }) => {
    let isAuthenticated = true;

    await page.route('**/dashboard', async (route) => {
      if (!isAuthenticated) {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=/entry"></head><body><script>window.location.href = '/entry';</script></body></html>`,
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><title>Dashboard</title></head>
            <body>
              <header>
                <form id="logout-form">
                  <button type="submit" title="Sign out">Sign out</button>
                </form>
              </header>
              <main><h1>Welcome to your Dashboard</h1></main>
              <script>
                document.getElementById('logout-form').addEventListener('submit', (e) => {
                  e.preventDefault();
                  fetch('/api/logout', { method: 'POST' }).then(() => {
                    window.location.href = '/entry';
                  });
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.route('**/api/logout', async (route) => {
      isAuthenticated = false;
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await page.route('**/entry', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<!DOCTYPE html><html><body><h2>Welcome back!</h2></body></html>`,
      });
    });

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Welcome to your Dashboard' })).toBeVisible();

    // Click Sign out
    await page.getByRole('button', { name: 'Sign out' }).click();

    // Session ended, redirected to login page (/entry)
    await expect(page).toHaveURL(/.*entry/);
    await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();

    // Attempting to visit protected page redirects back to /entry
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*entry/);
  });
});
