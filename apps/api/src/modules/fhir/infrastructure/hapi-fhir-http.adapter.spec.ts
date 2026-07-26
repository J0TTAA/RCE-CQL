import type { ConfigService } from '@nestjs/config';
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { DependencyHttpClient } from '../../../common/dependencies/dependency-http.client';
import type { EnvironmentVariables } from '../../../config/environment';
import { HapiFhirHttpAdapter } from './hapi-fhir-http.adapter';

describe('HapiFhirHttpAdapter', () => {
  let nextResponse: Response;
  let lastRequest: Parameters<DependencyHttpClient['request']> | undefined;
  const request: DependencyHttpClient['request'] = (...args) => {
    lastRequest = args;
    return Promise.resolve(nextResponse);
  };
  let adapter: HapiFhirHttpAdapter;

  beforeEach(() => {
    const config = {
      get: (key: keyof EnvironmentVariables) =>
        key === 'HAPI_BASE_URL' ? 'http://hapi:8080/fhir/' : '',
    } as unknown as ConfigService<EnvironmentVariables, true>;
    const http = { request } as unknown as DependencyHttpClient;
    adapter = new HapiFhirHttpAdapter(config, http);
    lastRequest = undefined;
  });

  it('accepts a FHIR R4 server with the required artifact resources', async () => {
    nextResponse = Response.json({
      resourceType: 'CapabilityStatement',
      fhirVersion: '4.0.1',
      software: { version: '8.10.0' },
      rest: [
        {
          resource: [
            { type: 'Library' },
            { type: 'PlanDefinition', operation: [{ name: 'apply' }] },
          ],
        },
      ],
    });

    const health = await adapter.checkHealth();
    assert.equal(health.name, 'hapi-fhir');
    assert.equal(health.status, 'up');
    assert.deepEqual(health.details, {
      fhirVersion: '4.0.1',
      softwareVersion: '8.10.0',
      libraryAvailable: true,
      planDefinitionAvailable: true,
      applyAdvertised: true,
    });
    assert.equal(lastRequest?.[0], 'hapi-fhir');
    assert.equal(lastRequest?.[1], 'http://hapi:8080/fhir/metadata');
    assert.deepEqual(lastRequest?.[2]?.headers, {
      accept: 'application/fhir+json',
    });
  });

  it('sends the configured bearer token to an external HAPI', async () => {
    const config = {
      get: (key: keyof EnvironmentVariables) =>
        key === 'HAPI_BASE_URL' ? 'https://hapi.example.org/fhir' : 'test-token',
    } as unknown as ConfigService<EnvironmentVariables, true>;
    adapter = new HapiFhirHttpAdapter(config, { request } as unknown as DependencyHttpClient);
    nextResponse = Response.json({
      resourceType: 'CapabilityStatement',
      fhirVersion: '4.0.1',
      rest: [{ resource: [{ type: 'Library' }, { type: 'PlanDefinition' }] }],
    });

    await adapter.checkHealth();

    assert.deepEqual(lastRequest?.[2]?.headers, {
      accept: 'application/fhir+json',
      authorization: 'Bearer test-token',
    });
  });

  it('rejects a server without the required FHIR R4 capabilities', async () => {
    nextResponse = Response.json({
      resourceType: 'CapabilityStatement',
      fhirVersion: '5.0.0',
      rest: [{ resource: [{ type: 'Patient' }] }],
    });

    await assert.rejects(adapter.checkHealth(), { dependency: 'hapi-fhir' });
  });
});
