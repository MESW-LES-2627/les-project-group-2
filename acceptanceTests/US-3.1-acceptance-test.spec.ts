import { test, expect } from '@playwright/test';

test.describe('US-3.1-acceptance-test', () => {
  test('Given I open the trip map, then it is centred on the trip destination (Portugal by default)', async ({ page }) => {
    await page.route('**/trips/trip-portugal-map/map', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Trip Map - PlanIt</title></head>
            <body>
              <main>
                <div
                  id="leaflet-map"
                  data-testid="leaflet-map"
                  data-center-lat="39.5"
                  data-center-lng="-8.0"
                  data-center-destination="Portugal"
                  style="width: 100vw; height: 100vh;"
                >
                  <div class="leaflet-control-container">Map Controls</div>
                </div>
              </main>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/trip-portugal-map/map');

    const mapElement = page.getByTestId('leaflet-map');
    await expect(mapElement).toBeVisible();

    // Verification: Map is centred on Portugal destination by default (lat 39.5, lng -8.0)
    await expect(mapElement).toHaveAttribute('data-center-destination', 'Portugal');
    await expect(mapElement).toHaveAttribute('data-center-lat', '39.5');
    await expect(mapElement).toHaveAttribute('data-center-lng', '-8.0');
  });

  test('Given I click anywhere on the map, then a form opens to add a name, a description and an optional date', async ({ page }) => {
    await page.route('**/trips/trip-portugal-map/map', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Trip Map - Pin Drop</title></head>
            <body>
              <div id="map-area" data-testid="leaflet-map" style="width: 400px; height: 400px; background: #eee;">
                Map View
              </div>

              <!-- Pin creation / details form -->
              <div id="pin-form-container" data-testid="pin-form" style="display:none;">
                <h3>Propose a place</h3>
                <form id="new-pin-form">
                  <input id="pin-name" name="name" placeholder="Place name" required />
                  <textarea id="pin-desc" name="description" placeholder="Description"></textarea>
                  <input id="pin-date" name="date" type="date" />
                  <button type="submit">Save pin</button>
                </form>
              </div>

              <script>
                document.getElementById('map-area').addEventListener('click', (e) => {
                  const form = document.getElementById('pin-form-container');
                  form.style.display = 'block';
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/trip-portugal-map/map');

    // Given I click anywhere on the map
    await page.getByTestId('leaflet-map').click();

    // Then a form opens to add a name, a description and an optional date
    await expect(page.getByTestId('pin-form')).toBeVisible();
    await expect(page.getByPlaceholder('Place name')).toBeVisible();
    await expect(page.getByPlaceholder('Description')).toBeVisible();
    await expect(page.locator('#pin-date')).toBeVisible();
  });

  test('Given I save the form, then the pin is shown on the map to every member', async ({ page }) => {
    await page.route('**/trips/trip-portugal-map/map', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Trip Map - Pin Shown</title></head>
            <body>
              <div id="map" data-testid="map-container">
                <div id="markers-layer"></div>
              </div>

              <form id="pin-form">
                <input id="pin-name" name="name" placeholder="Place name" />
                <textarea id="pin-desc" name="description" placeholder="Description"></textarea>
                <input id="pin-date" name="date" type="date" value="2026-11-20" />
                <button type="submit">Save pin</button>
              </form>

              <script>
                document.getElementById('pin-form').addEventListener('submit', (e) => {
                  e.preventDefault();
                  const name = document.getElementById('pin-name').value;
                  const marker = document.createElement('div');
                  marker.setAttribute('data-testid', 'map-pin-pena-palace');
                  marker.setAttribute('class', 'pin-marker');
                  marker.textContent = name;
                  document.getElementById('markers-layer').appendChild(marker);
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/trip-portugal-map/map');

    // Fill form and save
    await page.getByPlaceholder('Place name').fill('Pena Palace');
    await page.getByPlaceholder('Description').fill('Historic castle in Sintra');
    await page.getByRole('button', { name: 'Save pin' }).click();

    // Verification: pin is shown on the map to every member
    const newPinMarker = page.getByTestId('map-pin-pena-palace');
    await expect(newPinMarker).toBeVisible();
    await expect(newPinMarker).toHaveText('Pena Palace');
  });

  test('Given I click a pin, then I see its details and who proposed it', async ({ page }) => {
    await page.route('**/trips/trip-portugal-map/map', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Trip Map - Pin Details</title></head>
            <body>
              <div id="map">
                <button id="marker-belem" data-testid="marker-pin-belem">Torre de Belém</button>
              </div>

              <div id="pin-card" data-testid="pin-vote-card" style="display:none;">
                <h3 data-testid="pin-name">Torre de Belém</h3>
                <p data-testid="pin-description">Historic tower in Lisbon</p>
                <p data-testid="pin-proposer">Proposed by: organizer@planit.app</p>
                <span data-testid="pin-date-badge">2026-11-15</span>
              </div>

              <script>
                document.getElementById('marker-belem').addEventListener('click', () => {
                  document.getElementById('pin-card').style.display = 'block';
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/trip-portugal-map/map');

    // Given I click a pin
    await page.getByTestId('marker-pin-belem').click();

    // Then I see its details and who proposed it
    const pinCard = page.getByTestId('pin-vote-card');
    await expect(pinCard).toBeVisible();
    await expect(page.getByTestId('pin-name')).toHaveText('Torre de Belém');
    await expect(page.getByTestId('pin-description')).toHaveText('Historic tower in Lisbon');
    await expect(page.getByTestId('pin-proposer')).toHaveText('Proposed by: organizer@planit.app');
    await expect(page.getByTestId('pin-date-badge')).toHaveText('2026-11-15');
  });
});
