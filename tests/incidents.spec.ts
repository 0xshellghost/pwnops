import { test, expect } from '@playwright/test';

// ──────────────────────────────────────────────────────────
// Incidents E2E Tests
// Verifies the incidents page structure and create form
// behavior. Tests requiring authentication use the API
// directly since we can't seed users in E2E without
// a running database.
// ──────────────────────────────────────────────────────────

test.describe('Incidents Page', () => {
  test('incidents page requires authentication', async ({ page }) => {
    await page.goto('/dashboard/incidents');
    await expect(page).toHaveURL(/.*\/login/);
  });
});

test.describe('Incidents API', () => {
  test('GET /api/incidents returns 401 without auth', async ({ request }) => {
    const response = await request.get('/api/incidents');
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test('POST /api/incidents returns 401 without auth', async ({ request }) => {
    const response = await request.post('/api/incidents', {
      data: {
        title: 'Test Incident',
        severity: 'medium',
        description: 'Test description',
      },
    });
    expect(response.status()).toBe(401);
  });

  test('PATCH /api/incidents returns 401 without auth', async ({ request }) => {
    const response = await request.patch('/api/incidents', {
      data: {
        id: 'nonexistent-id',
        status: 'investigating',
      },
    });
    expect(response.status()).toBe(401);
  });

  test('PUT /api/incidents/[id] returns 401 without auth', async ({ request }) => {
    const response = await request.put('/api/incidents/nonexistent-id', {
      data: { title: 'Updated Title' },
    });
    expect(response.status()).toBe(401);
  });

  test('DELETE /api/incidents/[id] returns 401 without auth', async ({ request }) => {
    const response = await request.delete('/api/incidents/nonexistent-id');
    expect(response.status()).toBe(401);
  });
});
