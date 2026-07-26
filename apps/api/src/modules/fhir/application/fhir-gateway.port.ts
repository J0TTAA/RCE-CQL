import type { DependencyHealth } from '../../../common/dependencies/dependency-health';

export abstract class FhirGatewayPort {
  abstract checkHealth(): Promise<DependencyHealth>;
}
