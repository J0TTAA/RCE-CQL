import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const base = process.env.RCE_UI_URL || 'http://127.0.0.1:5173';
const output = resolve(
  process.env.RCE_UI_EVIDENCE || 'docs/evidence/M2/runs/20261116-fhir-information-guide',
);
await mkdir(output, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
});
try {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/api/v1/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      const payload =
        path === '/api/v1/ui/session'
          ? {
              sandboxId: 'guide-check',
              sandboxLabel: 'S-GUIDE',
              role: 'student',
              classroomId: 'demo',
              expiresAt: '2099-01-01T00:00:00Z',
            }
          : path === '/api/v1/health/ready'
            ? { status: 'up', dependencies: [] }
            : path === '/api/v1/ui/patients'
              ? []
              : null;
      if (!payload) throw new Error(`Unexpected API request: ${path}`);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });

    await page.goto(`${base}/guide`);
    await page.getByRole('heading', { name: 'FHIR y reglas CQL dentro del RCE' }).waitFor();
    assert.equal(
      await page
        .getByRole('heading', { name: 'Qué representa cada recurso y dónde verlo' })
        .count(),
      1,
    );
    assert.equal(
      await page.getByRole('heading', { name: 'Elige el hook según el momento' }).count(),
      1,
    );
    assert.equal(await page.locator('.guide-resource-card').count(), 9);
    assert.equal(await page.locator('.guide-hook-grid > div').count(), 3);
    assert.equal(
      await page.getByRole('link', { name: 'Crear regla' }).getAttribute('href'),
      '/rules/new',
    );
    assert.equal(
      await page.getByRole('link', { name: 'Ir a pacientes' }).getAttribute('href'),
      '/patients',
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      true,
    );
    assert.deepEqual(errors, []);
    await page.screenshot({ path: resolve(output, `guide-${viewport.width}.png`), fullPage: true });
    await page.getByRole('link', { name: 'Ir a pacientes' }).click();
    await page.waitForURL('**/patients');
    if (viewport.width < 680) {
      await page.getByRole('button', { name: 'Abrir navegación' }).click();
    }
    await page.locator('.nav-link:visible').filter({ hasText: 'Guía FHIR' }).click();
    await page.waitForURL('**/guide');
    await page.getByRole('heading', { name: 'FHIR y reglas CQL dentro del RCE' }).waitFor();
    await page.close();
  }
  console.log('FHIR guide UI passed at desktop and mobile viewports');
} finally {
  await browser.close();
}
