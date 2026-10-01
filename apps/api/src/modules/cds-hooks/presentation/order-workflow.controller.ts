import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ClassroomSessionService } from '../../classroom-session/application/classroom-session.service';
import { OrderWorkflowService } from '../application/order-workflow.service';
import { ConfirmOrdersDto, ReviewOrdersDto } from './order-workflow.dto';
import { ORDER_RULE_TEMPLATES } from '../application/order-rule-templates';

@ApiTags('Ordenes educativas')
@Controller('ui/orders')
export class OrderWorkflowController {
  constructor(
    private readonly orders: OrderWorkflowService,
    private readonly sessions: ClassroomSessionService,
  ) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Catalogo controlado de ordenes FHIR R4' })
  catalog() {
    return this.orders.catalog();
  }

  @Get('templates')
  @ApiOperation({ summary: 'Plantillas CQL educativas para los tres momentos del flujo' })
  templates() {
    return ORDER_RULE_TEMPLATES;
  }

  @Post(':patientId/review')
  @HttpCode(200)
  @ApiOperation({ summary: 'Evaluar seleccion o firma de ordenes con CDS Hooks' })
  review(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('patientId') patientId: string,
    @Body() input: ReviewOrdersDto,
  ) {
    const session = this.sessions.resolve(request, response);
    return this.orders.review(patientId, session.sandboxId, input);
  }

  @Post(':patientId/reviews/:reviewId/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirmar ordenes revisadas solamente en el sandbox actual' })
  confirm(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('patientId') patientId: string,
    @Param('reviewId') reviewId: string,
    @Body() input: ConfirmOrdersDto,
  ) {
    const session = this.sessions.resolve(request, response);
    if (input.confirmed !== true) throw new BadRequestException('Confirmacion requerida.');
    return this.orders.confirm(patientId, session.sandboxId, reviewId);
  }
}
