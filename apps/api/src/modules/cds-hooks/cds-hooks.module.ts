import { Module } from '@nestjs/common';
import { ClassroomSessionModule } from '../classroom-session/classroom-session.module';
import { UiModule } from '../ui/ui.module';
import { CdsHooksService } from './application/cds-hooks.service';
import { CdsHooksController } from './presentation/cds-hooks.controller';
import { FhirModule } from '../fhir/fhir.module';
import { OrderWorkflowController } from './presentation/order-workflow.controller';
import { OrderWorkflowService } from './application/order-workflow.service';

@Module({
  imports: [ClassroomSessionModule, UiModule, FhirModule],
  controllers: [CdsHooksController, OrderWorkflowController],
  providers: [CdsHooksService, OrderWorkflowService],
})
export class CdsHooksModule {}
