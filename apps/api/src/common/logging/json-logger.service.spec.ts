import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { redactLogValue } from './json-logger.service';

describe('redactLogValue', () => {
  it('redacts credentials and clinical payloads recursively', () => {
    const redacted = redactLogValue({
      event: 'translation_requested',
      authorization: 'Bearer secret',
      HAPI_AUTH_BEARER_TOKEN: 'another-secret',
      nested: {
        patient: { id: 'synthetic-001' },
        cql: "library Secret version '1.0.0'",
      },
    });

    assert.deepEqual(redacted, {
      event: 'translation_requested',
      authorization: '[REDACTED]',
      HAPI_AUTH_BEARER_TOKEN: '[REDACTED]',
      nested: {
        patient: '[REDACTED]',
        cql: '[REDACTED]',
      },
    });
  });

  it('handles circular objects without failing serialization', () => {
    const value: { self?: unknown } = {};
    value.self = value;

    assert.deepEqual(redactLogValue(value), { self: '[CIRCULAR]' });
  });
});
