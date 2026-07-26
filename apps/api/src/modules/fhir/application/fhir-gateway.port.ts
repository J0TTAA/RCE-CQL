import type { DependencyHealth } from '../../../common/dependencies/dependency-health';

export interface FhirBundle {
  resourceType: 'Bundle';
  type?: string;
  total?: number;
  entry?: Array<{ resource?: FhirResource; response?: { status?: string } }>;
}

export interface FhirResource {
  resourceType?: string;
  id?: string;
  meta?: { tag?: Array<{ system?: string; code?: string; display?: string }> };
  [key: string]: unknown;
}

export abstract class FhirGatewayPort {
  abstract checkHealth(): Promise<DependencyHealth>;
  abstract search(resourceType: string, params?: Record<string, string>): Promise<FhirBundle>;
  abstract read(resourceType: string, id: string): Promise<FhirResource | null>;
  abstract create(resource: FhirResource): Promise<FhirResource>;
  abstract update(resourceType: string, id: string, resource: FhirResource): Promise<FhirResource>;
  abstract patientEverything(
    patientId: string,
    params?: Record<string, string>,
  ): Promise<FhirBundle>;
}
