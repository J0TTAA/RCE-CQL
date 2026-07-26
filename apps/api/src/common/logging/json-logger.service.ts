import { Injectable, type LoggerService } from '@nestjs/common';

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose' | 'fatal';

const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'setcookie',
  'password',
  'secret',
  'token',
  'accesstoken',
  'refreshtoken',
  'clientsecret',
  'body',
  'cql',
  'elm',
  'resource',
  'patient',
]);
const REDACTED = '[REDACTED]';
const CIRCULAR = '[CIRCULAR]';

function isSensitiveKey(key: string): boolean {
  return (
    SENSITIVE_KEYS.has(key) ||
    ['authorization', 'password', 'secret', 'token', 'cookie'].some((fragment) =>
      key.includes(fragment),
    )
  );
}

export function redactLogValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message };
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return CIRCULAR;
    }
    seen.add(value);
    return value.map((item) => redactLogValue(item, seen));
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  if (seen.has(value)) {
    return CIRCULAR;
  }

  seen.add(value);
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      const normalizedKey = key.toLowerCase().replaceAll('-', '').replaceAll('_', '');
      return [key, isSensitiveKey(normalizedKey) ? REDACTED : redactLogValue(item, seen)];
    }),
  );
}

@Injectable()
export class JsonLoggerService implements LoggerService {
  log(message: unknown, context?: string): void {
    this.write('log', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }

  fatal(message: unknown, context?: string): void {
    this.write('fatal', message, context);
  }

  private write(level: LogLevel, message: unknown, context?: string, trace?: string): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      context,
      message: redactLogValue(message),
      ...(trace ? { trace } : {}),
    };
    const output = `${JSON.stringify(entry)}\n`;
    if (level === 'error' || level === 'fatal') {
      process.stderr.write(output);
      return;
    }
    process.stdout.write(output);
  }
}
