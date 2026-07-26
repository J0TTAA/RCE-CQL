import { Injectable } from '@nestjs/common';
import type { DependencyHealth } from '../../common/dependencies/dependency-health';
import { CqlTranslatorPort } from '../cql/application/cql-translator.port';
import { FhirGatewayPort } from '../fhir/application/fhir-gateway.port';

interface DependencyDown {
  name: string;
  status: 'down';
  message: string;
}

export interface ReadinessReport {
  status: 'up' | 'down';
  checkedAt: string;
  dependencies: Array<DependencyHealth | DependencyDown>;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly fhir: FhirGatewayPort,
    private readonly translator: CqlTranslatorPort,
  ) {}

  liveness(): { status: 'up'; checkedAt: string } {
    return { status: 'up', checkedAt: new Date().toISOString() };
  }

  async readiness(): Promise<ReadinessReport> {
    const checks = await Promise.allSettled([
      this.fhir.checkHealth(),
      this.translator.checkHealth(),
    ]);
    const names = ['hapi-fhir', 'cql-translator'];
    const dependencies = checks.map((check, index): DependencyHealth | DependencyDown => {
      if (check.status === 'fulfilled') {
        return check.value;
      }
      return {
        name: names[index] ?? 'unknown',
        status: 'down',
        message: check.reason instanceof Error ? check.reason.message : 'Dependency check failed',
      };
    });

    return {
      status: dependencies.every((dependency) => dependency.status === 'up') ? 'up' : 'down',
      checkedAt: new Date().toISOString(),
      dependencies,
    };
  }
}
