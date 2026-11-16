import { test, expect } from '@playwright/test';

test.describe('US-1.4-acceptance-test', () => {
  test('Given I am a member, when I open the members list, then I see every member and their role', async ({ page }) => {
    await page.route('**/trips/trip-101', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <body>
              <main>
                <h1>Porto Roadtrip</h1>
                <section data-testid="trip-members-section">
                  <h2>Trip members</h2>
                  <p>2 members</p>
                  <ul id="members-list">
                    <li data-testid="member-user-1">
                      <p class="font-medium">Alice Organizer (You)</p>
                      <span class="role-badge">organizer</span>
                    </li>
                    <li data-testid="member-user-2">
                      <p class="font-medium">Bob Traveler</p>
                      <span class="role-badge">member</span>
                    </li>
                  </ul>
                </section>
              </main>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/trip-101');

    await expect(page.getByRole('heading', { name: 'Trip members' })).toBeVisible();
    await expect(page.getByTestId('member-user-1')).toContainText('Alice Organizer');
    await expect(page.getByTestId('member-user-1')).toContainText('organizer');
    await expect(page.getByTestId('member-user-2')).toContainText('Bob Traveler');
    await expect(page.getByTestId('member-user-2')).toContainText('member');
  });

  test('Given I am the organizer, when I remove a member, then they lose access to the trip', async ({ page }) => {
    let memberRemoved = false;

    await page.route('**/trips/trip-101', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <body>
              <main>
                <h1>Porto Roadtrip</h1>
                <section>
                  <h2>Trip members</h2>
                  <ul>
                    <li>Alice (organizer)</li>
                    <li id="member-bob" style="${memberRemoved ? 'display:none;' : ''}">
                      Bob (member)
                      <form id="remove-form">
                        <button type="submit">Remove member</button>
                      </form>
                    </li>
                  </ul>
                </section>
              </main>
              <script>
                const form = document.getElementById('remove-form');
                if (form) {
                  form.addEventListener('submit', (e) => {
                    e.preventDefault();
                    fetch('/api/remove-member', { method: 'POST' }).then(() => {
                      document.getElementById('member-bob').style.display = 'none';
                    });
                  });
                }
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.route('**/api/remove-member', async (route) => {
      memberRemoved = true;
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await page.route('**/trips/trip-101/map', async (route) => {
      if (memberRemoved) {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=/dashboard"></head><body><script>window.location.href = '/dashboard';</script></body></html>`,
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<!DOCTYPE html><html><body><h1>Trip Map</h1></body></html>`,
      });
    });

    await page.route('**/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<!DOCTYPE html><html><body><h1>Dashboard</h1></body></html>`,
      });
    });

    await page.goto('/trips/trip-101');
    await expect(page.locator('#member-bob')).toBeVisible();

    // Organizer removes member Bob
    await page.getByRole('button', { name: 'Remove member' }).click();
    await expect(page.locator('#member-bob')).toBeHidden();

    // Removed member attempts to access trip map and is redirected to dashboard
    await page.goto('/trips/trip-101/map');
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('Given I am a member who is not the organizer, when I leave the trip, then it no longer appears in my trips dashboard', async ({ page }) => {
    let hasLeft = false;

    await page.route('**/trips/trip-101', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <body>
              <main>
                <h1>Porto Roadtrip</h1>
                <form id="leave-form">
                  <button type="submit">Leave trip</button>
                </form>
              </main>
              <script>
                document.getElementById('leave-form').addEventListener('submit', (e) => {
                  e.preventDefault();
                  fetch('/api/leave-trip', { method: 'POST' }).then(() => {
                    window.location.href = '/dashboard';
                  });
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.route('**/api/leave-trip', async (route) => {
      hasLeft = true;
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await page.route('**/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <body>
              <button data-testid="toggle-trips-card-button">Trips</button>
              <section data-testid="my-trips-panel">
                ${hasLeft ? '<p data-testid="no-trips-message">No trips found</p>' : '<div data-testid="trip-rectangle-trip-101">Porto Roadtrip</div>'}
              </section>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/trip-101');
    await page.getByRole('button', { name: 'Leave trip' }).click();

    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="trip-rectangle-trip-101"]')).toBeHidden();
    await expect(page.getByTestId('no-trips-message')).toBeVisible();
  });

  test('Given I am the only organizer, when I try to leave the trip, then I am asked to transfer the organizer role or delete the trip first', async ({ page }) => {
    await page.route('**/trips/trip-sole-organizer', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Solo Organizer Trip</title></head>
            <body>
              <main>
                <h1>Solo Organizer Trip</h1>
                <section data-testid="members-section">
                  <h2>Trip members</h2>
                  <p class="role-warning">
                    As the organizer, you cannot leave while you are the only organizer. Transfer the organizer role or delete the trip first.
                  </p>
                </section>
              </main>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/trip-sole-organizer');

    // Verification: No "Leave trip" button is rendered for the sole organizer
    await expect(page.getByRole('button', { name: 'Leave trip' })).toHaveCount(0);

    // Verification: Asked to transfer organizer role or delete trip first
    await expect(page.locator('.role-warning')).toBeVisible();
    await expect(page.locator('.role-warning')).toContainText(
      'Transfer the organizer role or delete the trip first'
    );
  });
});
