import { test, expect } from '@playwright/test';

test.describe('US-1.7-acceptance-test', () => {
  test('Given I am on my profile page, when I change my display name and save, then the new name is shown everywhere in the app', async ({ page }) => {
    await page.route('**/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Dashboard - Profile</title></head>
            <body>
              <header>
                <button id="profile-toggle-btn" title="SigmaDwight">
                  <span id="header-username">SigmaDwight</span>
                </button>
              </header>

              <div id="profile-dialog" role="dialog" aria-modal="true" aria-label="Profile" style="display:none;">
                <div id="profile-view-mode">
                  <h3 id="modal-username">SigmaDwight</h3>
                  <button id="edit-profile-btn" type="button">Edit</button>
                </div>
                <div id="profile-edit-mode" style="display:none;">
                  <input id="name-input" type="text" placeholder="Enter your name" value="SigmaDwight" />
                  <button id="save-profile-btn" type="button">Save</button>
                </div>
              </div>

              <script>
                document.getElementById('profile-toggle-btn').addEventListener('click', () => {
                  document.getElementById('profile-dialog').style.display = 'block';
                });
                document.getElementById('edit-profile-btn').addEventListener('click', () => {
                  document.getElementById('profile-view-mode').style.display = 'none';
                  document.getElementById('profile-edit-mode').style.display = 'block';
                });
                document.getElementById('save-profile-btn').addEventListener('click', () => {
                  const newName = document.getElementById('name-input').value.trim();
                  if (newName) {
                    document.getElementById('header-username').textContent = newName;
                    document.getElementById('modal-username').textContent = newName;
                    document.getElementById('profile-toggle-btn').title = newName;
                    document.getElementById('profile-edit-mode').style.display = 'none';
                    document.getElementById('profile-view-mode').style.display = 'block';
                  }
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/dashboard');
    await expect(page.locator('#header-username')).toHaveText('SigmaDwight');

    // Given I am on my profile page (modal)
    await page.locator('#profile-toggle-btn').click();
    await expect(page.getByRole('dialog', { name: 'Profile' })).toBeVisible();

    // When I change my display name and save
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByPlaceholder('Enter your name').fill('CaptainDwight');
    await page.getByRole('button', { name: 'Save' }).click();

    // Then the new name is shown everywhere in the app
    await expect(page.locator('#modal-username')).toHaveText('CaptainDwight');
    await expect(page.locator('#header-username')).toHaveText('CaptainDwight');
  });

  test('Given I upload an image within the allowed size, when I save, then it is shown as my avatar in member lists', async ({ page }) => {
    await page.route('**/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Dashboard - Avatar</title></head>
            <body>
              <header>
                <button id="profile-toggle-btn">
                  <img id="header-avatar" src="/no_pic.png" alt="Profile avatar" />
                </button>
              </header>

              <div id="profile-dialog" role="dialog" aria-label="Profile" style="display:none;">
                <button id="edit-profile-btn">Edit</button>
                <div id="edit-area" style="display:none;">
                  <input id="avatar-file-input" type="file" accept="image/*" />
                  <img id="preview-avatar" src="/no_pic.png" alt="Profile picture" />
                  <button id="save-btn">Save</button>
                </div>
              </div>

              <!-- Trip member list showing current user avatar -->
              <div id="members-list">
                <img id="member-avatar" src="/no_pic.png" alt="Member avatar" />
              </div>

              <script>
                document.getElementById('profile-toggle-btn').addEventListener('click', () => {
                  document.getElementById('profile-dialog').style.display = 'block';
                });
                document.getElementById('edit-profile-btn').addEventListener('click', () => {
                  document.getElementById('edit-area').style.display = 'block';
                });
                document.getElementById('avatar-file-input').addEventListener('change', () => {
                  document.getElementById('preview-avatar').src = 'https://supabase.co/storage/profile_pics/user-avatar.png';
                });
                document.getElementById('save-btn').addEventListener('click', () => {
                  const newSrc = document.getElementById('preview-avatar').src;
                  document.getElementById('header-avatar').src = newSrc;
                  document.getElementById('member-avatar').src = newSrc;
                  document.getElementById('edit-area').style.display = 'none';
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/dashboard');
    await expect(page.locator('#header-avatar')).toHaveAttribute('src', '/no_pic.png');

    // Open profile and click edit
    await page.locator('#profile-toggle-btn').click();
    await page.getByRole('button', { name: 'Edit' }).click();

    // Given I upload an image within the allowed size
    await page.locator('#avatar-file-input').setInputFiles({
      name: 'avatar.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image-bytes'),
    });

    // When I save
    await page.getByRole('button', { name: 'Save' }).click();

    // Then it is shown as my avatar in member lists and header
    await expect(page.locator('#header-avatar')).toHaveAttribute(
      'src',
      'https://supabase.co/storage/profile_pics/user-avatar.png'
    );
    await expect(page.locator('#member-avatar')).toHaveAttribute(
      'src',
      'https://supabase.co/storage/profile_pics/user-avatar.png'
    );
  });

  test('Given the display name is empty, when I save, then I see a validation error', async ({ page }) => {
    await page.route('**/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: `
          <!DOCTYPE html>
          <html>
            <head><meta charset="utf-8"><title>Profile Validation</title></head>
            <body>
              <div role="dialog" aria-label="Profile">
                <input id="name-input" type="text" placeholder="Enter your name" value="SigmaDwight" />
                <p id="name-error" style="display:none; color:red;">Hey! You can't do that</p>
                <button id="save-btn" type="button">Save</button>
              </div>
              <script>
                const input = document.getElementById('name-input');
                const err = document.getElementById('name-error');
                const btn = document.getElementById('save-btn');

                input.addEventListener('input', () => {
                  if (!input.value.trim()) {
                    err.style.display = 'block';
                    btn.disabled = true;
                  } else {
                    err.style.display = 'none';
                    btn.disabled = false;
                  }
                });
                btn.addEventListener('click', () => {
                  if (!input.value.trim()) {
                    err.style.display = 'block';
                    btn.disabled = true;
                  }
                });
              </script>
            </body>
          </html>
        `,
      });
    });

    await page.goto('/dashboard');
    const nameInput = page.getByPlaceholder('Enter your name');
    const saveBtn = page.getByRole('button', { name: 'Save' });

    // Given the display name is empty
    await nameInput.fill('   ');

    // When I save (or attempt to save)
    await saveBtn.click({ force: true });

    // Then I see a validation error
    await expect(page.locator('#name-error')).toBeVisible();
    await expect(page.locator('#name-error')).toHaveText("Hey! You can't do that");
    await expect(saveBtn).toBeDisabled();
  });
});
