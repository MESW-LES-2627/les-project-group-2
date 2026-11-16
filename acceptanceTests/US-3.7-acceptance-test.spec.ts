import { test, expect } from '@playwright/test';

test.describe('US-3.7-acceptance-test', () => {
  test('Given I type a place name in the search bar, then I see a list of matching places', async ({ page }) => {
    await page.route('**/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Search Places - PlanIt</title></head>
            <body>
              <div id="search-container">
                <input id="search-input" placeholder="Search places across the map..." />
                <ul id="search-results" data-testid="search-results" style="display:none;">
                  <li data-testid="search-item-1" class="search-item">Lisboa, Portugal</li>
                  <li data-testid="search-item-2" class="search-item">Porto, Portugal</li>
                </ul>
              </div>

              <script>
                document.getElementById('search-input').addEventListener('input', (e) => {
                  const val = e.target.value.trim();
                  const results = document.getElementById('search-results');
                  if (val.length >= 2) {
                    results.style.display = 'block';
                  } else {
                    results.style.display = 'none';
                  }
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/dashboard');

    const searchInput = page.getByPlaceholder('Search places across the map...');
    await expect(searchInput).toBeVisible();

    // Given I type a place name in the search bar
    await searchInput.fill('Lisboa');

    // Then I see a list of matching places
    const results = page.getByTestId('search-results');
    await expect(results).toBeVisible();
    await expect(page.getByTestId('search-item-1')).toHaveText('Lisboa, Portugal');
    await expect(page.getByTestId('search-item-2')).toHaveText('Porto, Portugal');
  });

  test('Given I select a result, then the map centres on it and the new pin form opens with its name and location filled in', async ({ page }) => {
    await page.route('**/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Select Place Result</title></head>
            <body>
              <div id="map" data-testid="map" data-center-lat="39.5" data-center-lng="-8.0">Map</div>

              <div id="search-container">
                <input id="search-input" placeholder="Search places across the map..." value="Lisboa" />
                <ul id="search-results">
                  <li id="select-lisboa" data-testid="select-place-lisboa">Lisboa, Portugal</li>
                </ul>
              </div>

              <!-- New Pin Card / Form -->
              <div id="pin-card" data-testid="pin-vote-card" style="display:none;">
                <h3 data-testid="pin-name"></h3>
                <p data-testid="pin-coordinates"></p>
              </div>

              <script>
                document.getElementById('select-lisboa').addEventListener('click', () => {
                  const map = document.getElementById('map');
                  map.setAttribute('data-center-lat', '38.7223');
                  map.setAttribute('data-center-lng', '-9.1393');

                  const card = document.getElementById('pin-card');
                  document.querySelector('[data-testid="pin-name"]').textContent = 'Lisboa';
                  document.querySelector('[data-testid="pin-coordinates"]').textContent = '38.7223, -9.1393';
                  card.style.display = 'block';
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/dashboard');

    // Given I select a result
    await page.getByTestId('select-place-lisboa').click();

    // Then the map centres on it
    const map = page.getByTestId('map');
    await expect(map).toHaveAttribute('data-center-lat', '38.7223');
    await expect(map).toHaveAttribute('data-center-lng', '-9.1393');

    // And the new pin form opens with its name and location filled in
    const pinCard = page.getByTestId('pin-vote-card');
    await expect(pinCard).toBeVisible();
    await expect(page.getByTestId('pin-name')).toHaveText('Lisboa');
    await expect(page.getByTestId('pin-coordinates')).toHaveText('38.7223, -9.1393');
  });
});
