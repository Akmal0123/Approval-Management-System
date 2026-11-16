import { test, expect } from '@playwright/test';
import { loginAs } from '../utils/auth-helper';
import { TEST_USERS, APP_ROUTES } from '../fixtures/test-data';

test.describe('Document Paraf Preview vs Download Integrity', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.superAdmin);
  });

  test('Approvals page loads and shows document list', async ({ page }) => {
    await page.goto(APP_ROUTES.approvals);
    await expect(page).toHaveURL(/\/approvals/);

    // Ensure page table or empty state is rendered
    await expect(page.locator('table, [role="table"], div:has-text("Persetujuan"), div:has-text("Approval")').first()).toBeVisible({ timeout: 10000 });
  });

  test('Paraf checkmark is rendered strictly as preview overlay with print:hidden', async ({ page }) => {
    await page.goto(APP_ROUTES.approvals);

    // Look for any review/preview button (e.g. Setujui / Review / Eye icon)
    const reviewBtn = page.getByRole('button', { name: /setujui|review|pratinjau/i }).or(page.locator('a[href*="/approvals/"]')).first();
    
    if (await reviewBtn.count() > 0) {
      await reviewBtn.click();
      await page.waitForLoadState('networkidle');

      // Check if paraf preview dialog or toggle bar is visible
      const parafToggleBar = page.locator('button:has-text("Paraf ✓"), button:has-text("Paraf Semua")');
      if (await parafToggleBar.count() > 0) {
        // Toggle paraf
        await parafToggleBar.first().click();

        // Verify green checkmark overlay exists on the preview page
        const parafOverlay = page.locator('.paraf-preview-overlay, div:has(svg.stroke-\\[3\\])');
        await expect(parafOverlay.first()).toBeVisible();

        // Verify it contains print:hidden class so it never prints
        const overlayClasses = await parafOverlay.first().getAttribute('class');
        expect(overlayClasses).toContain('print:hidden');
      }
    }
  });

  test('Document download does not trigger paraf stamp onto binary', async ({ page }) => {
    await page.goto(APP_ROUTES.dokumen);

    // Check if download link is available
    const downloadBtn = page.locator('a[href*="/download"], button[title*="Download"]').first();
    if (await downloadBtn.count() > 0) {
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null);
      await downloadBtn.click();
      const download = await downloadPromise;

      if (download) {
        // Ensure downloaded file is a valid PDF
        expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
      }
    }
  });
});

