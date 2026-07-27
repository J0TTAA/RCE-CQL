import { Module } from '@nestjs/common';
import { ClassroomSessionModule } from '../classroom-session/classroom-session.module';
import { CqlModule } from '../cql/cql.module';
import { FhirModule } from '../fhir/fhir.module';
import { UiService } from './application/ui.service';
import { UiController } from './presentation/ui.controller';

@Module({
  imports: [FhirModule, CqlModule, ClassroomSessionModule],
  controllers: [UiController],
  providers: [UiService],
})
export class UiModule {}
