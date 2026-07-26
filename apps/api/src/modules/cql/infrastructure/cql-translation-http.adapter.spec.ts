import type { ConfigService } from '@nestjs/config';
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { DependencyHttpClient } from '../../../common/dependencies/dependency-http.client';
import { CqlTranslationError } from '../../../common/errors/cql-translation.error';
import type { EnvironmentVariables } from '../../../config/environment';
import type { TranslateCqlCommand } from '../application/cql-translator.port';
import { CqlTranslationHttpAdapter } from './cql-translation-http.adapter';

const command: TranslateCqlCommand = {
  cql: "library Example version '1.0.0'",
  options: {
    annotations: true,
    locators: true,
    resultTypes: true,
    detailedErrors: true,
    strict: true,
  },
};

describe('CqlTranslationHttpAdapter', () => {
  let nextResponse: Response;
  let lastRequest: Parameters<DependencyHttpClient['request']> | undefined;
  const request: DependencyHttpClient['request'] = (...args) => {
    lastRequest = args;
    return Promise.resolve(nextResponse);
  };
  let adapter: CqlTranslationHttpAdapter;

  beforeEach(() => {
    const config = {
      get: () => 'http://translator:8080',
    } as unknown as ConfigService<EnvironmentVariables, true>;
    const http = { request } as unknown as DependencyHttpClient;
    adapter = new CqlTranslationHttpAdapter(config, http);
    lastRequest = undefined;
  });

  it('returns ELM produced by the translator', async () => {
    const elm = { library: { identifier: { id: 'Example', version: '1.0.0' } } };
    nextResponse = new Response(JSON.stringify(elm), {
      status: 200,
      headers: { 'content-type': 'application/elm+json' },
    });

    assert.deepEqual(await adapter.translate(command), { elm });
    assert.equal(lastRequest?.[0], 'cql-translator');
    assert.match(lastRequest?.[1] ?? '', /\/cql\/translator\?/);
    assert.equal(lastRequest?.[2]?.method, 'POST');
    assert.equal(lastRequest?.[2]?.body, command.cql);
  });

  it('preserves translator diagnostics on invalid CQL', async () => {
    const diagnostics = [{ message: 'Syntax error', locator: '1:1' }];
    nextResponse = new Response(JSON.stringify(diagnostics), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });

    const error = await adapter.translate(command).catch((reason: unknown) => reason);

    assert.ok(error instanceof CqlTranslationError);
    assert.equal(error.upstreamStatus, 400);
    assert.deepEqual(error.diagnostics, diagnostics);
  });

  it('rejects a successful response that is not ELM', async () => {
    nextResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });

    await assert.rejects(adapter.translate(command), { dependency: 'cql-translator' });
  });
});
