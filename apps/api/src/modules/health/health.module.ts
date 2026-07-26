import { Module } from '@nestjs/common';
import { CqlModule } from '../cql/cql.module';
import { FhirModule } from '../fhir/fhir.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [FhirModule, CqlModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
