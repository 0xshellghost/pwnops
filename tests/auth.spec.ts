import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('unauthenticated users are redirected to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('login page displays form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toHaveText('Authorize Access ⊘');
  });

  test('login page displays heading and description', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toHaveText('Initialize Session');
    await expect(page.locator('text=Identify yourself to access the platform.')).toBeVisible();
  });

  test('login with empty fields shows validation', async ({ page }) => {
    await page.goto('/login');
    // HTML5 required validation prevents submission — the button should be present and enabled
    const emailInput = page.locator('input[type="email"]');
    const submitBtn = page.locator('button[type="submit"]');
    await expect(emailInput).toHaveAttribute('required', '');
    await expect(submitBtn).toBeEnabled();
  });

  test('login page shows forgot password link', async ({ page }) => {
    await page.goto('/login');
    const forgotLink = page.locator('a[href="/forgot-password"]');
    await expect(forgotLink).toBeVisible();
    await expect(forgotLink).toHaveText('Forgot Access Key?');
  });

  test('login page shows OAuth provider buttons', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('a[href="/api/auth/github"]')).toBeVisible();
    await expect(page.locator('a[href="/api/auth/google"]')).toBeVisible();
  });

  test('login page has link to register page', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.locator('a[href="/register"]');
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveText('Provision account');
  });

  test('register page displays form with all fields', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('h1')).toHaveText('Provision Account');
    await expect(page.locator('input[type="text"]')).toBeVisible();    // Name
    await expect(page.locator('input[type="email"]')).toBeVisible();   // Email
    await expect(page.locator('input[type="password"]')).toBeVisible(); // Password
    await expect(page.locator('button[type="submit"]')).toHaveText('Create Secure Account ⊘');
  });

  test('register page has link back to login', async ({ page }) => {
    await page.goto('/register');
    const loginLink = page.locator('a[href="/login"]');
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveText('Initialize session');
  });

  test('forgot password page is accessible', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page).toHaveURL(/.*\/forgot-password/);
    // Should not redirect — it's a public page
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});
