import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// UI-only contract test. HTTP doubles are confined to this browser context.
// This is not evidence of CQL translation or HAPI interoperability.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright');
const { ORDER_CATALOG } = require('../apps/api/dist/modules/fhir/application/sandbox-orders.js');
const {
  ORDER_RULE_TEMPLATES,
} = require('../apps/api/dist/modules/cds-hooks/application/order-rule-templates.js');
const base = process.env.RCE_UI_URL || 'http://127.0.0.1:5173';
const output = resolve(process.env.RCE_UI_EVIDENCE || 'docs/evidence/M3/runs/20260915T190015Z');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}),
});
const results = [];
try {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport });
    // Exercise the UUID fallback used by HTTP demos without randomUUID.
    await context.addInitScript(() =>
      Object.defineProperty(crypto, 'randomUUID', { value: undefined }),
    );
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const reviews = [];
    const confirmations = [];
    let failNext = false;
    let patientReads = 0;
    let created;
    const patient = {
      id: 'ui-patient',
      synId: 'SYN-UI',
      name: 'Paciente sintetico de prueba',
      birthDate: null,
      age: null,
      cohort: 'sin edad',
      sex: 'sin dato',
      activeConditions: [],
      lastEncounter: '',
      cdsStatus: 'none',
      cdsCount: 0,
      conditions: [],
      observations: [],
      medications: [],
      encounters: [],
      allergies: [],
      procedures: [],
      immunizations: [],
      serviceRequests: [],
      sandboxOrders: [],
      timeline: [],
      editableClinicalData: { birthDate: null, gender: 'unknown', clinicalResources: [] },
    };
    await page.route('**/api/v1/**', async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname.replace('/api/v1', '');
      let payload;
      let status = 200;
      if (path === '/ui/session')
        payload = {
          sandboxId: 'ui-sandbox',
          sandboxLabel: 'S-TEST',
          role: 'student',
          classroomId: 'ui-test',
          expiresAt: '2099-01-01T00:00:00Z',
        };
      else if (path === '/health/ready')
        payload = {
          status: 'up',
          dependencies: [
            { name: 'hapi-fhir', status: 'up' },
            { name: 'cql-translator', status: 'up' },
          ],
        };
      else if (path === '/ui/orders/catalog') payload = ORDER_CATALOG;
      else if (path === '/ui/orders/templates') payload = ORDER_RULE_TEMPLATES;
      else if (path === '/ui/patients/ui-patient') {
        patientReads++;
        payload = patient;
      } else if (path === '/ui/patients/ui-patient/cards') payload = [];
      else if (path === '/ui/patients') payload = [patient];
      else if (path === '/ui/rules' && request.method() === 'GET') payload = [];
      else if (path === '/ui/rules' && request.method() === 'POST') {
        created = request.postDataJSON();
        payload = {
          id: 'ui-rule',
          title: created.metadata.title,
          cqlName: created.metadata.name,
          cql: created.cql,
          metadata: created.metadata,
          hook: created.metadata.hook,
          lifecycle: 'draft',
          version: '0.1.0',
          scope: 'sandbox',
          activation: false,
        };
      } else if (path === '/ui/rules/ui-rule')
        payload = {
          id: 'ui-rule',
          title: created.metadata.title,
          cqlName: created.metadata.name,
          cql: created.cql,
          metadata: created.metadata,
          hook: created.metadata.hook,
          lifecycle: 'draft',
          version: '0.1.0',
          scope: 'sandbox',
          activation: false,
        };
      else if (path === '/ui/orders/ui-patient/review') {
        const body = request.postDataJSON();
        reviews.push(body);
        await new Promise((done) => setTimeout(done, 150));
        if (failNext) {
          failNext = false;
          status = 503;
          payload = { message: 'Prueba UI: servicio no disponible.' };
        } else {
          const cards = [
            {
              id: 'ui-card',
              severity: 'warning',
              summary: 'Card de prueba de interfaz',
              detail: 'Respuesta HTTP controlada para verificar el formulario.',
              source: 'Prueba UI',
              ruleName: 'UiContract',
              ruleVersion: '1.0.0',
            },
          ];
          payload = {
            hook: body.hook,
            cards,
            ...(body.hook === 'order-sign' ? { reviewId: 'orders-ui-review' } : {}),
            activity: {
              id: 'ui-activity',
              hook: body.hook,
              rules: ['UiContract 1.0.0'],
              warnings: [],
              cards,
              patientId: patient.id,
              patientName: patient.name,
              cardsCount: 1,
              maxSeverity: 'warning',
              result: 'success',
              scope: 'sandbox',
              consideredResources: ['Patient/ui-patient'],
              date: new Date().toISOString(),
            },
          };
        }
      } else if (path.endsWith('/confirm')) {
        confirmations.push(request.postDataJSON());
        patient.sandboxOrders = reviews.at(-1).orders.map((order) => {
          const item = ORDER_CATALOG.find((entry) => entry.id === order.catalogId);
          return {
            id: order.id,
            resourceType: item.resourceType,
            code: item.code,
            display: item.label,
            status: 'active',
            intent: 'order',
            authoredOn: '2026-10-04',
          };
        });
        patient.serviceRequests = patient.sandboxOrders.filter(
          (order) => order.resourceType === 'ServiceRequest',
        );
        payload = { confirmed: true, orderCount: patient.sandboxOrders.length };
      } else {
        status = 404;
        payload = { message: `Unexpected UI test route: ${path}` };
      }
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(payload),
      });
    });
    await page.goto(`${base}/patients/ui-patient`);
    await page.getByRole('button', { name: 'Recetar / indicar' }).click();
    await page.getByLabel('Medicamento, examen o procedimiento').selectOption('amoxicillin');
    const add = page.getByRole('button', { name: 'Agregar a órdenes pendientes', exact: true });
    await add.click();
    await page.getByRole('heading', { name: 'Revisión al agregar la orden' }).waitFor();
    assert.equal(reviews[0].hook, 'order-select');
    assert.match(
      reviews[0].orders[0].id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    assert.deepEqual(reviews[0].selections, [reviews[0].orders[0].id]);
    await page.getByText('Sin órdenes firmadas en este sandbox.', { exact: true }).waitFor();
    const sign = page.getByRole('button', { name: 'Firmar órdenes', exact: true });
    await sign.click();
    assert.equal(await page.locator('.orders-workflow input:invalid').count(), 3);
    assert.equal(reviews.length, 1, 'Incomplete medication must not reach the API');
    await page.getByLabel('Dosis (mg)', { exact: true }).fill('500');
    await page.getByLabel('Veces al dia', { exact: true }).fill('3');
    await page.getByLabel('Duracion (dias)', { exact: true }).fill('5');
    await sign.click();
    const confirm = page.getByRole('button', { name: 'Firmar y guardar órdenes', exact: true });
    await confirm.waitFor();
    assert.equal(reviews.at(-1).hook, 'order-sign');
    assert.equal(reviews.at(-1).orders[0].dose, 500);
    await page.getByLabel('Dosis (mg)', { exact: true }).fill('250');
    assert.equal(await confirm.count(), 0, 'Editing invalidates the review');
    await page.getByLabel('Medicamento, examen o procedimiento').selectOption('hba1c');
    await add.click();
    await page.getByRole('heading', { name: 'Revisión al agregar la orden' }).waitFor();
    assert.equal(reviews.at(-1).hook, 'order-select');
    assert.equal(reviews.at(-1).orders.length, 2);
    failNext = true;
    await sign.click();
    await page.getByText('Prueba UI: servicio no disponible.', { exact: true }).waitFor();
    assert.equal(await sign.isEnabled(), true, 'Failure must unlock the form');
    await sign.click();
    await confirm.waitFor();
    await page.screenshot({
      path: resolve(output, `orders-${viewport.width}.png`),
      fullPage: true,
    });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    assert.equal(overflow, false, `No horizontal page overflow at ${viewport.width}px`);
    const outside = await page
      .locator('.orders-workflow input, .orders-workflow select, .orders-workflow button')
      .evaluateAll((elements) =>
        elements
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.width > 0 && (rect.left < 0 || rect.right > window.innerWidth + 1);
          })
          .map((element) => element.outerHTML),
      );
    assert.deepEqual(outside, [], 'Form controls stay in the viewport');
    const readsBefore = patientReads;
    await confirm.click();
    await page.getByText('2 ordenes confirmadas en mi sandbox.', { exact: true }).waitFor();
    await page.getByText('Sin órdenes pendientes.', { exact: true }).waitFor();
    assert.deepEqual(confirmations, [{ confirmed: true }]);
    assert.ok(patientReads > readsBefore, 'Confirmation refreshes the patient');
    for (const item of patient.sandboxOrders) {
      assert.equal(await page.getByRole('cell', { name: item.display, exact: true }).count(), 1);
    }
    assert.equal(
      await page.getByRole('heading', { name: 'Solicitudes del historial del paciente' }).count(),
      0,
      'Sandbox-only requests must not leave an empty history section',
    );
    await page.reload();
    await page.getByRole('button', { name: 'Recetar / indicar' }).click();
    await page.getByRole('cell', { name: patient.sandboxOrders[0].display, exact: true }).waitFor();
    for (const item of patient.sandboxOrders) {
      assert.equal(await page.getByRole('cell', { name: item.display, exact: true }).count(), 1);
    }
    assert.deepEqual(confirmations, [{ confirmed: true }], 'Reopening must not submit orders');
    await page.screenshot({
      path: resolve(output, `signed-orders-${viewport.width}.png`),
      fullPage: true,
    });
    await page.goto(`${base}/rules/new`);
    await page.getByLabel('Punto de partida').selectOption('diabetes-order');
    await page.screenshot({
      path: resolve(output, `templates-${viewport.width}.png`),
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Crear regla', exact: true }).click();
    await page.waitForURL('**/rules/ui-rule');
    assert.equal(created.metadata.hook, 'order-sign');
    assert.ok(created.cql.includes('parameter DraftOrders List<String>'));
    assert.deepEqual(errors, [], 'No unhandled errors in the tested UI');
    results.push({
      viewport,
      checks:
        'selection, UUID, required inputs, sign, invalidation, API error, confirmation, refresh, medication/service visibility, no duplicates, reopening, templates, overflow',
      passed: true,
    });
    await context.close();
  }
  await writeFile(
    resolve(output, 'ui-check.json'),
    JSON.stringify({ scope: 'UI ONLY; mocked HTTP; not clinical integration', results }, null, 2),
  );
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
