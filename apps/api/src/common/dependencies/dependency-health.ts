export interface DependencyHealth {
  name: string;
  status: 'up';
  latencyMs: number;
  details: Record<string, unknown>;
}
