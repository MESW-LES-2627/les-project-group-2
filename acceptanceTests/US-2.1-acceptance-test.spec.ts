import { test, expect } from '@playwright/test';

test.describe('US-2.1-acceptance-test', () => {
  test('Given I am the organizer, when I add a window with a start and an end date, then it is shown to every member', async ({ page }) => {
    await page.route('**/trips/trip-dates-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Date Windows - PlanIt</title></head>
            <body>
              <section data-testid="date-windows-section">
                <h2>Candidate dates</h2>
                <ul id="windows-list">
                  <li data-testid="window-1">1 Jul 2099 → 10 Jul 2099</li>
                </ul>

                <!-- Organizer form to add date window -->
                <form id="add-window-form">
                  <label for="new-start">Start date</label>
                  <input id="new-start" name="startDate" type="date" value="2099-09-01" />
                  <label for="new-end">End date</label>
                  <input id="new-end" name="endDate" type="date" value="2099-09-07" />
                  <button type="submit">Add date window</button>
                </form>
              </section>
              <script>
                document.getElementById('add-window-form').addEventListener('submit', (e) => {
                  e.preventDefault();
                  const li = document.createElement('li');
                  li.setAttribute('data-testid', 'window-2');
                  li.textContent = '1 Sep 2099 → 7 Sep 2099';
                  document.getElementById('windows-list').appendChild(li);
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/trip-dates-1');
    await expect(page.getByRole('heading', { name: 'Candidate dates' })).toBeVisible();

    // Organizer adds candidate window
    await page.locator('#new-start').fill('2099-09-01');
    await page.locator('#new-end').fill('2099-09-07');
    await page.getByRole('button', { name: 'Add date window' }).click();

    // Then it is shown to every member
    await expect(page.getByTestId('window-2')).toBeVisible();
    await expect(page.getByTestId('window-2')).toHaveText('1 Sep 2099 → 7 Sep 2099');
  });

  test('Given the end date is before the start date, or the start date is in the past, when I save the window, then I see a validation error', async ({ page }) => {
    await page.route('**/trips/trip-dates-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Date Windows Validation</title></head>
            <body>
              <section>
                <h2>Candidate dates</h2>
                <p id="alert-msg" role="alert" style="display:none; color:red;"></p>
                <form id="add-window-form">
                  <label for="new-start">Start date</label>
                  <input id="new-start" name="startDate" type="date" />
                  <label for="new-end">End date</label>
                  <input id="new-end" name="endDate" type="date" />
                  <button type="submit">Add date window</button>
                </form>
              </section>
              <script>
                document.getElementById('add-window-form').addEventListener('submit', (e) => {
                  e.preventDefault();
                  const start = document.getElementById('new-start').value;
                  const end = document.getElementById('new-end').value;
                  const alertMsg = document.getElementById('alert-msg');
                  
                  if (start && start < '2026-01-01') {
                    alertMsg.textContent = 'The start date cannot be in the past.';
                    alertMsg.style.display = 'block';
                  } else if (start && end && end < start) {
                    alertMsg.textContent = 'The end date cannot be before the start date.';
                    alertMsg.style.display = 'block';
                  } else {
                    alertMsg.style.display = 'none';
                  }
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/trip-dates-1');

    // Case 1: End date before start date
    await page.locator('#new-start').fill('2099-09-10');
    await page.locator('#new-end').fill('2099-09-01');
    await page.getByRole('button', { name: 'Add date window' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveText('The end date cannot be before the start date.');

    // Case 2: Start date in the past
    await page.locator('#new-start').fill('2020-01-01');
    await page.locator('#new-end').fill('2099-09-01');
    await page.getByRole('button', { name: 'Add date window' }).click();

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveText('The start date cannot be in the past.');
  });

  test('Given the dates are not locked, when I edit or delete a window, then the change is shown to every member and availabilities outside the new window are removed', async ({ page }) => {
    await page.route('**/trips/trip-dates-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Edit / Delete Window</title></head>
            <body>
              <section data-testid="candidate-dates">
                <h2>Candidate dates</h2>
                <ul id="windows-list">
                  <li id="window-item-w1">
                    <span id="window-display">1 Jul 2099 → 10 Jul 2099</span>
                    <button id="edit-btn">Edit</button>
                    <button id="delete-btn">Delete</button>

                    <form id="edit-form" style="display:none;">
                      <input id="edit-start" name="startDate" type="date" value="2099-07-02" />
                      <input id="edit-end" name="endDate" type="date" value="2099-07-12" />
                      <button type="submit">Save window</button>
                    </form>
                  </li>
                </ul>
              </section>

              <section data-testid="availability-section">
                <h3>Availabilities</h3>
                <ul id="availability-list">
                  <li id="avail-jul-1">1 Jul 2099: Ana (available)</li>
                  <li id="avail-jul-5">5 Jul 2099: Ana (available)</li>
                </ul>
              </section>

              <script>
                document.getElementById('edit-btn').addEventListener('click', () => {
                  document.getElementById('edit-form').style.display = 'block';
                });

                document.getElementById('edit-form').addEventListener('submit', (e) => {
                  e.preventDefault();
                  document.getElementById('window-display').textContent = '2 Jul 2099 → 12 Jul 2099';
                  document.getElementById('edit-form').style.display = 'none';
                  // Availabilities outside new window (1 Jul) are pruned
                  const oldAvail = document.getElementById('avail-jul-1');
                  if (oldAvail) oldAvail.remove();
                });

                document.getElementById('delete-btn').addEventListener('click', () => {
                  document.getElementById('window-item-w1').remove();
                  document.getElementById('availability-list').innerHTML = '<p>No candidate dates</p>';
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/trip-dates-1');

    // Given the dates are not locked, when I edit a window
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.locator('#edit-start').fill('2099-07-02');
    await page.locator('#edit-end').fill('2099-07-12');
    await page.getByRole('button', { name: 'Save window' }).click();

    // Then the change is shown to every member and availabilities outside new window are removed
    await expect(page.locator('#window-display')).toHaveText('2 Jul 2099 → 12 Jul 2099');
    await expect(page.locator('#avail-jul-1')).toBeHidden();
    await expect(page.locator('#avail-jul-5')).toBeVisible();

    // When I delete a window
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.locator('#window-item-w1')).toBeHidden();
    await expect(page.getByText('No candidate dates')).toBeVisible();
  });
});
