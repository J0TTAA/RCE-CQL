import type { DependencyHealth } from '../../../common/dependencies/dependency-health';

export interface TranslateCqlCommand {
  cql: string;
  options: {
    annotations: boolean;
    locators: boolean;
    resultTypes: boolean;
    detailedErrors: boolean;
    strict: boolean;
  };
}

export interface TranslateCqlResult {
  elm: unknown;
}

export abstract class CqlTranslatorPort {
  abstract translate(command: TranslateCqlCommand): Promise<TranslateCqlResult>;
  abstract checkHealth(): Promise<DependencyHealth>;
}
