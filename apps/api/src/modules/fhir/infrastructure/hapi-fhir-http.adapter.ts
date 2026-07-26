import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DependencyHealth } from '../../../common/dependencies/dependency-health';
import { DependencyHttpClient } from '../../../common/dependencies/dependency-http.client';
import { DependencyError } from '../../../common/errors/dependency.error';
import type { EnvironmentVariables } from '../../../config/environment';
import { FhirGatewayPort } from '../application/fhir-gateway.port';

interface CapabilityStatementSubset {
  resourceType?: string;
  fhirVersion?: string;
  software?: { version?: string };
  rest?: Array<{
    operation?: Array<{ name?: string }>;
    resource?: Array<{
      type?: string;
      operation?: Array<{ name?: string }>;
    }>;
  }>;
}

@Injectable()
export class HapiFhirHttpAdapter implements FhirGatewayPort {
  private readonly baseUrl: string;
  private readonly bearerToken: string;

  constructor(
    config: ConfigService<EnvironmentVariables, true>,
    private readonly http: DependencyHttpClient,
  ) {
    this.baseUrl = config.get('HAPI_BASE_URL', { infer: true }).replace(/\/$/, '');
    this.bearerToken = config.get('HAPI_AUTH_BEARER_TOKEN', { infer: true });
  }

  async checkHealth(): Promise<DependencyHealth> {
    const startedAt = performance.now();
    const response = await this.http.request('hapi-fhir', `${this.baseUrl}/metadata`, {
      headers: this.fhirHeaders(),
    });
    if (!response.ok) {
      throw new DependencyError('hapi-fhir', 'HAPI FHIR metadata request failed', response.status);
    }

    const capability = (await response.json()) as CapabilityStatementSubset;
    if (capability.resourceType !== 'CapabilityStatement') {
      throw new DependencyError('hapi-fhir', 'HAPI returned an invalid CapabilityStatement');
    }

    const resources = capability.rest?.flatMap((rest) => rest.resource ?? []) ?? [];
    const resourceTypes = resources.flatMap((resource) => (resource.type ? [resource.type] : []));
    const operationNames = [
      ...(capability.rest?.flatMap((rest) => rest.operation ?? []) ?? []),
      ...resources.flatMap((resource) => resource.operation ?? []),
    ].flatMap((operation) => (operation.name ? [operation.name] : []));
    const hasClinicalArtifacts =
      resourceTypes.includes('Library') && resourceTypes.includes('PlanDefinition');

    if (capability.fhirVersion !== '4.0.1' || !hasClinicalArtifacts) {
      throw new DependencyError(
        'hapi-fhir',
        'HAPI is reachable but FHIR R4 clinical artifacts are not available',
      );
    }

    return {
      name: 'hapi-fhir',
      status: 'up',
      latencyMs: Math.round(performance.now() - startedAt),
      details: {
        fhirVersion: capability.fhirVersion,
        softwareVersion: capability.software?.version ?? 'unknown',
        libraryAvailable: true,
        planDefinitionAvailable: true,
        applyAdvertised: operationNames.some((name) => name.toLowerCase().includes('apply')),
      },
    };
  }

  private fhirHeaders(): Record<string, string> {
    return {
      accept: 'application/fhir+json',
      ...(this.bearerToken ? { authorization: `Bearer ${this.bearerToken}` } : {}),
    };
  }
}
