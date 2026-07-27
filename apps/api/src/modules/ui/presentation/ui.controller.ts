import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import {
  ClassroomSessionService,
  type Role,
  type SessionContext,
} from '../../classroom-session/application/classroom-session.service';
import { UiService } from '../application/ui.service';
import {
  CreateRuleDto,
  RuleActivationDto,
  SaveRuleDto,
  TestRuleDto,
  UpdatePatientDto,
  ValidateRuleDto,
} from './ui.dto';

@ApiTags('RCE UI')
@Controller('ui')
export class UiController {
  constructor(
    private readonly ui: UiService,
    private readonly sessions: ClassroomSessionService,
  ) {}

  @Get('patients')
  @ApiOperation({ summary: 'Listar pacientes desde HAPI FHIR' })
  listPatients(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Query() query: Record<string, string | undefined>,
  ) {
    const session = this.session(request, response);
    return this.ui.listPatients(session.sandboxId, query);
  }

  @Get('patients/:id')
  @ApiOperation({ summary: 'Obtener ficha clinica FHIR del paciente' })
  getPatient(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('id') id: string,
  ) {
    const session = this.session(request, response);
    return this.ui.getPatient(id, session.sandboxId);
  }

  @Get('patients/:id/cards')
  @ApiOperation({ summary: 'Evaluar reglas activas y retornar cards CDS' })
  getPatientCards(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('id') id: string,
  ) {
    const session = this.session(request, response);
    return this.ui.getPatientCards(id, session.sandboxId);
  }

  @Patch('patients/:id')
  @ApiOperation({ summary: 'Guardar cambios clinicos en el sandbox y reevaluar hooks' })
  updatePatient(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    const session = this.session(request, response);
    return this.ui.updatePatientBirthDate(id, session.sandboxId, dto.birthDate);
  }

  @Get('rules')
  @ApiOperation({ summary: 'Listar reglas CQL guardadas como FHIR Library' })
  listRules(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Query() query: Record<string, string | undefined>,
  ) {
    const session = this.session(request, response);
    return this.ui.listRules(session.sandboxId, query);
  }

  @Post('rules')
  @ApiOperation({ summary: 'Crear regla CQL draft en HAPI' })
  createRule(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: CreateRuleDto,
  ) {
    const session = this.session(request, response);
    return this.ui.createRule(session.sandboxId, dto.metadata, dto.cql);
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Obtener regla CQL desde HAPI' })
  getRule(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('id') id: string,
  ) {
    const session = this.session(request, response);
    return this.ui.getRule(id, session.sandboxId);
  }

  @Put('rules/:id')
  @ApiOperation({ summary: 'Guardar draft de regla CQL en HAPI' })
  saveRule(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('id') id: string,
    @Body() dto: SaveRuleDto,
  ) {
    const session = this.session(request, response);
    return this.ui.saveRule(id, session.sandboxId, dto.cql, dto.metadata);
  }

  @Post('rules/:id/validate')
  @ApiOperation({ summary: 'Traducir CQL a ELM y guardar ELM en Library' })
  validateRule(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('id') id: string,
    @Body() dto: ValidateRuleDto,
  ) {
    const session = this.session(request, response);
    return this.ui.validateRule(id, session.sandboxId, dto.cql);
  }

  @Post('rules/:id/test')
  @ApiOperation({ summary: 'Ejecutar una regla CQL contra un paciente FHIR' })
  testRule(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('id') id: string,
    @Body() dto: TestRuleDto,
  ) {
    const session = this.session(request, response);
    return this.ui.testRule(id, dto.patientId, session.sandboxId);
  }

  @Post('rules/:id/publish')
  @ApiOperation({ summary: 'Publicar y activar regla para el aula' })
  publishRule(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('id') id: string,
  ) {
    const session = this.session(request, response);
    assertTeacher(session.role);
    return this.ui.publishRule(id, session.sandboxId);
  }

  @Patch('rules/:id/activation')
  @ApiOperation({ summary: 'Activar o desactivar una regla publicada' })
  setRuleActivation(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Param('id') id: string,
    @Body() dto: RuleActivationDto,
  ) {
    const session = this.session(request, response);
    assertTeacher(session.role);
    return this.ui.setRuleActivation(id, session.sandboxId, dto.enabled);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Listar ejecuciones CDS guardadas en HAPI' })
  listActivity(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Query() query: Record<string, string | undefined>,
  ) {
    const session = this.session(request, response);
    return this.ui.listActivity(session.sandboxId, query);
  }

  private session(request: Request, response: Response): SessionContext {
    return this.sessions.resolve(request, response);
  }
}

function assertTeacher(role: Role | undefined): void {
  if (role !== 'teacher') {
    throw new ForbiddenException('Solo el rol docente puede publicar o activar reglas.');
  }
}
