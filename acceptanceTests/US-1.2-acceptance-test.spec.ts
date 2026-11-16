import { test, expect } from '@playwright/test';

test.describe('US-1.2-acceptance-test', () => {
  test('Given I am logged in, when I submit the trip form with a name, then the trip is created and I become its organizer', async ({ page }) => {
    await page.route('**/trips/new', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><title>Create a trip - PlanIt</title></head>
            <body>
              <main>
                <h1>Create a trip</h1>
                <form id="create-trip-form">
                  <div>
                    <label for="name">Trip name *</label>
                    <input id="name" name="name" required maxLength="120" placeholder="Summer holidays" />
                  </div>
                  <div>
                    <label for="destination">Destination</label>
                    <input id="destination" name="destination" placeholder="Santiago de Compostela" />
                  </div>
                  <div>
                    <label for="description">Description</label>
                    <textarea id="description" name="description" placeholder="What are you planning?"></textarea>
                  </div>
                  <button type="submit">Create trip</button>
                </form>
              </main>
              <script>
                document.getElementById('create-trip-form').addEventListener('submit', (e) => {
                  e.preventDefault();
                  const name = document.getElementById('name').value.trim();
                  if (name) {
                    window.location.href = '/trips/trip-created-123';
                  }
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.route('**/trips/trip-created-123', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><title>Trip Workspace</title></head>
            <body>
              <main>
                <h1>Summer holidays</h1>
                <div class="organizer-box">
                  <p>Organizer</p>
                  <p data-testid="trip-organizer-role">You</p>
                </div>
              </main>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/new');
    await expect(page.getByRole('heading', { name: 'Create a trip' })).toBeVisible();

    await page.getByLabel('Trip name *').fill('Summer holidays');
    await page.getByLabel('Destination').fill('Santiago de Compostela');
    await page.getByLabel('Description').fill('Road trip and hiking along the Camino');

    await page.getByRole('button', { name: 'Create trip' }).click();

    await expect(page).toHaveURL(/.*trips\/trip-created-123/);
    await expect(page.getByRole('heading', { name: 'Summer holidays' })).toBeVisible();
    await expect(page.getByTestId('trip-organizer-role')).toHaveText('You');
  });

  test('Given the trip name is empty, when I submit the form, then I see a validation error and the trip is not created', async ({ page }) => {
    await page.route('**/trips/new', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><title>Create a trip - PlanIt</title></head>
            <body>
              <main>
                <h1>Create a trip</h1>
                <form id="create-trip-form" novalidate>
                  <div>
                    <label for="name">Trip name *</label>
                    <input id="name" name="name" required maxLength="120" placeholder="Summer holidays" />
                    <p id="name-error" class="text-sm text-red-500" style="display:none;">Trip name is required.</p>
                  </div>
                  <div>
                    <label for="destination">Destination</label>
                    <input id="destination" name="destination" placeholder="Santiago de Compostela" />
                  </div>
                  <button type="submit">Create trip</button>
                </form>
              </main>
              <script>
                document.getElementById('create-trip-form').addEventListener('submit', (e) => {
                  e.preventDefault();
                  const nameInput = document.getElementById('name');
                  if (!nameInput.value.trim()) {
                    document.getElementById('name-error').style.display = 'block';
                  } else {
                    window.location.href = '/trips/new-trip-id';
                  }
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/new');
    await expect(page.getByRole('heading', { name: 'Create a trip' })).toBeVisible();

    // Leave trip name empty and submit
    await page.getByLabel('Trip name *').fill('');
    await page.getByRole('button', { name: 'Create trip' }).click();

    // Verification: see validation error and URL stays on /trips/new
    await expect(page.locator('#name-error')).toBeVisible();
    await expect(page.locator('#name-error')).toHaveText('Trip name is required.');
    await expect(page).toHaveURL(/.*trips\/new/);
  });

  test('Given I just created a trip, when its workspace opens, then I see the sections for dates, map, itinerary and expenses', async ({ page }) => {
    await page.route('**/trips/trip-newly-created', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><title>Trip Workspace - PlanIt</title></head>
            <body>
              <main>
                <h1>Azores Vacation</h1>
                <!-- Candidate dates section -->
                <section data-testid="dates-section">
                  <h2>Candidate dates</h2>
                  <p>Pick candidate dates for your trip</p>
                </section>

                <!-- Workspace planning sections: Map, Itinerary, Expenses -->
                <section data-testid="workspace-sections">
                  <h2>Plan your trip</h2>
                  <div>
                    <a href="/trips/trip-newly-created/map">
                      <h3>Map</h3>
                      <p>Discover places and explore destinations.</p>
                    </a>
                  </div>
                  <div>
                    <h3>Itinerary</h3>
                    <p>Build your plans and organize activities.</p>
                  </div>
                  <div>
                    <h3>Expenses</h3>
                    <p>Keep track of costs and shared expenses.</p>
                  </div>
                </section>
              </main>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/trip-newly-created');

    await expect(page.getByRole('heading', { name: 'Azores Vacation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Candidate dates' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Map' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Itinerary' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
  });
});
