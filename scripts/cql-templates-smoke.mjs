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
  console.log('ELM OK | ' + template.id + ' | ' + elm.library.identifier.id);
}

console.log('OK: ' + ORDER_RULE_TEMPLATES.length + ' plantillas traducidas con CQL Tools 4.7.0.');
