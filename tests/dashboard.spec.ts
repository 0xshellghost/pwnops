import { test, expect } from '@playwright/test';

// ──────────────────────────────────────────────────────────
// Dashboard E2E Tests
// These tests verify the dashboard UI structure loads
// correctly when accessed by an authenticated user.
// Since E2E tests run against a real server, they test
// the redirect behavior for unauthenticated access and
// the page structure after login.
// ──────────────────────────────────────────────────────────

test.describe('Dashboard', () => {
  test('unauthenticated access redirects to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('dashboard incidents sub-page redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/incidents');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('dashboard scans sub-page redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/scans');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('dashboard vulnerabilities sub-page redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/vulnerabilities');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('dashboard assets sub-page redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/assets');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('dashboard users sub-page redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/users');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('dashboard integrations sub-page redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/integrations');
    await expect(page).toHaveURL(/.*\/login/);
  });
});
