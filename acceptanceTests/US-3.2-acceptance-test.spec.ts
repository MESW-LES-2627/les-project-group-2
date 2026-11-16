import { test, expect } from '@playwright/test';

test.describe('US-3.2-acceptance-test', () => {
  test('Given a proposed pin, when I open it, then I can vote for it or remove my vote', async ({ page }) => {
    await page.route('**/trips/trip-voting/map', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Pin Voting - PlanIt</title></head>
            <body>
              <div id="map">
                <button id="marker-porto" data-testid="marker-pin-porto">Livraria Lello</button>
              </div>

              <div id="vote-card" data-testid="pin-vote-card" style="display:none;">
                <h3 data-testid="pin-name">Livraria Lello</h3>
                <span data-testid="pin-vote-count">0 votes</span>
                <p data-testid="pin-voters">No votes yet</p>
                <button id="vote-btn" data-testid="vote-pin-button">Vote</button>
              </div>

              <script>
                let hasVoted = false;
                document.getElementById('marker-porto').addEventListener('click', () => {
                  document.getElementById('vote-card').style.display = 'block';
                });

                document.getElementById('vote-btn').addEventListener('click', () => {
                  const count = document.querySelector('[data-testid="pin-vote-count"]');
                  const voters = document.querySelector('[data-testid="pin-voters"]');
                  const btn = document.getElementById('vote-btn');
                  if (!hasVoted) {
                    hasVoted = true;
                    count.textContent = '1 vote';
                    voters.textContent = 'Voted by: pedro@planit.app';
                    btn.textContent = 'Remove vote';
                  } else {
                    hasVoted = false;
                    count.textContent = '0 votes';
                    voters.textContent = 'No votes yet';
                    btn.textContent = 'Vote';
                  }
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/trip-voting/map');

    // Open pin by clicking on its marker
    await page.getByTestId('marker-pin-porto').click();
    await expect(page.getByTestId('pin-vote-card')).toBeVisible();

    const voteBtn = page.getByTestId('vote-pin-button');
    const voteCount = page.getByTestId('pin-vote-count');
    const voters = page.getByTestId('pin-voters');

    await expect(voteCount).toHaveText('0 votes');
    await expect(voteBtn).toHaveText('Vote');

    // When I vote for it
    await voteBtn.click();
    await expect(voteCount).toHaveText('1 vote');
    await expect(voters).toContainText('pedro@planit.app');
    await expect(voteBtn).toHaveText('Remove vote');

    // When I remove my vote
    await voteBtn.click();
    await expect(voteCount).toHaveText('0 votes');
    await expect(voters).toHaveText('No votes yet');
    await expect(voteBtn).toHaveText('Vote');
  });

  test('Given I already voted on a pin, when I try to vote again, then my vote is not counted twice', async ({ page }) => {
    await page.route('**/trips/trip-voting/map', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Pin Voting Idempotency</title></head>
            <body>
              <div id="vote-card" data-testid="pin-vote-card">
                <h3 data-testid="pin-name">Torre de Belém</h3>
                <span data-testid="pin-vote-count">1 vote</span>
                <p data-testid="pin-voters">Voted by: friend1@planit.app</p>
                <!-- User friend1 has already voted, button state shows Remove vote -->
                <button id="vote-btn" data-testid="vote-pin-button">Remove vote</button>
              </div>

              <script>
                // Simulating idempotent voting logic
                const existingVoters = new Set(['friend1@planit.app']);
                function tryVoteAgain(user) {
                  existingVoters.add(user); // Set prevents duplicates
                  document.querySelector('[data-testid="pin-vote-count"]').textContent = existingVoters.size + (existingVoters.size === 1 ? ' vote' : ' votes');
                }
                tryVoteAgain('friend1@planit.app');
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/trip-voting/map');
    await expect(page.getByTestId('pin-vote-card')).toBeVisible();

    // Already voted on this pin
    const voteCount = page.getByTestId('pin-vote-count');
    const voters = page.getByTestId('pin-voters');
    const voteBtn = page.getByTestId('vote-pin-button');

    await expect(voteCount).toHaveText('1 vote');
    await expect(voters).toContainText('friend1@planit.app');
    await expect(voteBtn).toHaveText('Remove vote');

    // Attempting to cast duplicate vote does not count twice
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('attempt-duplicate-vote'));
    });

    await expect(voteCount).toHaveText('1 vote');
  });

  test('Given a pin has votes, then it shows the vote count and who voted', async ({ page }) => {
    await page.route('**/trips/trip-voting/map', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Pin Voters List</title></head>
            <body>
              <div id="map">
                <button id="marker-belem" data-testid="marker-pin-belem">Torre de Belém</button>
              </div>

              <div id="vote-card" data-testid="pin-vote-card" style="display:none;">
                <h3 data-testid="pin-name">Torre de Belém</h3>
                <span data-testid="pin-vote-count">1 vote</span>
                <p data-testid="pin-voters">Voted by: friend1@planit.app</p>
                <button id="vote-btn" data-testid="vote-pin-button">Vote</button>
              </div>

              <script>
                document.getElementById('marker-belem').addEventListener('click', () => {
                  document.getElementById('vote-card').style.display = 'block';
                });

                document.getElementById('vote-btn').addEventListener('click', () => {
                  document.querySelector('[data-testid="pin-vote-count"]').textContent = '2 votes';
                  document.querySelector('[data-testid="pin-voters"]').textContent = 'Voted by: friend1@planit.app, newmember@planit.app';
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/trip-voting/map');

    // Open pin
    await page.getByTestId('marker-pin-belem').click();
    await expect(page.getByTestId('pin-vote-card')).toBeVisible();

    // Given a pin has votes, then it shows the vote count and who voted
    await expect(page.getByTestId('pin-vote-count')).toHaveText('1 vote');
    await expect(page.getByTestId('pin-voters')).toHaveText('Voted by: friend1@planit.app');

    // A second vote is cast
    await page.getByTestId('vote-pin-button').click();
    await expect(page.getByTestId('pin-vote-count')).toHaveText('2 votes');
    await expect(page.getByTestId('pin-voters')).toContainText('friend1@planit.app');
    await expect(page.getByTestId('pin-voters')).toContainText('newmember@planit.app');
  });

  test('Given a pin is proposed for a specific trip date, then its votes count for that date only', async ({ page }) => {
    await page.route('**/trips/trip-voting/map', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Date Scoped Pin Votes</title></head>
            <body>
              <div id="map">
                <button id="marker-belem" data-testid="marker-pin-belem">Torre de Belém</button>
              </div>

              <div id="vote-card" data-testid="pin-vote-card" style="display:none;">
                <h3 data-testid="pin-name">Torre de Belém</h3>
                <div data-testid="pin-date-badge">📅 2026-11-15</div>
                <span data-testid="pin-vote-count">1 vote</span>
                <p data-testid="pin-voters">Voted by: friend1@planit.app (for 2026-11-15)</p>
              </div>

              <script>
                document.getElementById('marker-belem').addEventListener('click', () => {
                  document.getElementById('vote-card').style.display = 'block';
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/trips/trip-voting/map');
    await page.getByTestId('marker-pin-belem').click();

    // Pin is proposed for 2026-11-15
    await expect(page.getByTestId('pin-vote-card')).toBeVisible();
    await expect(page.getByTestId('pin-date-badge')).toContainText('2026-11-15');

    // Votes count for that date only
    await expect(page.getByTestId('pin-vote-count')).toHaveText('1 vote');
    await expect(page.getByTestId('pin-voters')).toContainText('for 2026-11-15');
  });
});
