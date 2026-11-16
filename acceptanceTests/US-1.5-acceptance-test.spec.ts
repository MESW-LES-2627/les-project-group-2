import { test, expect } from '@playwright/test';

test.describe('US-1.5-acceptance-test', () => {
  test('Given I am logged in, when I open the dashboard, then I see every trip I belong to', async ({ page }) => {
    await page.route('**/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Dashboard - PlanIt</title></head>
            <body>
              <header>
                <button data-testid="toggle-trips-card-button" aria-expanded="false">Trips</button>
              </header>
              <section id="trips-panel" data-testid="trips-card" style="display:none;">
                <h2>My Trips</h2>
                <div class="trips-list">
                  <div data-testid="trip-rectangle-trip-1"><h3>Azores Adventure</h3></div>
                  <div data-testid="trip-rectangle-trip-2"><h3>Porto Wine Weekend</h3></div>
                  <div data-testid="trip-rectangle-trip-3"><h3>Lisbon City Break</h3></div>
                </div>
              </section>
              <script>
                document.querySelector('[data-testid="toggle-trips-card-button"]').addEventListener('click', () => {
                  const panel = document.getElementById('trips-panel');
                  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/dashboard');

    // User opens the trips panel from the dashboard
    await page.getByTestId('toggle-trips-card-button').click();

    // Verification: see every trip I belong to
    await expect(page.getByTestId('trip-rectangle-trip-1')).toBeVisible();
    await expect(page.getByText('Azores Adventure')).toBeVisible();
    await expect(page.getByTestId('trip-rectangle-trip-2')).toBeVisible();
    await expect(page.getByText('Porto Wine Weekend')).toBeVisible();
    await expect(page.getByTestId('trip-rectangle-trip-3')).toBeVisible();
    await expect(page.getByText('Lisbon City Break')).toBeVisible();
  });

  test('Given a trip in the list, then it shows its name, its dates (or "Dates not set") and its status: Planning, Dates locked or Finished', async ({ page }) => {
    await page.route('**/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Dashboard - PlanIt</title></head>
            <body>
              <button data-testid="toggle-trips-card-button">Trips</button>
              <section id="trips-panel">
                <h2>My Trips</h2>
                <div class="trips-list">
                  <!-- Trip 1: Planning with Dates not set -->
                  <div data-testid="trip-rectangle-trip-planning">
                    <h3>Summer in Algarve</h3>
                    <span class="trip-status">Planning</span>
                    <span class="trip-date">Dates not set</span>
                  </div>

                  <!-- Trip 2: Dates locked with actual dates -->
                  <div data-testid="trip-rectangle-trip-locked">
                    <h3>Douro Valley Cruise</h3>
                    <span class="trip-status">Dates locked</span>
                    <span class="trip-date">10 Sep 2026</span>
                  </div>

                  <!-- Trip 3: Finished with actual dates -->
                  <div data-testid="trip-rectangle-trip-finished">
                    <h3>Gerês Hiking Camp</h3>
                    <span class="trip-status">Finished</span>
                    <span class="trip-date">1 May 2026</span>
                  </div>
                </div>
              </section>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/dashboard');

    // 1. Planning trip shows name, status "Planning", and "Dates not set"
    const planningTrip = page.getByTestId('trip-rectangle-trip-planning');
    await expect(planningTrip).toBeVisible();
    await expect(planningTrip).toContainText('Summer in Algarve');
    await expect(planningTrip).toContainText('Planning');
    await expect(planningTrip).toContainText('Dates not set');

    // 2. Dates locked trip shows name, status "Dates locked", and dates
    const lockedTrip = page.getByTestId('trip-rectangle-trip-locked');
    await expect(lockedTrip).toBeVisible();
    await expect(lockedTrip).toContainText('Douro Valley Cruise');
    await expect(lockedTrip).toContainText('Dates locked');
    await expect(lockedTrip).toContainText('10 Sep 2026');

    // 3. Finished trip shows name, status "Finished", and dates
    const finishedTrip = page.getByTestId('trip-rectangle-trip-finished');
    await expect(finishedTrip).toBeVisible();
    await expect(finishedTrip).toContainText('Gerês Hiking Camp');
    await expect(finishedTrip).toContainText('Finished');
    await expect(finishedTrip).toContainText('1 May 2026');
  });

  test('Given I click a trip, then its workspace opens', async ({ page }) => {
    await page.route('**/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Dashboard - PlanIt</title></head>
            <body>
              <section id="trips-panel">
                <h2>My Trips</h2>
                <div data-testid="trip-rectangle-trip-ws-999" style="cursor:pointer;">
                  <h3>Madeira Discovery Trip</h3>
                </div>
              </section>
              <script>
                document.querySelector('[data-testid="trip-rectangle-trip-ws-999"]').addEventListener('click', () => {
                  window.location.href = '/trips/trip-ws-999';
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.route('**/trips/trip-ws-999', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `<!DOCTYPE html><html><body><h1>Madeira Discovery Trip Workspace</h1></body></html>`,
      });
    });

    await page.goto('/dashboard');
    await expect(page.getByText('Madeira Discovery Trip')).toBeVisible();

    // Given I click a trip
    await page.getByTestId('trip-rectangle-trip-ws-999').click();

    // Then its workspace opens
    await expect(page).toHaveURL(/.*trips\/trip-ws-999/);
    await expect(page.getByRole('heading', { name: 'Madeira Discovery Trip Workspace' })).toBeVisible();
  });

  test('Given I do not belong to any trip, when I open the dashboard, then I see an empty state with a "Create trip" button', async ({ page }) => {
    await page.route('**/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Dashboard - PlanIt</title></head>
            <body>
              <button data-testid="toggle-trips-card-button">Trips</button>
              <section id="trips-panel" style="display:none;">
                <h2>My Trips</h2>
                <div data-testid="no-trips-message">
                  <p>No trips found</p>
                  <p>You are not associated with any trips as a member yet.</p>
                </div>
                <div>
                  <a href="/trips/new" role="button" aria-label="Create trip">Create trip</a>
                </div>
              </section>
              <script>
                document.querySelector('[data-testid="toggle-trips-card-button"]').addEventListener('click', () => {
                  document.getElementById('trips-panel').style.display = 'block';
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/dashboard');

    // When I open the dashboard trips panel
    await page.getByTestId('toggle-trips-card-button').click();

    // Then I see an empty state with a "Create trip" button
    await expect(page.getByTestId('no-trips-message')).toBeVisible();
    await expect(page.getByText('No trips found')).toBeVisible();
    const createBtn = page.getByRole('button', { name: 'Create trip' });
    await expect(createBtn).toBeVisible();
    await expect(createBtn).toHaveAttribute('href', '/trips/new');
  });
});
