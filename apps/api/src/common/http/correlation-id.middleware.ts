import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const CORRELATION_ID_HEADER = 'x-correlation-id';
const VALID_CORRELATION_ID = /^[A-Za-z0-9._:-]{1,128}$/;

export interface CorrelatedRequest extends Request {
  correlationId: string;
}

export function correlationIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const candidate = request.header(CORRELATION_ID_HEADER);
  const correlationId =
    candidate && VALID_CORRELATION_ID.test(candidate) ? candidate : randomUUID();
  (request as CorrelatedRequest).correlationId = correlationId;
  response.setHeader(CORRELATION_ID_HEADER, correlationId);
  next();
}
