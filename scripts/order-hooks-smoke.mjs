import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { parseArgs } from 'node:util';

// Solo contra datos sinteticos de docencia. Crea dos sandboxes nuevos.
const { values } = parseArgs({
  options: {
    base: { type: 'string', default: 'http://localhost:3000/api/v1' },
    'synthetic-patient-id': { type: 'string' },
  },
});
const base = values.base.replace(/\/$/, '');
const patientId = values['synthetic-patient-id'];
if (!patientId || !/^[A-Za-z0-9.-]{1,64}$/.test(patientId)) {
  throw new Error(
    'Uso: node scripts/order-hooks-smoke.mjs --synthetic-patient-id ID [--base http://localhost:3000/api/v1]',
  );
}

function client() {
  let cookie = '';
  return async (path, method = 'GET', body, expected = 200) => {
    const response = await fetch(`${base}${path}`, {
      method,
      signal: AbortSignal.timeout(60000),
      headers: {
        accept: 'application/json',
        ...(cookie ? { cookie } : {}),
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const setCookie = response.headers.getSetCookie();
    if (setCookie.length) cookie = setCookie.map((value) => value.split(';')[0]).join('; ');
    const payload = await response.json();
    assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(payload)}`);
    return payload;
  };
}
const a = client();
const b = client();
await a('/health/ready');
const sessionA = await a('/ui/session');
const sessionB = await b('/ui/session');
assert.notEqual(sessionA.sandboxId, sessionB.sandboxId);
await a(`/ui/patients/${patientId}`);
const templates = await a('/ui/orders/templates');
const names = {};
for (const id of ['allergy-order', 'diabetes-order']) {
  const template = templates.find((item) => item.id === id);
  assert.ok(template, `Falta plantilla ${id}`);
  const name = `Smoke${id === 'allergy-order' ? 'Allergy' : 'Diabetes'}${Date.now()}`;
  const rule = await a(
    '/ui/rules',
    'POST',
    {
      cql: template.cql,
      metadata: {
        title: template.label,
        name,
        hook: template.hook,
        expression: 'Aplica',
        summary: template.summary,
        detail: template.detail,
        indicator: 'info',
      },
    },
    201,
  );
  const validation = await a(`/ui/rules/${rule.id}/validate`, 'POST', { cql: rule.cql }, 201);
  assert.equal(validation.valid, true);
  assert.ok(JSON.parse(validation.elm).library);
  await a(`/ui/rules/${rule.id}/publish`, 'POST', undefined, 201);
  names[id] = name;
}
await a(`/ui/patients/${patientId}`, 'PATCH', {
  diabetesCondition: true,
  clinicalResources: [
    {
      id: 'smoke-allergy',
      type: 'allergy',
      code: 'penicillin',
      status: 'active',
      date: new Date().toISOString().slice(0, 10),
    },
  ],
});
const medication = {
  id: randomUUID(),
  catalogId: 'amoxicillin',
  dose: 500,
  frequency: 3,
  durationDays: 5,
  priority: 'routine',
};
const selected = await a(`/ui/orders/${patientId}/review`, 'POST', {
  hook: 'order-select',
  orders: [medication],
  selections: [medication.id],
});
assert.deepEqual(selected.activity.warnings, []);
assert.ok(selected.cards.some((card) => card.ruleName === names['allergy-order']));
const negative = await a(`/ui/orders/${patientId}/review`, 'POST', {
  hook: 'order-select',
  orders: [{ ...medication, catalogId: 'lisinopril' }],
  selections: [medication.id],
});
assert.ok(!negative.cards.some((card) => card.ruleName === names['allergy-order']));

const request = {
  hook: 'order-select',
  hookInstance: randomUUID(),
  context: {
    userId: 'Practitioner/rce-educativo',
    patientId,
    selections: [`MedicationRequest/${medication.id}`],
    draftOrders: {
      resourceType: 'Bundle',
      type: 'collection',
      entry: [
        {
          resource: {
            resourceType: 'MedicationRequest',
            id: medication.id,
            status: 'draft',
            intent: 'order',
            medicationCodeableConcept: {
              coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '308182' }],
            },
            subject: { reference: `Patient/${patientId}` },
          },
        },
      ],
    },
  },
};
const standard = await a('/cds-services/rce-order-select', 'POST', request);
assert.ok(standard.cards.some((card) => card.source.label.startsWith(names['allergy-order'])));
const other = await b('/cds-services/rce-order-select', 'POST', {
  ...request,
  hookInstance: randomUUID(),
});
assert.ok(!other.cards.some((card) => card.source.label.startsWith(names['allergy-order'])));

const lab = { id: randomUUID(), catalogId: 'hba1c', priority: 'routine' };
const reviewed = await a(`/ui/orders/${patientId}/review`, 'POST', {
  hook: 'order-sign',
  orders: [lab],
});
assert.deepEqual(reviewed.activity.warnings, []);
assert.ok(reviewed.cards.some((card) => card.ruleName === names['diabetes-order']));
assert.ok(reviewed.reviewId);
const standardSign = await a('/cds-services/rce-order-sign', 'POST', {
  hook: 'order-sign',
  hookInstance: randomUUID(),
  context: {
    userId: 'Practitioner/rce-educativo',
    patientId,
    draftOrders: {
      resourceType: 'Bundle',
      type: 'collection',
      entry: [
        {
          resource: {
            resourceType: 'ServiceRequest',
            id: randomUUID(),
            status: 'draft',
            intent: 'order',
            code: { coding: [{ system: 'http://loinc.org', code: '4548-4' }] },
            subject: { reference: `Patient/${patientId}` },
          },
        },
      ],
    },
  },
});
assert.ok(standardSign.cards.some((card) => card.source.label.startsWith(names['diabetes-order'])));
await b(
  `/ui/orders/${patientId}/reviews/${reviewed.reviewId}/confirm`,
  'POST',
  { confirmed: true },
  404,
);
const confirmationPath = `/ui/orders/${patientId}/reviews/${reviewed.reviewId}/confirm`;
await a(confirmationPath, 'POST', { confirmed: true });
await a(confirmationPath, 'POST', { confirmed: true });
const detailA = await a(`/ui/patients/${patientId}`);
const detailB = await b(`/ui/patients/${patientId}`);
assert.equal(detailA.serviceRequests.filter((item) => item.id === lab.id).length, 1);
assert.ok(!detailB.serviceRequests.some((item) => item.id === lab.id));
await a(`/ui/patients/${patientId}`, 'PATCH', { diabetesCondition: false });
const noDiabetes = await a(`/ui/orders/${patientId}/review`, 'POST', {
  hook: 'order-sign',
  orders: [{ ...lab, id: randomUUID() }],
});
assert.ok(!noDiabetes.cards.some((card) => card.ruleName === names['diabetes-order']));
console.log(
  'OK: CQL -> traductor real -> ELM -> Library FHIR -> order-select/order-sign -> cards; confirmacion e aislamiento verificados.',
);
