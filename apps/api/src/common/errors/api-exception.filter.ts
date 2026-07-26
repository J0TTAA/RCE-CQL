import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  type ExceptionFilter,
} from '@nestjs/common';
import type { Response } from 'express';
import type { CorrelatedRequest } from '../http/correlation-id.middleware';
import { JsonLoggerService } from '../logging/json-logger.service';
import { CqlTranslationError } from './cql-translation.error';
import { DependencyError } from './dependency.error';

interface ApiErrorBody {
  code: string;
  message: string;
  correlationId: string;
  details?: unknown;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: JsonLoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<CorrelatedRequest>();
    const response = http.getResponse<Response>();
    const normalized = this.normalize(exception, request.correlationId);

    this.logger.error(
      {
        event: 'http_error',
        code: normalized.body.code,
        method: request.method,
        path: request.originalUrl,
        statusCode: normalized.status,
        correlationId: request.correlationId,
      },
      exception instanceof Error ? exception.stack : undefined,
      ApiExceptionFilter.name,
    );
    response.status(normalized.status).json(normalized.body);
  }

  private normalize(
    exception: unknown,
    correlationId: string,
  ): { status: number; body: ApiErrorBody } {
    if (exception instanceof CqlTranslationError) {
      return {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        body: {
          code: 'CQL_TRANSLATION_FAILED',
          message: exception.message,
          correlationId,
          details: {
            upstreamStatus: exception.upstreamStatus,
            diagnostics: exception.diagnostics,
          },
        },
      };
    }

    if (exception instanceof DependencyError) {
      return {
        status: HttpStatus.SERVICE_UNAVAILABLE,
        body: {
          code: 'DEPENDENCY_UNAVAILABLE',
          message: exception.message,
          correlationId,
          details: {
            dependency: exception.dependency,
            upstreamStatus: exception.upstreamStatus,
          },
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const details = typeof payload === 'object' ? payload : undefined;
      const message =
        typeof payload === 'string' ? payload : (this.extractMessage(payload) ?? exception.message);
      return {
        status,
        body: {
          code: status === 400 ? 'VALIDATION_ERROR' : `HTTP_${status}`,
          message,
          correlationId,
          ...(details ? { details } : {}),
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: 'INTERNAL_ERROR',
        message: 'Unexpected server error',
        correlationId,
      },
    };
  }

  private extractMessage(payload: object): string | undefined {
    if (!('message' in payload)) {
      return undefined;
    }
    const message = payload.message;
    return Array.isArray(message) ? message.join('; ') : String(message);
  }
}
