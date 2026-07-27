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
        ANONYMOUS_CLASSROOM_ENABLED: environment.ANONYMOUS_CLASSROOM_ENABLED,
        ANONYMOUS_SESSION_COOKIE_NAME: environment.ANONYMOUS_SESSION_COOKIE_NAME,
        ANONYMOUS_SESSION_COOKIE_SECURE: environment.ANONYMOUS_SESSION_COOKIE_SECURE,
        ANONYMOUS_SESSION_COOKIE_SAMESITE: environment.ANONYMOUS_SESSION_COOKIE_SAMESITE,
        ANONYMOUS_SESSION_TTL_HOURS: environment.ANONYMOUS_SESSION_TTL_HOURS,
        CLASSROOM_DEFAULT_ID: environment.CLASSROOM_DEFAULT_ID,
      },
      {
        NODE_ENV: 'development',
        PORT: 3000,
        API_PREFIX: 'api/v1',
        DEPENDENCY_TIMEOUT_MS: 5000,
        HAPI_AUTH_BEARER_TOKEN: '',
        ANONYMOUS_CLASSROOM_ENABLED: true,
        ANONYMOUS_SESSION_COOKIE_NAME: 'rce_session',
        ANONYMOUS_SESSION_COOKIE_SECURE: false,
        ANONYMOUS_SESSION_COOKIE_SAMESITE: 'Lax',
        ANONYMOUS_SESSION_TTL_HOURS: 8,
        CLASSROOM_DEFAULT_ID: 'demo-aula',
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
