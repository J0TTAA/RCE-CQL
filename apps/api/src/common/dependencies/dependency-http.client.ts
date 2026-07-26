import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvironmentVariables } from '../../config/environment';
import { DependencyError } from '../errors/dependency.error';

@Injectable()
export class DependencyHttpClient {
  constructor(private readonly config: ConfigService<EnvironmentVariables, true>) {}

  async request(dependency: string, url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.get('DEPENDENCY_TIMEOUT_MS', { infer: true }),
    );

    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      const reason = error instanceof Error && error.name === 'AbortError' ? 'timed out' : 'failed';
      throw new DependencyError(dependency, `${dependency} request ${reason}`);
    } finally {
      clearTimeout(timeout);
    }
  }
}
