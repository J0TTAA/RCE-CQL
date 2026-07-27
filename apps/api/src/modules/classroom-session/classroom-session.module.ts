import { Module } from '@nestjs/common';
import { ClassroomSessionService } from './application/classroom-session.service';
import { ClassroomSessionController } from './presentation/classroom-session.controller';

@Module({
  controllers: [ClassroomSessionController],
  providers: [ClassroomSessionService],
  exports: [ClassroomSessionService],
})
export class ClassroomSessionModule {}
