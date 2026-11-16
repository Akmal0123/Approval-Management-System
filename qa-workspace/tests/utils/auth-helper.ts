import { Page, expect } from '@playwright/test';
import { TEST_USERS, APP_ROUTES } from '../fixtures/test-data';

/**
 * Reusable authentication helper for AMS E2E tests
 */
export async function loginAs(
  page: Page,
  user: { email: string; password: string } = TEST_USERS.superAdmin
) {
  await page.goto(APP_ROUTES.login);

  // Fill credentials
  await page.fill('input[type="email"], input[name="email"], #email', user.email);
  await page.fill('input[type="password"], input[name="password"], #password', user.password);

  // Submit login form
  const submitBtn = page.getByRole('button', { name: /masuk|login|sign in/i });
  await submitBtn.click();

  // Wait for redirect to dashboard or intended page
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  await expect(page).not.toHaveURL(/\/login$/);
}

/**
 * Logout helper
 */
export async function logout(page: Page) {
  // Click user dropdown or logout button
  const userMenuBtn = page.locator('[data-testid="user-menu"], button[aria-label*="user"], .user-avatar, [data-sidebar="menu-button"]');
  if (await userMenuBtn.count() > 0) {
    await userMenuBtn.first().click();
    const logoutBtn = page.getByRole('menuitem', { name: /keluar|logout/i }).or(page.getByText(/keluar|logout/i));
    if (await logoutBtn.count() > 0) {
      await logoutBtn.first().click();
    }
  } else {
    await page.goto('/logout');
  }
}

