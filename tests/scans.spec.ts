import { test, expect } from '@playwright/test';

// ──────────────────────────────────────────────────────────
// Scans E2E Tests
// Verifies the scans page and API endpoint protection.
// ──────────────────────────────────────────────────────────

test.describe('Scans Page', () => {
  test('scans page requires authentication', async ({ page }) => {
    await page.goto('/dashboard/scans');
    await expect(page).toHaveURL(/.*\/login/);
  });
});

test.describe('Scans API', () => {
  test('GET /api/scans returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/scans');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test('POST /api/scans returns 401 without auth', async ({ request }) => {
    const response = await request.post('/api/scans', {
      data: {
        toolName: 'nmap',
        target: 'scanme.nmap.org',
      },
    });
    expect(response.status()).toBe(401);
  });

  test('GET /api/scans/tools returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/scans/tools');
    expect(response.status()).toBe(401);
  });

  test('POST /api/scans/schedule returns 401 without auth', async ({ request }) => {
    const response = await request.post('/api/scans/schedule', {
      data: {
        toolName: 'nmap',
        target: 'scanme.nmap.org',
        cronSchedule: '0 0 * * *',
      },
    });
    expect(response.status()).toBe(401);
  });
});
