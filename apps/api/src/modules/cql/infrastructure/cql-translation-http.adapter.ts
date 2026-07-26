import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DependencyHealth } from '../../../common/dependencies/dependency-health';
import { DependencyHttpClient } from '../../../common/dependencies/dependency-http.client';
import { CqlTranslationError } from '../../../common/errors/cql-translation.error';
import { DependencyError } from '../../../common/errors/dependency.error';
import type { EnvironmentVariables } from '../../../config/environment';
import {
  CqlTranslatorPort,
  type TranslateCqlCommand,
  type TranslateCqlResult,
} from '../application/cql-translator.port';

const READINESS_CQL = `library RceReadiness version '1.0.0'
using FHIR version '4.0.1'
context Patient
define "Ready": true`;

@Injectable()
export class CqlTranslationHttpAdapter implements CqlTranslatorPort {
  private readonly baseUrl: string;

  constructor(
    config: ConfigService<EnvironmentVariables, true>,
    private readonly http: DependencyHttpClient,
  ) {
    this.baseUrl = config.get('CQL_TRANSLATOR_BASE_URL', { infer: true }).replace(/\/$/, '');
  }

  async translate(command: TranslateCqlCommand): Promise<TranslateCqlResult> {
    const parameters = new URLSearchParams({
      annotations: String(command.options.annotations),
      locators: String(command.options.locators),
      'result-types': String(command.options.resultTypes),
      'detailed-errors': String(command.options.detailedErrors),
      strict: String(command.options.strict),
    });
    const response = await this.http.request(
      'cql-translator',
      `${this.baseUrl}/cql/translator?${parameters.toString()}`,
      {
        method: 'POST',
        headers: {
          accept: 'application/elm+json',
          'content-type': 'application/cql',
        },
        body: command.cql,
      },
    );
    const body = await response.text();
    const parsedBody = this.parseBody(body);

    if (!response.ok) {
      throw new CqlTranslationError(parsedBody, response.status);
    }
    if (!this.hasElmLibrary(parsedBody)) {
      throw new DependencyError('cql-translator', 'Translator returned invalid ELM');
    }

    return { elm: parsedBody };
  }

  async checkHealth(): Promise<DependencyHealth> {
    const startedAt = performance.now();
    const result = await this.translate({
      cql: READINESS_CQL,
      options: {
        annotations: false,
        locators: true,
        resultTypes: true,
        detailedErrors: true,
        strict: true,
      },
    });
    const library = (result.elm as { library: { identifier?: { id?: string } } }).library;
    return {
      name: 'cql-translator',
      status: 'up',
      latencyMs: Math.round(performance.now() - startedAt),
      details: { libraryId: library.identifier?.id ?? 'unknown' },
    };
  }

  private parseBody(body: string): unknown {
    try {
      return JSON.parse(body) as unknown;
    } catch {
      return { message: body.slice(0, 10_000) };
    }
  }

  private hasElmLibrary(value: unknown): value is { library: object } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'library' in value &&
      typeof value.library === 'object' &&
      value.library !== null
    );
  }
}
