import { test, expect } from '@playwright/test';

// ──────────────────────────────────────────────────────────
// RBAC (Role-Based Access Control) E2E Tests
// Verifies that all protected API endpoints correctly
// reject unauthenticated requests with 401 status codes.
// This ensures the edge proxy (proxy.ts) is properly
// intercepting and blocking unauthorized access.
// ──────────────────────────────────────────────────────────

test.describe('RBAC: Protected API Routes return 401', () => {

  // ── Core Resource APIs ──────────────────────────────────
  test('GET /api/incidents requires auth', async ({ request }) => {
    const res = await request.get('/api/incidents');
    expect(res.status()).toBe(401);
  });

  test('GET /api/scans requires auth', async ({ request }) => {
    const res = await request.get('/api/scans');
    expect(res.status()).toBe(401);
  });

  test('GET /api/vulnerabilities requires auth', async ({ request }) => {
    const res = await request.get('/api/vulnerabilities');
    expect(res.status()).toBe(401);
  });

  test('GET /api/users requires auth', async ({ request }) => {
    const res = await request.get('/api/users');
    expect(res.status()).toBe(401);
  });

  test('GET /api/assets requires auth', async ({ request }) => {
    const res = await request.get('/api/assets');
    expect(res.status()).toBe(401);
  });

  test('GET /api/integrations requires auth', async ({ request }) => {
    const res = await request.get('/api/integrations');
    expect(res.status()).toBe(401);
  });

  test('GET /api/dashboard/metrics requires auth', async ({ request }) => {
    const res = await request.get('/api/dashboard/metrics');
    expect(res.status()).toBe(401);
  });

  test('GET /api/settings/apikeys requires auth', async ({ request }) => {
    const res = await request.get('/api/settings/apikeys');
    expect(res.status()).toBe(401);
  });

  test('GET /api/scans/tools requires auth', async ({ request }) => {
    const res = await request.get('/api/scans/tools');
    expect(res.status()).toBe(401);
  });

  // ── Write Operations ────────────────────────────────────
  test('POST /api/scans requires auth', async ({ request }) => {
    const res = await request.post('/api/scans', {
      data: { toolName: 'nmap', target: '10.0.0.1' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/incidents requires auth', async ({ request }) => {
    const res = await request.post('/api/incidents', {
      data: { title: 'Test', severity: 'low' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/assets requires auth', async ({ request }) => {
    const res = await request.post('/api/assets', {
      data: { name: 'Test Asset', type: 'ENDPOINT' },
    });
    expect(res.status()).toBe(401);
  });

  test('POST /api/integrations requires auth', async ({ request }) => {
    const res = await request.post('/api/integrations', {
      data: { name: 'Test', type: 'SLACK', endpoint: 'https://hooks.slack.com/test', events: [] },
    });
    expect(res.status()).toBe(401);
  });

  // ── Public Routes (should NOT return 401) ───────────────
  test('GET /api/health is publicly accessible', async ({ request }) => {
    const res = await request.get('/api/health');
    // Health check should be accessible without auth
    expect(res.status()).not.toBe(401);
  });

  test('POST /api/auth/login is publicly accessible', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'test@test.com', password: 'wrong' },
    });
    // Should return 401 (invalid credentials) not a proxy-level 401
    // The key difference: this endpoint is reachable, it just rejects bad creds
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Invalid credentials');
  });

  // ── Dashboard Page Protection ───────────────────────────
  test('all dashboard pages redirect to login', async ({ page }) => {
    const protectedPaths = [
      '/dashboard',
      '/dashboard/incidents',
      '/dashboard/scans',
      '/dashboard/vulnerabilities',
      '/dashboard/assets',
      '/dashboard/integrations',
      '/dashboard/users',
    ];

    for (const path of protectedPaths) {
      await page.goto(path);
      await expect(page).toHaveURL(/.*\/login/, { timeout: 5000 });
    }
  });
});
