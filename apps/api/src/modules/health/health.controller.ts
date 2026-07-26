import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { HealthService, type ReadinessReport } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('live')
  @ApiOkResponse({ description: 'El proceso NestJS esta activo' })
  liveness(): { status: 'up'; checkedAt: string } {
    return this.health.liveness();
  }

  @Get('ready')
  @ApiOkResponse({ description: 'HAPI y el traductor estan disponibles' })
  @ApiServiceUnavailableResponse({ description: 'Una dependencia obligatoria no esta disponible' })
  async readiness(@Res({ passthrough: true }) response: Response): Promise<ReadinessReport> {
    const report = await this.health.readiness();
    if (report.status === 'down') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return report;
  }
}
