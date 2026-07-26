import { Module } from '@nestjs/common';
import { CqlModule } from '../cql/cql.module';
import { FhirModule } from '../fhir/fhir.module';
import { UiService } from './application/ui.service';
import { UiController } from './presentation/ui.controller';

@Module({
  imports: [FhirModule, CqlModule],
  controllers: [UiController],
  providers: [UiService],
})
export class UiModule {}
