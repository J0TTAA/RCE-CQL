import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { validateEnvironment, type EnvironmentVariables } from '../../../config/environment';
import { ClassroomSessionService } from './classroom-session.service';

type HeaderValue = number | string | readonly string[];

describe('ClassroomSessionService', () => {
  it('creates a signed anonymous session cookie', () => {
    const service = new ClassroomSessionService(testConfig());
    const response = testResponse();

    const session = service.resolve(testRequest(), response.response);
    const cookie = fullSessionCookie(response);

    assert.equal(session.classroomId, 'demo-aula');
    assert.equal(session.role, 'student');
    assert.match(session.sandboxId, /^sandbox-[a-f0-9]{24}$/);
    assert.match(cookie, /^rce_session=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
  });

  it('reuses a valid cookie without changing sandbox', () => {
    const service = new ClassroomSessionService(testConfig());
    const firstResponse = testResponse();
    const first = service.resolve(testRequest(), firstResponse.response);

    const second = service.resolve(
      testRequest(sessionCookie(firstResponse)),
      testResponse().response,
    );

    assert.equal(second.sandboxId, first.sandboxId);
    assert.equal(second.anonymousSessionId, first.anonymousSessionId);
  });

  it('changes role while preserving the sandbox', () => {
    const service = new ClassroomSessionService(testConfig());
    const firstResponse = testResponse();
    const first = service.resolve(testRequest(), firstResponse.response);
    const roleResponse = testResponse();

    const changed = service.setRole(
      testRequest(sessionCookie(firstResponse)),
      roleResponse.response,
      'teacher',
    );
    const reloaded = service.resolve(
      testRequest(sessionCookie(roleResponse)),
      testResponse().response,
    );

    assert.equal(changed.sandboxId, first.sandboxId);
    assert.equal(changed.role, 'teacher');
    assert.equal(reloaded.role, 'teacher');
  });

  it('resets only the browser sandbox and preserves role by default', () => {
    const service = new ClassroomSessionService(testConfig());
    const firstResponse = testResponse();
    const first = service.resolve(testRequest(), firstResponse.response);
    const roleResponse = testResponse();
    const teacher = service.setRole(
      testRequest(sessionCookie(firstResponse)),
      roleResponse.response,
      'teacher',
    );
    const resetResponse = testResponse();

    const reset = service.reset(testRequest(sessionCookie(roleResponse)), resetResponse.response);

    assert.equal(teacher.role, 'teacher');
    assert.equal(reset.role, 'teacher');
    assert.notEqual(reset.sandboxId, first.sandboxId);
  });
});

function testConfig(): ConfigService<EnvironmentVariables, true> {
  const environment = validateEnvironment({
    HAPI_BASE_URL: 'http://hapi:8080/fhir',
    CQL_TRANSLATOR_BASE_URL: 'http://cql-translator:8080',
  });
  return {
    get: (key: keyof EnvironmentVariables) => environment[key],
  } as ConfigService<EnvironmentVariables, true>;
}

function testRequest(cookie?: string): Request {
  return {
    headers: cookie ? { cookie } : {},
  } as Request;
}

function testResponse(): { response: Response; headers: Map<string, HeaderValue> } {
  const headers = new Map<string, HeaderValue>();
  return {
    headers,
    response: {
      setHeader(name: string, value: HeaderValue) {
        headers.set(name, value);
        return this;
      },
    } as Response,
  };
}

function sessionCookie(response: { headers: Map<string, HeaderValue> }): string {
  return fullSessionCookie(response).split(';')[0] ?? '';
}

function fullSessionCookie(response: { headers: Map<string, HeaderValue> }): string {
  const value = response.headers.get('Set-Cookie');
  if (typeof value !== 'string') {
    assert.fail('Set-Cookie header was not written.');
  }
  return value;
}
