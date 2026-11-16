import { test, expect } from '@playwright/test';
import { loginAs } from '../utils/auth-helper';
import { TEST_USERS, APP_ROUTES } from '../fixtures/test-data';

test.describe('Document Lifecycle & Approval Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.superAdmin);
  });

  test('Navigate to Document Management page', async ({ page }) => {
    await page.goto(APP_ROUTES.dokumen);
    await expect(page).toHaveURL(/\/dokumen/);

    // Verify document management elements
    await expect(page.getByRole('button', { name: /buat dokumen|tambah dokumen|upload/i }).or(page.locator('button:has-text("Dokumen")')).first()).toBeVisible();
  });

  test('Check timeline and audit log tab', async ({ page }) => {
    await page.goto(APP_ROUTES.approvals);

    const docLink = page.locator('a[href*="/approvals/"]').first();
    if (await docLink.count() > 0) {
      await docLink.click();
      await page.waitForLoadState('networkidle');

      // Check if timeline or step progress is displayed
      const timeline = page.locator('div:has-text("Riwayat"), div:has-text("Timeline"), div:has-text("Tahapan")');
      await expect(timeline.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

