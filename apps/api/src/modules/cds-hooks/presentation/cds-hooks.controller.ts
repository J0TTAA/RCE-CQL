import { Body, Controller, Get, HttpCode, Param, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ClassroomSessionService } from '../../classroom-session/application/classroom-session.service';
import { CdsHooksService } from '../application/cds-hooks.service';
import { CdsFeedbackRequestDto, CdsHookRequestDto } from './cds-hooks.dto';

@ApiTags('CDS Hooks')
@Controller('cds-services')
export class CdsHooksController {
  constructor(
    private readonly cdsHooks: CdsHooksService,
    private readonly sessions: ClassroomSessionService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'CDS Services Discovery' })
  discovery() {
    return this.cdsHooks.discovery();
  }

  @Post(':serviceId/feedback')
  @HttpCode(200)
  @ApiOperation({ summary: 'Aceptar feedback CDS Hooks' })
  feedback(@Param('serviceId') serviceId: string, @Body() dto: CdsFeedbackRequestDto) {
    return this.cdsHooks.acceptFeedback(serviceId, dto);
  }

  @Post(':serviceId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Invocar un CDS Service estandar' })
  invoke(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('serviceId') serviceId: string,
    @Body() dto: CdsHookRequestDto,
  ) {
    const session = this.sessions.resolve(request, response);
    return this.cdsHooks.invoke(serviceId, session.sandboxId, dto);
  }
}
