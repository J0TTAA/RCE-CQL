import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const requireFromApi = createRequire(resolve('apps/api/package.json'));
const cql = requireFromApi('cql-execution');
const cqlfhir = requireFromApi('cql-exec-fhir');

const { values } = parseArgs({
  options: {
    translator: { type: 'string', default: 'http://localhost:8081' },
  },
});
const translator = values.translator.replace(/\/$/, '');
const cqlText = await readFile(
  resolve('spikes/m0/fixtures/cql/RceComplexDiabetesFourFacts.cql'),
  'utf8',
);

const parameters = new URLSearchParams({
  annotations: 'true',
  locators: 'true',
  'result-types': 'true',
  'detailed-errors': 'true',
  strict: 'true',
});
const translation = await fetch(`${translator}/cql/translator?${parameters}`, {
  method: 'POST',
  signal: AbortSignal.timeout(60000),
  headers: { accept: 'application/elm+json', 'content-type': 'application/cql' },
  body: cqlText,
});
const translationBody = await translation.text();
assert.equal(translation.status, 200, translationBody);
const elm = JSON.parse(translationBody);
assert.equal(elm.library?.identifier?.id, 'RceComplexDiabetesFourFacts');

function resource(resourceType, id, body) {
  return { resource: { resourceType, id, ...body } };
}

function completeBundle() {
  const patientId = 'complex-diabetes-patient';
  return {
    resourceType: 'Bundle',
    type: 'collection',
    entry: [
      resource('Patient', patientId, { birthDate: '1980-01-01' }),
      resource('Condition', 'diabetes-active', {
        clinicalStatus: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
              code: 'active',
            },
          ],
        },
        verificationStatus: {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
              code: 'confirmed',
            },
          ],
        },
        code: {
          coding: [{ system: 'http://snomed.info/sct', code: '44054006' }],
        },
        subject: { reference: `Patient/${patientId}` },
      }),
      resource('Observation', 'hba1c-high', {
        status: 'final',
        code: { coding: [{ system: 'http://loinc.org', code: '4548-4' }] },
        subject: { reference: `Patient/${patientId}` },
        effectiveDateTime: '2026-09-15T12:00:00Z',
        valueQuantity: {
          value: 7.2,
          unit: '%',
          system: 'http://unitsofmeasure.org',
          code: '%',
        },
      }),
      resource('MedicationRequest', 'metformin-active', {
        status: 'active',
        intent: 'order',
        medicationCodeableConcept: {
          coding: [
            {
              system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
              code: '860975',
            },
          ],
        },
        subject: { reference: `Patient/${patientId}` },
        authoredOn: '2026-09-15',
      }),
    ],
  };
}

function clone(value) {
  return structuredClone(value);
}

function find(bundle, type) {
  return bundle.entry.find((entry) => entry.resource.resourceType === type).resource;
}

function without(bundle, type) {
  bundle.entry = bundle.entry.filter((entry) => entry.resource.resourceType !== type);
  return bundle;
}

const cases = [
  { name: 'los cuatro hechos cumplen', expected: true, build: completeBundle },
  {
    name: 'falla edad adulta',
    expected: false,
    build: () => {
      const bundle = clone(completeBundle());
      find(bundle, 'Patient').birthDate = '2015-01-01';
      return bundle;
    },
  },
  {
    name: 'falla diabetes activa',
    expected: false,
    build: () => {
      const bundle = clone(completeBundle());
      find(bundle, 'Condition').clinicalStatus.coding[0].code = 'resolved';
      return bundle;
    },
  },
  {
    name: 'falla HbA1c elevada',
    expected: false,
    build: () => {
      const bundle = clone(completeBundle());
      find(bundle, 'Observation').valueQuantity.value = 5.6;
      return bundle;
    },
  },
  {
    name: 'falla metformina activa',
    expected: false,
    build: () => {
      const bundle = clone(completeBundle());
      find(bundle, 'MedicationRequest').status = 'completed';
      return bundle;
    },
  },
  {
    name: 'HbA1c ausente',
    expected: false,
    build: () => without(clone(completeBundle()), 'Observation'),
  },
  {
    name: 'fecha de nacimiento ausente',
    expected: false,
    build: () => {
      const bundle = clone(completeBundle());
      delete find(bundle, 'Patient').birthDate;
      return bundle;
    },
  },
];

const library = new cql.Library(elm);
for (const testCase of cases) {
  const patientSource = cqlfhir.PatientSource.FHIRv401();
  patientSource.loadBundles([testCase.build()]);
  const executor = new cql.Executor(library);
  const results = await executor.exec_expression('Aplica', patientSource);
  const patient = Object.values(results.patientResults)[0] ?? {};
  const actual = patient.Aplica;
  assert.equal(actual, testCase.expected, `${testCase.name}: resultado=${String(actual)}`);
  console.log(`${actual ? 'CARD' : 'SIN CARD'} | ${testCase.name}`);
}

console.log(
  'OK: CQL oficial -> ELM -> cql-execution/cql-exec-fhir; 1 caso positivo y 6 negativos verificados.',
);
