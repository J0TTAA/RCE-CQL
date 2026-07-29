import { Module } from '@nestjs/common';
import { ClassroomSessionModule } from '../classroom-session/classroom-session.module';
import { UiModule } from '../ui/ui.module';
import { CdsHooksService } from './application/cds-hooks.service';
import { CdsHooksController } from './presentation/cds-hooks.controller';

@Module({
  imports: [ClassroomSessionModule, UiModule],
  controllers: [CdsHooksController],
  providers: [CdsHooksService],
})
export class CdsHooksModule {}
