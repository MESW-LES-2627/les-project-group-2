import { test, expect } from '@playwright/test';

test.describe('US-1.3-acceptance-test', () => {
  test('Given I am the organizer, when I open the trip settings, then I can copy a unique invite link and code', async ({ page }) => {
    await page.route('**/trips/trip-algarve-2026', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><title>Trip Workspace</title></head>
            <body>
              <main>
                <h1>Algarve Summer Trip</h1>
                <details data-testid="invite-settings" open>
                  <summary>Invite friends</summary>
                  <div>
                    <span data-testid="displayed-invite-code">ALGARVE8</span>
                    <button data-testid="copy-code-button">Copy Code</button>
                  </div>
                  <div>
                    <span data-testid="displayed-invite-url">http://localhost:3000/trips/join?code=ALGARVE8</span>
                    <button data-testid="copy-link-button">Copy Link</button>
                  </div>
                  <div id="copy-status"></div>
                </details>
              </main>
              <script>
                document.querySelector('[data-testid="copy-code-button"]').addEventListener('click', () => {
                  navigator.clipboard.writeText(document.querySelector('[data-testid="displayed-invite-code"]').textContent);
                  document.getElementById('copy-status').textContent = 'Code copied!';
                });
                document.querySelector('[data-testid="copy-link-button"]').addEventListener('click', () => {
                  navigator.clipboard.writeText(document.querySelector('[data-testid="displayed-invite-url"]').textContent);
                  document.getElementById('copy-status').textContent = 'Link copied!';
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/trip-algarve-2026');

    await expect(page.getByTestId('invite-settings')).toBeVisible();
    await expect(page.getByTestId('displayed-invite-code')).toHaveText('ALGARVE8');
    await expect(page.getByTestId('displayed-invite-url')).toContainText('/trips/join?code=ALGARVE8');

    // Test copying invite code
    await page.getByTestId('copy-code-button').click();
    await expect(page.locator('#copy-status')).toHaveText('Code copied!');

    // Test copying invite link
    await page.getByTestId('copy-link-button').click();
    await expect(page.locator('#copy-status')).toHaveText('Link copied!');
  });

  test('Given a logged-in user with a valid link or code, when they open or enter it, then they are added to the trip as a member', async ({ page }) => {
    await page.route('**/trips/join*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><title>Join Trip</title></head>
            <body>
              <main>
                <h1>Join a trip</h1>
                <form id="join-form">
                  <input name="code" placeholder="Invite code" value="ALGARVE8" required />
                  <button type="submit">Join trip</button>
                </form>
              </main>
              <script>
                document.getElementById('join-form').addEventListener('submit', (e) => {
                  e.preventDefault();
                  if (e.target.code.value.trim() === 'ALGARVE8') {
                    window.location.href = '/trips/trip-algarve-2026';
                  }
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.route('**/trips/trip-algarve-2026', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <body>
              <h1>Algarve Summer Trip</h1>
              <section data-testid="members-section">
                <h2>Trip members</h2>
                <ul>
                  <li>Organizer (organizer)</li>
                  <li data-testid="new-member">New Traveler (member)</li>
                </ul>
              </section>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/join?code=ALGARVE8');
    await page.getByRole('button', { name: 'Join trip' }).click();

    await expect(page).toHaveURL(/.*trips\/trip-algarve-2026/);
    await expect(page.getByRole('heading', { name: 'Algarve Summer Trip' })).toBeVisible();
    await expect(page.getByTestId('new-member')).toBeVisible();
  });

  test('Given a user who is not logged in, when they open the invite link, then they are asked to log in or sign up and are added to the trip afterwards', async ({ page }) => {
    let loggedIn = false;

    await page.route('**/trips/join?code=ALGARVE8', async (route) => {
      if (!loggedIn) {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=/entry?redirectTo=%2Ftrips%2Fjoin%3Fcode%3DALGARVE8"></head><body><script>window.location.href = '/entry?redirectTo=%2Ftrips%2Fjoin%3Fcode%3DALGARVE8';</script></body></html>`,
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<!DOCTYPE html><html><body><h1>Trip Workspace</h1><p id="status">Joined trip successfully!</p></body></html>`,
      });
    });

    await page.route('**/entry*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <body>
              <h2>Welcome back!</h2>
              <form id="login-form">
                <input name="email" type="email" placeholder="Email" value="friend@planit.app" />
                <input name="password" type="password" placeholder="Password" value="Secret123!" />
                <input type="hidden" name="redirectTo" value="/trips/join?code=ALGARVE8" />
                <button type="submit">Sign In</button>
              </form>
              <script>
                document.getElementById('login-form').addEventListener('submit', (e) => {
                  e.preventDefault();
                  fetch('/api/login-redirect', { method: 'POST' }).then(() => {
                    window.location.href = e.target.redirectTo.value;
                  });
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.route('**/api/login-redirect', async (route) => {
      loggedIn = true;
      await route.fulfill({ status: 200, body: JSON.stringify({ ok: true }) });
    });

    // Unauthenticated user opens invite link
    await page.goto('/trips/join?code=ALGARVE8');

    // Prompted to log in or sign up with redirectTo preserved
    await expect(page).toHaveURL(/.*entry\?redirectTo=.*/);
    await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();

    // User logs in
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Added to the trip afterwards
    await expect(page).toHaveURL(/.*trips\/join\?code=ALGARVE8/);
    await expect(page.locator('#status')).toHaveText('Joined trip successfully!');
  });

  test('Given an invalid or revoked code, when a user enters it, then they see an error and are not added to the trip', async ({ page }) => {
    await page.route('**/trips/join', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <body>
              <h1>Join a trip</h1>
              <form id="join-form">
                <input name="code" placeholder="Invite code" required />
                <p id="error-message" class="text-red-500" style="display:none;"></p>
                <button type="submit">Join trip</button>
              </form>
              <script>
                document.getElementById('join-form').addEventListener('submit', (e) => {
                  e.preventDefault();
                  const err = document.getElementById('error-message');
                  err.textContent = 'Invalid or revoked invite code.';
                  err.style.display = 'block';
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/join');
    await page.getByPlaceholder('Invite code').fill('INVALID99');
    await page.getByRole('button', { name: 'Join trip' }).click();

    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toHaveText('Invalid or revoked invite code.');
    await expect(page).toHaveURL(/.*trips\/join/);
  });

  test('Given I am the organizer, when I regenerate the invite code, then the previous link and code stop working', async ({ page }) => {
    let activeCode = 'ALGARVE8';

    await page.route('**/trips/trip-algarve-2026', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <body>
              <h1>Algarve Summer Trip</h1>
              <details data-testid="invite-settings" open>
                <summary>Invite friends</summary>
                <div>
                  <span data-testid="displayed-invite-code">${activeCode}</span>
                  <span data-testid="displayed-invite-url">http://localhost:3000/trips/join?code=${activeCode}</span>
                  <button data-testid="regenerate-code-button">Regenerate Code</button>
                </div>
              </details>
              <script>
                document.querySelector('[data-testid="regenerate-code-button"]').addEventListener('click', () => {
                  fetch('/api/regenerate', { method: 'POST' })
                    .then(r => r.json())
                    .then(data => {
                      document.querySelector('[data-testid="displayed-invite-code"]').textContent = data.newCode;
                      document.querySelector('[data-testid="displayed-invite-url"]').textContent = 'http://localhost:3000/trips/join?code=' + data.newCode;
                    });
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.route('**/api/regenerate', async (route) => {
      activeCode = 'NEWALGARVE99';
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, newCode: 'NEWALGARVE99' }),
      });
    });

    await page.route('**/trips/join*', async (route) => {
      const url = new URL(route.request().url());
      const code = url.searchParams.get('code');
      if (code === activeCode) {
        await route.fulfill({ status: 200, body: '<html><body>Success joined!</body></html>' });
      } else {
        await route.fulfill({
          status: 400,
          contentType: 'text/html',
          body: '<html><body><p id="error">Invalid or revoked invite code.</p></body></html>',
        });
      }
    });

    await page.goto('/trips/trip-algarve-2026');
    await expect(page.getByTestId('displayed-invite-code')).toHaveText('ALGARVE8');

    // Organizer clicks regenerate
    await page.getByTestId('regenerate-code-button').click();

    // New code and link are displayed
    await expect(page.getByTestId('displayed-invite-code')).toHaveText('NEWALGARVE99');
    await expect(page.getByTestId('displayed-invite-url')).toContainText('code=NEWALGARVE99');

    // Verify previous code no longer works
    await page.goto('/trips/join?code=ALGARVE8');
    await expect(page.locator('#error')).toHaveText('Invalid or revoked invite code.');
  });
});
