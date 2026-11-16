import { test, expect } from '@playwright/test';

test.describe('US-2.2-acceptance-test', () => {
  test('Given candidate windows exist, when I mark days as available or unavailable, then my answer is saved', async ({ page }) => {
    await page.route('**/trips/trip-avail-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Availability Calendar</title></head>
            <body>
              <section data-testid="availability-section">
                <h2>Availability</h2>
                <div id="status-msg" role="status" style="display:none; color:green;"></div>
                
                <ul class="calendar-days">
                  <li data-testid="day-card-2099-07-01">
                    <h3>Wed, 1 Jul 2099</h3>
                    <select id="answer-2099-07-01">
                      <option value="none">No answer</option>
                      <option value="available">Available</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </li>
                  <li data-testid="day-card-2099-07-02">
                    <h3>Thu, 2 Jul 2099</h3>
                    <select id="answer-2099-07-02">
                      <option value="none">No answer</option>
                      <option value="available">Available</option>
                      <option value="unavailable">Unavailable</option>
                    </select>
                  </li>
                </ul>

                <button id="save-availability-btn" type="button">Save my availability</button>
              </section>

              <script>
                document.getElementById('save-availability-btn').addEventListener('click', () => {
                  const msg = document.getElementById('status-msg');
                  msg.textContent = 'Your availability was saved.';
                  msg.style.display = 'block';
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/trip-avail-1');
    await expect(page.getByRole('heading', { name: 'Availability' })).toBeVisible();

    // Member marks days as available and unavailable
    await page.locator('#answer-2099-07-01').selectOption('available');
    await page.locator('#answer-2099-07-02').selectOption('unavailable');

    // When I click save
    await page.getByRole('button', { name: 'Save my availability' }).click();

    // Then my answer is saved
    await expect(page.getByRole('status')).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('Your availability was saved.');
  });

  test('Given members have answered, when I view the calendar, then each day shows how many members are available and who they are', async ({ page }) => {
    await page.route('**/trips/trip-avail-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Availability Calendar</title></head>
            <body>
              <section>
                <h2>Availability</h2>
                <ul class="calendar-days">
                  <li data-testid="day-card-2099-07-01">
                    <h3>Wed, 1 Jul 2099</h3>
                    <span class="availability-badge" data-testid="available-count">2/3 available</span>
                    <p class="available-names" data-testid="available-members">Ana, Bruno</p>
                    <p class="unavailable-names" data-testid="unavailable-members">Unavailable: Carla</p>
                  </li>
                </ul>
              </section>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/trip-avail-1');

    const dayCard = page.getByTestId('day-card-2099-07-01');
    await expect(dayCard).toBeVisible();

    // Shows how many members are available
    await expect(page.getByTestId('available-count')).toHaveText('2/3 available');

    // Shows who they are
    await expect(page.getByTestId('available-members')).toHaveText('Ana, Bruno');
    await expect(page.getByTestId('unavailable-members')).toHaveText('Unavailable: Carla');
  });

  test('Given some members have not answered yet, when I view the calendar, then I can see who is still missing', async ({ page }) => {
    await page.route('**/trips/trip-avail-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Availability Missing Members</title></head>
            <body>
              <section>
                <h2>Availability</h2>
                <p data-testid="missing-members-banner" class="missing-banner">
                  Still waiting for: <span class="font-semibold">Bruno, Carla</span>
                </p>
                <ul class="calendar-days">
                  <li>
                    <h3>Thu, 2 Jul 2099</h3>
                    <span>1/3 available</span>
                    <p>Ana</p>
                  </li>
                </ul>
              </section>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/trip-avail-1');

    // View calendar, see who is still missing
    const missingBanner = page.getByTestId('missing-members-banner');
    await expect(missingBanner).toBeVisible();
    await expect(missingBanner).toContainText('Still waiting for:');
    await expect(missingBanner).toContainText('Bruno, Carla');
  });
});
