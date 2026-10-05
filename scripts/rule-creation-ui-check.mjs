import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// Browser contract only: these HTTP doubles do not validate HAPI or translation.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const {
  ORDER_RULE_TEMPLATES,
} = require('../apps/api/dist/modules/cds-hooks/application/order-rule-templates.js');
const base = process.env.RCE_UI_URL || 'http://127.0.0.1:5173';
const output = resolve(
  process.env.RCE_UI_EVIDENCE || 'docs/evidence/M2/runs/20261005-rule-creation-modal',
);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
});
const results = [];
let activePage;
async function waitForGate(getGate) {
  const deadline = Date.now() + 5000;
  while (!getGate() && Date.now() < deadline) {
    await new Promise((done) => setTimeout(done, 10));
  }
  assert.equal(typeof getGate(), 'function', 'Expected the pending HTTP request');
  return getGate();
}
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    activePage = page;
    const errors = [];
    const unexpected = [];
    const creations = [];
    let templateFailure = true;
    let creationFailure = false;
    let holdTemplates = false;
    let holdCreation = false;
    let releaseTemplates;
    let releaseCreation;
    let created;
    page.on('pageerror', (error) => errors.push(error.message));
    const existing = {
      id: 'existing-rule',
      title: 'Regla sintetica existente',
      cqlName: 'ReglaExistente',
      version: '0.1.0',
      lifecycle: 'draft',
      activation: false,
      hook: 'patient-view',
      scope: 'sandbox',
      modified: '2026-10-05',
    };
    await page.route('**/api/v1/**', async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname.replace('/api/v1', '');
      let payload;
      let status = 200;
      if (path === '/ui/session') {
        payload = {
          sandboxId: 'ui-sandbox',
          sandboxLabel: 'S-TEST',
          role: 'student',
          classroomId: 'ui-test',
          expiresAt: '2099-01-01T00:00:00Z',
        };
      } else if (path === '/health/ready') {
        payload = {
          status: 'up',
          dependencies: [
            { name: 'hapi-fhir', status: 'up' },
            { name: 'cql-translator', status: 'up' },
          ],
        };
      } else if (path === '/ui/orders/templates') {
        if (holdTemplates) await new Promise((done) => (releaseTemplates = done));
        if (templateFailure) {
          status = 503;
          payload = { message: 'Plantillas temporalmente no disponibles.' };
        } else payload = ORDER_RULE_TEMPLATES;
      } else if (path === '/ui/rules' && request.method() === 'GET') {
        payload = [existing];
      } else if (path === '/ui/rules' && request.method() === 'POST') {
        const body = request.postDataJSON();
        creations.push(body);
        if (holdCreation) await new Promise((done) => (releaseCreation = done));
        if (creationFailure) {
          creationFailure = false;
          status = 503;
          payload = { message: 'No se pudo guardar el borrador.' };
        } else {
          created = {
            ...existing,
            id: `created-${creations.length}`,
            title: body.metadata.title,
            cqlName: body.metadata.name,
            cql: body.cql,
            metadata: body.metadata,
            hook: body.metadata.hook,
          };
          payload = created;
        }
      } else if (path === `/ui/rules/${created?.id}`) payload = created;
      else if (path === '/ui/patients') payload = [];
      else {
        unexpected.push(`${request.method()} ${path}`);
        status = 404;
        payload = { message: 'Unexpected UI test route.' };
      }
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });

    const modal = page.getByRole('dialog', { name: 'Nueva regla CQL', exact: true });
    const choice = modal.getByLabel('Punto de partida');
    const create = modal.getByRole('button', { name: 'Crear regla', exact: true });
    const open = () => page.getByRole('button', { name: 'Nueva regla', exact: true }).click();
    const assertCatalog = async () => {
      await page.getByRole('heading', { name: 'Reglas CQL', exact: true }).waitFor();
      await page.getByText(existing.title, { exact: true }).waitFor();
      assert.equal(await page.getByText(existing.title, { exact: true }).count(), 1);
    };
    const assertFits = async () => {
      const rect = await modal.boundingBox();
      assert.ok(rect && rect.x >= 0 && rect.y >= 0);
      assert.ok(rect.x + rect.width <= viewport.width && rect.y + rect.height <= viewport.height);
      assert.ok(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        'Page must not overflow horizontally',
      );
    };

    await page.goto(`${base}/rules`);
    await assertCatalog();
    await page.getByLabel('Buscar regla', { exact: true }).fill('sintetica');
    await open();
    await modal.getByRole('alert').waitFor();
    assert.equal(await create.isEnabled(), false);
    assert.equal(creations.length, 0);
    holdTemplates = true;
    templateFailure = false;
    await modal.getByRole('button', { name: 'Reintentar', exact: true }).click();
    await page.waitForFunction(
      () => document.querySelector('#rule-creation-form')?.getAttribute('aria-busy') === 'true',
    );
    assert.equal(await choice.isEnabled(), false);
    assert.equal(await create.isEnabled(), false);
    (await waitForGate(() => releaseTemplates))();
    holdTemplates = false;
    await page.waitForFunction(
      () => !document.querySelector('#rule-creation-form select')?.disabled,
    );
    assert.equal(await choice.inputValue(), 'blank');
    assert.equal(await choice.locator('option').count(), ORDER_RULE_TEMPLATES.length);
    await assertCatalog();
    await assertFits();
    await page.screenshot({
      path: resolve(output, `modal-blank-${viewport.width}.png`),
      fullPage: true,
    });

    await modal.getByRole('button', { name: 'Crear regla', exact: true }).focus();
    await page.keyboard.press('Tab');
    assert.equal(
      await modal
        .getByRole('button', { name: 'Cerrar', exact: true })
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await page.keyboard.press('Shift+Tab');
    assert.equal(await create.evaluate((el) => el === document.activeElement), true);
    await choice.selectOption('allergy-order');
    await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.waitForURL('**/rules');
    assert.equal(await page.getByLabel('Buscar regla', { exact: true }).inputValue(), 'sintetica');
    assert.equal(creations.length, 0);
    assert.equal(
      await page
        .getByRole('button', { name: 'Nueva regla', exact: true })
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await open();
    assert.equal(await choice.inputValue(), 'blank');
    await page.keyboard.press('Escape');
    await page.waitForURL('**/rules');
    await open();
    await modal.getByRole('button', { name: 'Cerrar', exact: true }).click();
    await page.waitForURL('**/rules');
    assert.equal(creations.length, 0);

    await open();
    holdCreation = true;
    await create.evaluate((el) => {
      el.click();
      el.click();
    });
    await modal.getByRole('button', { name: 'Creando regla...', exact: true }).waitFor();
    assert.equal(await choice.isEnabled(), false);
    assert.equal(
      await modal.getByRole('button', { name: 'Cancelar', exact: true }).isEnabled(),
      false,
    );
    await page.keyboard.press('Escape');
    await modal.getByRole('button', { name: 'Cerrar', exact: true }).click();
    assert.equal(await modal.count(), 1);
    await waitForGate(() => releaseCreation);
    assert.equal(creations.length, 1, 'Double click must create only one request');
    releaseCreation();
    holdCreation = false;
    await page.waitForURL('**/rules/created-1');
    await page.getByRole('heading', { name: 'Nueva regla CQL', exact: true }).waitFor();
    assert.equal(await modal.count(), 0);
    assert.equal(await page.getByLabel('Hook').inputValue(), 'patient-view');
    assert.equal(creations[0].metadata.title, 'Nueva regla CQL');
    assert.equal(creations[0].cql, ORDER_RULE_TEMPLATES[0].cql);
    assert.match(creations[0].cql, /define "Aplica":\n  false/);
    const editor = page.getByRole('textbox', { name: 'Editor de código CQL', exact: true });
    await editor.waitFor();
    await editor.focus();
    await page.keyboard.press('Control+End');
    await page.keyboard.insertText('\ndefine "ExpresionManual": true\n');
    await page.getByText('Sin guardar', { exact: true }).waitFor();
    assert.ok((await page.locator('.view-lines').innerText()).includes('ExpresionManual'));
    await page.screenshot({
      path: resolve(output, `editor-blank-${viewport.width}.png`),
      fullPage: true,
    });

    await page.goto(`${base}/rules/new`);
    await choice.waitFor();
    await page.waitForFunction(
      () => !document.querySelector('#rule-creation-form select')?.disabled,
    );
    assert.equal(await choice.inputValue(), 'blank');
    await choice.selectOption('diabetes-order');
    creationFailure = true;
    await create.click();
    await modal.getByRole('alert').waitFor();
    assert.equal(creations.length, 2, 'No automatic retry on a failed write');
    assert.equal(await choice.inputValue(), 'diabetes-order');
    assert.equal(new URL(page.url()).pathname, '/rules/new');
    await assertFits();
    await page.screenshot({
      path: resolve(output, `modal-error-${viewport.width}.png`),
      fullPage: true,
    });
    await create.click();
    await page.waitForURL('**/rules/created-3');
    await page.getByLabel('Hook').waitFor();
    assert.equal(await page.getByLabel('Hook').inputValue(), 'order-sign');
    assert.equal(
      creations[2].cql,
      ORDER_RULE_TEMPLATES.find((item) => item.id === 'diabetes-order').cql,
    );
    assert.equal(await modal.count(), 0);
    assert.deepEqual(unexpected, []);
    assert.deepEqual(errors, []);
    results.push({
      viewport,
      status: 'passed',
      createRequests: creations.length,
      checks: [
        'catalog background',
        'blank default',
        'templates preserved',
        'load error and retry',
        'loading controls',
        'cancel/close/Escape without writes',
        'filter preservation',
        'keyboard focus',
        'double-submit guard',
        'busy close guard',
        'full editor after success',
        'manual CQL editing',
        'deep link',
        'creation error without automatic retry',
        'template hook and CQL',
        'mobile/desktop fit',
      ],
    });
    await context.close();
  }
  await writeFile(
    resolve(output, 'rule-creation-ui-check.json'),
    JSON.stringify({ results }, null, 2),
  );
  console.log(JSON.stringify({ status: 'passed', results }, null, 2));
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: resolve(output, 'failure.png'), fullPage: true });
    console.error(await activePage.locator('body').innerText());
  }
  throw error;
} finally {
  await browser.close();
}
