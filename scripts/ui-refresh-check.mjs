import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// Browser-only refresh check; API responses are isolated doubles, not HAPI evidence.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const base = process.env.RCE_UI_URL || 'http://127.0.0.1:5173';
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
});

try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  let rules = [];
  let ruleReads = 0;
  let activityReads = 0;
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let payload;
    if (path === '/api/v1/ui/session') {
      payload = {
        sandboxId: 'refresh-check',
        sandboxLabel: 'S-CHECK',
        role: 'student',
        classroomId: 'demo',
        expiresAt: '2099-01-01T00:00:00Z',
      };
    } else if (path === '/api/v1/health/ready') {
      payload = { status: 'up', dependencies: [] };
    } else if (path === '/api/v1/ui/orders/templates') {
      payload = [];
    } else if (path === '/api/v1/ui/rules') {
      ruleReads += 1;
      payload = rules;
    } else if (path === '/api/v1/ui/activity') {
      activityReads += 1;
      payload = [];
    } else {
      throw new Error(`Unexpected API request: ${path}`);
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload),
    });
  });

  await page.goto(`${base}/rules`);
  await page.getByText('Sin resultados.').waitFor();
  rules = [
    {
      id: 'rule-refresh-check',
      title: 'Regla que acaba de publicarse',
      cqlName: 'RuleRefreshCheck',
      version: '1.0.0',
      lifecycle: 'published',
      hook: 'patient-view',
      activation: true,
      modified: '2026-11-03',
      scope: 'sandbox',
      cql: '',
      metadata: {},
    },
  ];
  await page.getByText('Regla que acaba de publicarse').waitFor({ timeout: 7000 });
  assert.ok(ruleReads >= 2, 'catalog was not revalidated');
  assert.equal(await page.getByText('1 reglas').count(), 1);
  await page.getByText('Cargando…').waitFor({ state: 'hidden' });

  await page.getByText('Actividad CDS', { exact: true }).first().click();
  await page.getByText('Sin resultados.').waitFor();
  await page.waitForFunction(() => window.location.pathname === '/activity');
  await page.waitForTimeout(8500);
  assert.ok(activityReads >= 2, 'activity was not revalidated');
  assert.deepEqual(errors, []);
  console.log(`UI refresh passed: rules reads=${ruleReads}, activity reads=${activityReads}`);
} finally {
  await browser.close();
}
