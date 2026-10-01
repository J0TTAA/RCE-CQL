import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

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
    'Uso: node scripts/complex-patient-view-smoke.mjs --synthetic-patient-id ID [--base http://localhost:3000/api/v1]',
  );
}

let cookie = '';
async function api(path, method = 'GET', body, expected = 200) {
  const response = await fetch(`${base}${path}`, {
    method,
    signal: AbortSignal.timeout(90000),
    headers: {
      accept: 'application/json',
      ...(cookie ? { cookie } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const setCookie = response.headers.getSetCookie();
  if (setCookie.length) cookie = setCookie.map((value) => value.split(';')[0]).join('; ');
  const text = await response.text();
  const payload = text ? JSON.parse(text) : undefined;
  assert.equal(response.status, expected, `${method} ${path}: ${text}`);
  return payload;
}

function hasRuleCard(cards, ruleName) {
  return cards.some((card) => card.ruleName === ruleName);
}

await api('/health/ready');
await api('/ui/session');
await api(`/ui/patients/${patientId}`);
const cql = await readFile(
  resolve('spikes/m0/fixtures/cql/RceComplexDiabetesFourFacts.cql'),
  'utf8',
);
const ruleName = `ComplexDiabetes${Date.now()}`;
const versionedCql = cql.replace('RceComplexDiabetesFourFacts', ruleName);
const rule = await api(
  '/ui/rules',
  'POST',
  {
    cql: versionedCql,
    metadata: {
      title: 'Prueba compuesta: cuatro hechos FHIR',
      name: ruleName,
      hook: 'patient-view',
      expression: 'Aplica',
      summary: 'Se cumplen los cuatro criterios de la regla compuesta',
      detail: 'Adulto, diabetes activa, HbA1c elevada y metformina activa.',
      indicator: 'warning',
    },
  },
  201,
);
const validation = await api(`/ui/rules/${rule.id}/validate`, 'POST', { cql: rule.cql }, 201);
assert.equal(validation.valid, true);
assert.equal(JSON.parse(validation.elm).library.identifier.id, ruleName);
await api(`/ui/rules/${rule.id}/publish`, 'POST', undefined, 201);

const positive = {
  birthDate: '1980-01-01',
  diabetesCondition: true,
  hba1c: 7.2,
  metforminMedication: true,
};
const matrix = [
  { name: 'cuatro criterios verdaderos', patch: positive, expected: true },
  { name: 'edad no cumple', patch: { ...positive, birthDate: '2015-01-01' }, expected: false },
  { name: 'diabetes no cumple', patch: { ...positive, diabetesCondition: false }, expected: false },
  { name: 'HbA1c no cumple', patch: { ...positive, hba1c: 5.6 }, expected: false },
  {
    name: 'metformina no cumple',
    patch: { ...positive, metforminMedication: false },
    expected: false,
  },
];
for (const testCase of matrix) {
  const updated = await api(`/ui/patients/${patientId}`, 'PATCH', testCase.patch);
  assert.equal(
    hasRuleCard(updated.cards, ruleName),
    testCase.expected,
    `${testCase.name}: cards=${JSON.stringify(updated.cards)}`,
  );
  const cards = await api(`/ui/patients/${patientId}/cards`);
  assert.equal(hasRuleCard(cards, ruleName), testCase.expected, testCase.name);
  console.log(`${testCase.expected ? 'CARD' : 'SIN CARD'} | ${testCase.name}`);
}

await api(`/ui/patients/${patientId}`, 'PATCH', positive);
const standard = await api('/cds-services/rce-patient-view', 'POST', {
  hook: 'patient-view',
  hookInstance: randomUUID(),
  context: { userId: 'Practitioner/rce-educativo', patientId },
});
assert.ok(
  standard.cards.some((card) => card.source.label.startsWith(ruleName)),
  'El endpoint CDS Hooks estandar no devolvio la card de la regla compuesta.',
);

console.log(
  'OK: CQL -> Library FHIR -> patient-view -> card CDS; matriz 1 positiva + 4 negativas.',
);
