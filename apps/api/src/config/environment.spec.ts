import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateEnvironment } from './environment';

describe('validateEnvironment', () => {
  it('applies defaults to a valid configuration', () => {
    const environment = validateEnvironment({
      HAPI_BASE_URL: 'http://hapi:8080/fhir',
      CQL_TRANSLATOR_BASE_URL: 'http://cql-translator:8080',
    });

    assert.deepEqual(
      {
        NODE_ENV: environment.NODE_ENV,
        PORT: environment.PORT,
        API_PREFIX: environment.API_PREFIX,
        DEPENDENCY_TIMEOUT_MS: environment.DEPENDENCY_TIMEOUT_MS,
        HAPI_AUTH_BEARER_TOKEN: environment.HAPI_AUTH_BEARER_TOKEN,
      },
      {
        NODE_ENV: 'development',
        PORT: 3000,
        API_PREFIX: 'api/v1',
        DEPENDENCY_TIMEOUT_MS: 5000,
        HAPI_AUTH_BEARER_TOKEN: '',
      },
    );
  });

  it('rejects invalid dependency URLs', () => {
    assert.throws(
      () =>
        validateEnvironment({
          HAPI_BASE_URL: 'not-a-url',
          CQL_TRANSLATOR_BASE_URL: 'http://cql-translator:8080',
        }),
      /Invalid environment configuration/,
    );
  });
});
