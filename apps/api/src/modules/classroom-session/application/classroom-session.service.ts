import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import type { EnvironmentVariables } from '../../../config/environment';

export type Role = 'student' | 'teacher';

export interface SessionContext {
  anonymousSessionId: string;
  classroomId: string;
  sandboxId: string;
  sandboxLabel: string;
  role: Role;
  expiresAt: string;
}

interface SessionPayload extends SessionContext {
  version: 1;
  issuedAt: string;
}

const SESSION_VERSION = 1;
const roles: Role[] = ['student', 'teacher'];

@Injectable()
export class ClassroomSessionService {
  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  resolve(request: Request, response: Response): SessionContext {
    return publicSession(this.ensurePayload(request, response));
  }

  setRole(request: Request, response: Response, role: Role): SessionContext {
    const current = this.ensurePayload(request, response);
    const next: SessionPayload = { ...current, role };
    this.writeCookie(response, next);
    return publicSession(next);
  }

  reset(request: Request, response: Response, role?: Role): SessionContext {
    const current = this.readSessionCookie(request);
    const next = this.createPayload(role ?? current?.role ?? 'student');
    this.writeCookie(response, next);
    return publicSession(next);
  }

  private ensurePayload(request: Request, response: Response): SessionPayload {
    if (!this.config.get('ANONYMOUS_CLASSROOM_ENABLED', { infer: true })) {
      throw new ServiceUnavailableException('Modo aula anonimo deshabilitado.');
    }
    const current = this.readSessionCookie(request);
    if (current) {
      return current;
    }
    const next = this.createPayload('student');
    this.writeCookie(response, next);
    return next;
  }

  private createPayload(role: Role): SessionPayload {
    const issuedAt = new Date();
    const ttlMs = this.config.get('ANONYMOUS_SESSION_TTL_HOURS', { infer: true }) * 60 * 60 * 1000;
    const sandboxEntropy = randomBytes(12).toString('hex');
    const anonymousEntropy = randomBytes(12).toString('hex');
    return {
      version: SESSION_VERSION,
      anonymousSessionId: `anon-${anonymousEntropy}`,
      classroomId: this.config.get('CLASSROOM_DEFAULT_ID', { infer: true }),
      sandboxId: `sandbox-${sandboxEntropy}`,
      sandboxLabel: `S-${sandboxEntropy.slice(0, 4).toUpperCase()}`,
      role,
      issuedAt: issuedAt.toISOString(),
      expiresAt: new Date(issuedAt.getTime() + ttlMs).toISOString(),
    };
  }

  private readSessionCookie(request: Request): SessionPayload | null {
    const token = parseCookies(request.headers.cookie)[
      this.config.get('ANONYMOUS_SESSION_COOKIE_NAME', { infer: true })
    ];
    if (!token) {
      return null;
    }
    const [payloadPart, signaturePart] = token.split('.');
    if (!payloadPart || !signaturePart) {
      return null;
    }
    const expectedSignature = this.sign(payloadPart);
    if (!safeEqual(signaturePart, expectedSignature)) {
      return null;
    }
    try {
      const payload = JSON.parse(
        Buffer.from(payloadPart, 'base64url').toString('utf8'),
      ) as Partial<SessionPayload> | null;
      return this.validPayload(payload) ? payload : null;
    } catch {
      return null;
    }
  }

  private validPayload(payload: Partial<SessionPayload> | null): payload is SessionPayload {
    if (!payload || payload.version !== SESSION_VERSION) {
      return false;
    }
    if (payload.classroomId !== this.config.get('CLASSROOM_DEFAULT_ID', { infer: true })) {
      return false;
    }
    if (!roles.includes(payload.role as Role)) {
      return false;
    }
    if (
      typeof payload.anonymousSessionId !== 'string' ||
      typeof payload.sandboxId !== 'string' ||
      typeof payload.sandboxLabel !== 'string' ||
      typeof payload.issuedAt !== 'string' ||
      typeof payload.expiresAt !== 'string' ||
      !payload.anonymousSessionId ||
      !payload.sandboxId ||
      !payload.sandboxLabel ||
      !payload.issuedAt ||
      !payload.expiresAt
    ) {
      return false;
    }
    return Date.parse(payload.expiresAt) > Date.now();
  }

  private writeCookie(response: Response, payload: SessionPayload): void {
    const payloadPart = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const token = `${payloadPart}.${this.sign(payloadPart)}`;
    const maxAgeSeconds = Math.max(
      0,
      Math.floor((Date.parse(payload.expiresAt) - Date.now()) / 1000),
    );
    const sameSite = this.config.get('ANONYMOUS_SESSION_COOKIE_SAMESITE', { infer: true });
    const secure =
      this.config.get('ANONYMOUS_SESSION_COOKIE_SECURE', { infer: true }) ||
      sameSite.toLowerCase() === 'none';
    const cookie = [
      `${this.config.get('ANONYMOUS_SESSION_COOKIE_NAME', { infer: true })}=${encodeURIComponent(token)}`,
      'Path=/',
      'HttpOnly',
      `SameSite=${sameSite}`,
      `Max-Age=${maxAgeSeconds}`,
    ];
    if (secure) {
      cookie.push('Secure');
    }
    response.setHeader('Set-Cookie', cookie.join('; '));
  }

  private sign(payloadPart: string): string {
    return createHmac('sha256', this.config.get('ANONYMOUS_SESSION_SECRET', { infer: true }))
      .update(payloadPart)
      .digest('base64url');
  }
}

function publicSession(payload: SessionPayload): SessionContext {
  return {
    anonymousSessionId: payload.anonymousSessionId,
    classroomId: payload.classroomId,
    sandboxId: payload.sandboxId,
    sandboxLabel: payload.sandboxLabel,
    role: payload.role,
    expiresAt: payload.expiresAt,
  };
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader?.split(';') ?? []) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const name = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (name) {
      try {
        cookies[name] = decodeURIComponent(value);
      } catch {
        cookies[name] = value;
      }
    }
  }
  return cookies;
}

function safeEqual(value: string, expected: string): boolean {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return (
    valueBuffer.length === expectedBuffer.length && timingSafeEqual(valueBuffer, expectedBuffer)
  );
}
