import { test, expect } from '@playwright/test';
import { loginAs } from '../utils/auth-helper';
import { TEST_USERS, APP_ROUTES } from '../fixtures/test-data';

test.describe('Authentication & Access Control', () => {
  test('User can see login page with inputs', async ({ page }) => {
    await page.goto(APP_ROUTES.login);

    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /masuk|login/i })).toBeVisible();
  });

  test('Super Admin can log in successfully', async ({ page }) => {
    await loginAs(page, TEST_USERS.superAdmin);

    // Verify authenticated session
    await expect(page).toHaveURL(/\/dashboard|\/approvals/);
  });

  test('Shows error on invalid credentials', async ({ page }) => {
    await page.goto(APP_ROUTES.login);

    await page.fill('input[type="email"], input[name="email"]', 'wrong@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpass123');
    await page.getByRole('button', { name: /masuk|login/i }).click();

    // Verify error notification or inline error
    await expect(
      page.locator('.text-destructive, [role="alert"], .text-red-500, div:has-text("salah")').first()
    ).toBeVisible({ timeout: 5000 });
  });
});

