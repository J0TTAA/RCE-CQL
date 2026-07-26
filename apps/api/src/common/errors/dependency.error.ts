export class DependencyError extends Error {
  constructor(
    public readonly dependency: string,
    message: string,
    public readonly upstreamStatus?: number,
  ) {
    super(message);
    this.name = DependencyError.name;
  }
}
