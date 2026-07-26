import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CqlTranslatorPort } from '../cql/application/cql-translator.port';
import type { FhirGatewayPort } from '../fhir/application/fhir-gateway.port';
import { HealthService } from './health.service';

describe('HealthService', () => {
  it('reports ready when both mandatory dependencies are available', async () => {
    const fhir = {
      checkHealth: () =>
        Promise.resolve({
          name: 'hapi-fhir',
          status: 'up',
          latencyMs: 1,
          details: {},
        }),
    } as unknown as FhirGatewayPort;
    const translator = {
      checkHealth: () =>
        Promise.resolve({
          name: 'cql-translator',
          status: 'up',
          latencyMs: 1,
          details: {},
        }),
    } as unknown as CqlTranslatorPort;

    const report = await new HealthService(fhir, translator).readiness();
    assert.equal(report.status, 'up');
  });

  it('reports not ready and identifies a failed dependency', async () => {
    const fhir = {
      checkHealth: () => Promise.reject(new Error('HAPI unavailable')),
    } as unknown as FhirGatewayPort;
    const translator = {
      checkHealth: () =>
        Promise.resolve({
          name: 'cql-translator',
          status: 'up',
          latencyMs: 1,
          details: {},
        }),
    } as unknown as CqlTranslatorPort;

    const report = await new HealthService(fhir, translator).readiness();
    assert.equal(report.status, 'down');
    assert.deepEqual(
      report.dependencies.map(({ name, status, ...dependency }) => ({
        name,
        status,
        ...('message' in dependency ? { message: dependency.message } : {}),
      })),
      [
        { name: 'hapi-fhir', status: 'down', message: 'HAPI unavailable' },
        { name: 'cql-translator', status: 'up' },
      ],
    );
  });
});
