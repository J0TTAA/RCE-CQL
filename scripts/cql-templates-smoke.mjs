import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    translator: { type: 'string', default: 'http://localhost:8081' },
  },
});
const translator = values.translator.replace(/\/$/, '');
const requireFromDist = createRequire(resolve('apps/api/dist/main.js'));
const { ORDER_RULE_TEMPLATES } = requireFromDist(
  './modules/cds-hooks/application/order-rule-templates.js',
);
const cql = requireFromDist('cql-execution');
const cqlfhir = requireFromDist('cql-exec-fhir');
const compiled = new Map();

for (const template of ORDER_RULE_TEMPLATES) {
  const parameters = new URLSearchParams({
    annotations: 'true',
    locators: 'true',
    'result-types': 'true',
    'detailed-errors': 'true',
    strict: 'true',
  });
  const response = await fetch(translator + '/cql/translator?' + parameters, {
    method: 'POST',
    signal: AbortSignal.timeout(60000),
    headers: { accept: 'application/elm+json', 'content-type': 'application/cql' },
    body: template.cql,
  });
  const body = await response.text();
  assert.equal(response.status, 200, template.id + ': ' + body);
  const elm = JSON.parse(body);
  assert.ok(elm.library?.identifier?.id, template.id + ': ELM sin identificador');
  const errors = (elm.library.annotation ?? []).filter(
    (annotation) =>
      annotation.type === 'CqlToElmError' && ['error', 'fatal'].includes(annotation.errorSeverity),
  );
  assert.deepEqual(errors, [], template.id + ': ' + JSON.stringify(errors));
  compiled.set(template.id, elm);
  console.log('ELM OK | ' + template.id + ' | ' + elm.library.identifier.id);
}

const patientId = 'template-test-patient';
function resource(resourceType, id, body) {
  return { resourceType, id, subject: { reference: `Patient/${patientId}` }, ...body };
}
function bundle(birthDate, resources = []) {
  return {
    resourceType: 'Bundle',
    type: 'collection',
    entry: [
      { resource: { resourceType: 'Patient', id: patientId, birthDate } },
      ...resources.map((item) => ({ resource: item })),
    ],
  };
}
const amoxicillin = resource('MedicationRequest', 'amoxicillin', {
  status: 'draft',
  intent: 'order',
  medicationCodeableConcept: {
    coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '308182' }],
  },
});
const lisinopril = resource('MedicationRequest', 'lisinopril', {
  ...amoxicillin,
  id: 'lisinopril',
  medicationCodeableConcept: {
    coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '314076' }],
  },
});
const hba1c = resource('ServiceRequest', 'hba1c', {
  status: 'draft',
  intent: 'order',
  code: { coding: [{ system: 'http://loinc.org', code: '4548-4' }] },
});
const creatinine = resource('ServiceRequest', 'creatinine', {
  ...hba1c,
  id: 'creatinine',
  code: { coding: [{ system: 'http://loinc.org', code: '2160-0' }] },
});
let evaluated = 0;
async function check(id, title, data, parameters, expected) {
  const source = cqlfhir.PatientSource.FHIRv401();
  source.loadBundles([data]);
  const executor = new cql.Executor(new cql.Library(compiled.get(id)), undefined, parameters);
  const result = await executor.exec_expression('Aplica', source);
  assert.equal(result.patientResults[patientId].Aplica, expected, `${id}: ${title}`);
  evaluated += 1;
  console.log(`ENGINE OK | ${id} | ${title}`);
}
await check('blank', 'no recomienda', bundle('1980-01-01'), {}, false);
await check('patient-view-adult', 'adulto', bundle('1980-01-01'), {}, true);
await check('patient-view-adult', 'menor', bundle('2012-01-01'), {}, false);
const medicationData = bundle('1980-01-01', [amoxicillin, lisinopril]);
await check(
  'order-select-amoxicillin',
  'seleccion sin alergias',
  medicationData,
  { Selections: ['MedicationRequest/amoxicillin'] },
  true,
);
await check(
  'order-select-amoxicillin',
  'otra seleccion con amoxicilina en antecedentes',
  medicationData,
  { Selections: ['MedicationRequest/lisinopril'] },
  false,
);
await check(
  'order-select-amoxicillin',
  'sin selecciones',
  medicationData,
  { Selections: [] },
  false,
);
const labData = bundle('1980-01-01', [hba1c, creatinine]);
await check(
  'order-sign-hba1c',
  'solicitud sin diabetes',
  labData,
  { DraftOrders: ['ServiceRequest/hba1c'] },
  true,
);
await check(
  'order-sign-hba1c',
  'otro examen con HbA1c en antecedentes',
  labData,
  { DraftOrders: ['ServiceRequest/creatinine'] },
  false,
);
await check('order-sign-hba1c', 'sin ordenes pendientes', labData, { DraftOrders: [] }, false);
const facts = [
  resource('Condition', 'diabetes', {
    clinicalStatus: {
      coding: [
        { system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' },
      ],
    },
    code: { coding: [{ system: 'http://snomed.info/sct', code: '44054006' }] },
  }),
  resource('Observation', 'hba1c-result', {
    status: 'final',
    code: { coding: [{ system: 'http://loinc.org', code: '4548-4' }] },
    valueQuantity: { value: 7.2, unit: '%', system: 'http://unitsofmeasure.org', code: '%' },
  }),
  resource('MedicationRequest', 'metformin', {
    status: 'active',
    intent: 'order',
    medicationCodeableConcept: {
      coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '860975' }],
    },
  }),
];
await check(
  'patient-view-diabetes-four-facts',
  'cuatro hechos',
  bundle('1980-01-01', facts),
  {},
  true,
);
await check('patient-view-diabetes-four-facts', 'menor', bundle('2012-01-01', facts), {}, false);
for (const fact of facts) {
  await check(
    'patient-view-diabetes-four-facts',
    `sin ${fact.resourceType}`,
    bundle(
      '1980-01-01',
      facts.filter((item) => item !== fact),
    ),
    {},
    false,
  );
}
console.log(
  `OK: ${ORDER_RULE_TEMPLATES.length} plantillas traducidas; ${evaluated} casos ejecutados con el motor instalado.`,
);
