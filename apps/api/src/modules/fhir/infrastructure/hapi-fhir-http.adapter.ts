import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DependencyHealth } from '../../../common/dependencies/dependency-health';
import { DependencyHttpClient } from '../../../common/dependencies/dependency-http.client';
import { DependencyError } from '../../../common/errors/dependency.error';
import type { EnvironmentVariables } from '../../../config/environment';
import {
  FhirGatewayPort,
  type FhirBundle,
  type FhirResource,
} from '../application/fhir-gateway.port';

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
    const hasRequiredResources =
      resourceTypes.includes('Patient') &&
      resourceTypes.includes('Library') &&
      resourceTypes.includes('Basic');

    if (capability.fhirVersion !== '4.0.1' || !hasRequiredResources) {
      throw new DependencyError(
        'hapi-fhir',
        'HAPI is reachable but required FHIR R4 resources are not available',
      );
    }

    return {
      name: 'hapi-fhir',
      status: 'up',
      latencyMs: Math.round(performance.now() - startedAt),
      details: {
        fhirVersion: capability.fhirVersion,
        softwareVersion: capability.software?.version ?? 'unknown',
        patientAvailable: true,
        libraryAvailable: true,
        basicAvailable: true,
        applyAdvertised: operationNames.some((name) => name.toLowerCase().includes('apply')),
      },
    };
  }

  async search(resourceType: string, params: Record<string, string> = {}): Promise<FhirBundle> {
    const response = await this.request(
      `${this.baseUrl}/${encodeURIComponent(resourceType)}?${new URLSearchParams(params).toString()}`,
      { method: 'GET' },
    );
    return this.parseBundle(response, `search ${resourceType}`);
  }

  async read(resourceType: string, id: string): Promise<FhirResource | null> {
    const response = await this.request(
      `${this.baseUrl}/${encodeURIComponent(resourceType)}/${encodeURIComponent(id)}`,
      { method: 'GET' },
      [404],
    );
    if (response.status === 404) {
      return null;
    }
    return this.parseResource(response, `read ${resourceType}/${id}`);
  }

  async create(resource: FhirResource): Promise<FhirResource> {
    if (!resource.resourceType) {
      throw new DependencyError('hapi-fhir', 'Cannot create FHIR resource without resourceType');
    }
    const response = await this.request(
      `${this.baseUrl}/${encodeURIComponent(resource.resourceType)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/fhir+json' },
        body: JSON.stringify(resource),
      },
    );
    return this.parseResource(response, `create ${resource.resourceType}`);
  }

  async update(resourceType: string, id: string, resource: FhirResource): Promise<FhirResource> {
    const response = await this.request(
      `${this.baseUrl}/${encodeURIComponent(resourceType)}/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: { 'content-type': 'application/fhir+json' },
        body: JSON.stringify(resource),
      },
    );
    return this.parseResource(response, `update ${resourceType}/${id}`);
  }

  async patientEverything(
    patientId: string,
    params: Record<string, string> = { _count: '200' },
  ): Promise<FhirBundle> {
    const response = await this.request(
      `${this.baseUrl}/Patient/${encodeURIComponent(patientId)}/$everything?${new URLSearchParams(params).toString()}`,
      { method: 'GET' },
    );
    return this.parseBundle(response, `Patient/${patientId}/$everything`);
  }

  private fhirHeaders(): Record<string, string> {
    return {
      accept: 'application/fhir+json',
      ...(this.bearerToken ? { authorization: `Bearer ${this.bearerToken}` } : {}),
    };
  }

  private async request(
    url: string,
    init: RequestInit,
    allowedStatuses: number[] = [],
  ): Promise<Response> {
    const response = await this.http.request('hapi-fhir', url, {
      ...init,
      headers: {
        ...this.fhirHeaders(),
        ...(init.headers ?? {}),
      },
    });
    if (!response.ok && !allowedStatuses.includes(response.status)) {
      throw new DependencyError(
        'hapi-fhir',
        `HAPI FHIR request failed with HTTP ${response.status}`,
        response.status,
      );
    }
    return response;
  }

  private async parseBundle(response: Response, operation: string): Promise<FhirBundle> {
    const payload = (await response.json()) as FhirResource;
    if (payload.resourceType !== 'Bundle') {
      throw new DependencyError(
        'hapi-fhir',
        `HAPI returned invalid Bundle for ${operation}`,
        response.status,
      );
    }
    return payload as FhirBundle;
  }

  private async parseResource(response: Response, operation: string): Promise<FhirResource> {
    const payload = (await response.json()) as FhirResource;
    if (!payload.resourceType || payload.resourceType === 'OperationOutcome') {
      throw new DependencyError(
        'hapi-fhir',
        `HAPI returned invalid resource for ${operation}`,
        response.status,
      );
    }
    return payload;
  }
}
