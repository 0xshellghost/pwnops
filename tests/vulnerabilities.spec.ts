import { test, expect } from '@playwright/test';

// ──────────────────────────────────────────────────────────
// Vulnerabilities E2E Tests
// Verifies the vulnerabilities page and API protection.
// ──────────────────────────────────────────────────────────

test.describe('Vulnerabilities Page', () => {
  test('vulnerabilities page requires authentication', async ({ page }) => {
    await page.goto('/dashboard/vulnerabilities');
    await expect(page).toHaveURL(/.*\/login/);
  });
});

test.describe('Vulnerabilities API', () => {
  test('GET /api/vulnerabilities returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/vulnerabilities');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test('PATCH /api/vulnerabilities returns 401 without auth', async ({ request }) => {
    const response = await request.patch('/api/vulnerabilities', {
      data: {
        id: 'nonexistent-id',
        status: 'fixed',
      },
    });
    expect(response.status()).toBe(401);
  });

  test('GET /api/vulnerabilities supports query parameters', async ({ request }) => {
    // Unauthenticated request with filters should still return 401
    const response = await request.get('/api/vulnerabilities?severity=critical&status=open&search=test');
    expect(response.status()).toBe(401);
  });
});
