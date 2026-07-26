export class CqlTranslationError extends Error {
  constructor(
    public readonly diagnostics: unknown,
    public readonly upstreamStatus: number,
  ) {
    super('CQL translation failed');
    this.name = CqlTranslationError.name;
  }
}
