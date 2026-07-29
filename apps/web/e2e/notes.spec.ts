import { expect, test } from '@playwright/test';

// PGlite boots a WASM Postgres in the browser on first load — allow generous
// waits for the initial migration + seed before the UI renders.

test('boots with the seeded demo collection, creates a note that survives reload', async ({
  page
}) => {
  await page.goto('/');

  // The / route redirects to /notes
  await expect(page).toHaveURL(/\/notes$/);

  // Seeded demo collection is visible in the file tree
  const fileTree = page.locator('[data-collection-root]');
  await expect(fileTree.getByText('README.md')).toBeVisible({ timeout: 60_000 });

  // Create a note via the command menu (cmd+k -> New note)
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.getByPlaceholder('Search or jump to...')).toBeVisible();
  await page.keyboard.type('New note');
  await page.keyboard.press('Enter');

  await expect(fileTree.getByText('Untitled.md')).toBeVisible();

  // The new note opens focused — type into the editor and let auto-save run
  await page.keyboard.type('Hello from the e2e smoke test');
  await page.waitForTimeout(2_000); // auto_save_debounce is 750ms

  // Everything persists across a reload (IndexedDB-backed PGlite)
  await page.reload();
  await expect(fileTree.getByText('Untitled.md')).toBeVisible({ timeout: 60_000 });
  await fileTree.getByText('Untitled.md').click();
  await expect(page.getByText('Hello from the e2e smoke test')).toBeVisible();
});

test('command palette opens and collection search finds seeded content', async ({ page }) => {
  await page.goto('/notes');
  const fileTree = page.locator('[data-collection-root]');
  await expect(fileTree.getByText('README.md')).toBeVisible({ timeout: 60_000 });

  // cmd+k opens the command palette
  await page.keyboard.press('ControlOrMeta+k');
  await expect(page.getByPlaceholder('Search or jump to...')).toBeVisible();

  // Jump into collection search and look for seeded README content
  await page.keyboard.type('Search collection');
  await page.keyboard.press('Enter');
  const searchInput = page.locator('#notesSearch');
  await expect(searchInput).toBeVisible();
  await searchInput.fill('Tech Stack');
  await searchInput.press('Enter');

  // The grouped results reference the README note and matched context
  await expect(fileTree.getByText(/README/).first()).toBeVisible();
  await expect(fileTree.getByText(/Tech Stack/).first()).toBeVisible();
});
