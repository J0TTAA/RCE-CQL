import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UiService, type Role } from '../application/ui.service';
import {
  CreateRuleDto,
  CreateSessionDto,
  RuleActivationDto,
  SaveRuleDto,
  TestRuleDto,
  UpdatePatientDto,
  ValidateRuleDto,
} from './ui.dto';

@ApiTags('RCE UI')
@Controller('ui')
export class UiController {
  constructor(private readonly ui: UiService) {}

  @Post('session')
  @ApiOperation({ summary: 'Crear una sesion anonima de sandbox para el navegador' })
  createSession(@Body() dto: CreateSessionDto) {
    return this.ui.createSession(dto.role);
  }

  @Get('patients')
  @ApiOperation({ summary: 'Listar pacientes desde HAPI FHIR' })
  listPatients(
    @Headers('x-rce-sandbox-id') sandboxId: string | undefined,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.ui.listPatients(requiredSandbox(sandboxId), query);
  }

  @Get('patients/:id')
  @ApiOperation({ summary: 'Obtener ficha clinica FHIR del paciente' })
  getPatient(@Headers('x-rce-sandbox-id') sandboxId: string | undefined, @Param('id') id: string) {
    return this.ui.getPatient(id, requiredSandbox(sandboxId));
  }

  @Get('patients/:id/cards')
  @ApiOperation({ summary: 'Evaluar reglas activas y retornar cards CDS' })
  getPatientCards(
    @Headers('x-rce-sandbox-id') sandboxId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.ui.getPatientCards(id, requiredSandbox(sandboxId));
  }

  @Patch('patients/:id')
  @ApiOperation({ summary: 'Guardar cambios clinicos en el sandbox y reevaluar hooks' })
  updatePatient(
    @Headers('x-rce-sandbox-id') sandboxId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.ui.updatePatientBirthDate(id, requiredSandbox(sandboxId), dto.birthDate);
  }

  @Get('rules')
  @ApiOperation({ summary: 'Listar reglas CQL guardadas como FHIR Library' })
  listRules(
    @Headers('x-rce-sandbox-id') sandboxId: string | undefined,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.ui.listRules(requiredSandbox(sandboxId), query);
  }

  @Post('rules')
  @ApiOperation({ summary: 'Crear regla CQL draft en HAPI' })
  createRule(
    @Headers('x-rce-sandbox-id') sandboxId: string | undefined,
    @Body() dto: CreateRuleDto,
  ) {
    return this.ui.createRule(requiredSandbox(sandboxId), dto.metadata, dto.cql);
  }

  @Get('rules/:id')
  @ApiOperation({ summary: 'Obtener regla CQL desde HAPI' })
  getRule(@Headers('x-rce-sandbox-id') sandboxId: string | undefined, @Param('id') id: string) {
    return this.ui.getRule(id, requiredSandbox(sandboxId));
  }

  @Put('rules/:id')
  @ApiOperation({ summary: 'Guardar draft de regla CQL en HAPI' })
  saveRule(
    @Headers('x-rce-sandbox-id') sandboxId: string | undefined,
    @Param('id') id: string,
    @Body() dto: SaveRuleDto,
  ) {
    return this.ui.saveRule(id, requiredSandbox(sandboxId), dto.cql, dto.metadata);
  }

  @Post('rules/:id/validate')
  @ApiOperation({ summary: 'Traducir CQL a ELM y guardar ELM en Library' })
  validateRule(
    @Headers('x-rce-sandbox-id') sandboxId: string | undefined,
    @Param('id') id: string,
    @Body() dto: ValidateRuleDto,
  ) {
    return this.ui.validateRule(id, requiredSandbox(sandboxId), dto.cql);
  }

  @Post('rules/:id/test')
  @ApiOperation({ summary: 'Ejecutar una regla CQL contra un paciente FHIR' })
  testRule(
    @Headers('x-rce-sandbox-id') sandboxId: string | undefined,
    @Param('id') id: string,
    @Body() dto: TestRuleDto,
  ) {
    return this.ui.testRule(id, dto.patientId, requiredSandbox(sandboxId));
  }

  @Post('rules/:id/publish')
  @ApiOperation({ summary: 'Publicar y activar regla para el aula' })
  publishRule(
    @Headers('x-rce-sandbox-id') sandboxId: string | undefined,
    @Headers('x-rce-role') role: Role | undefined,
    @Param('id') id: string,
  ) {
    assertTeacher(role);
    return this.ui.publishRule(id, requiredSandbox(sandboxId));
  }

  @Patch('rules/:id/activation')
  @ApiOperation({ summary: 'Activar o desactivar una regla publicada' })
  setRuleActivation(
    @Headers('x-rce-sandbox-id') sandboxId: string | undefined,
    @Headers('x-rce-role') role: Role | undefined,
    @Param('id') id: string,
    @Body() dto: RuleActivationDto,
  ) {
    assertTeacher(role);
    return this.ui.setRuleActivation(id, requiredSandbox(sandboxId), dto.enabled);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Listar ejecuciones CDS guardadas en HAPI' })
  listActivity(
    @Headers('x-rce-sandbox-id') sandboxId: string | undefined,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.ui.listActivity(requiredSandbox(sandboxId), query);
  }
}

function requiredSandbox(value: string | undefined): string {
  return value?.trim() || 'sandbox-missing';
}

function assertTeacher(role: Role | undefined): void {
  if (role !== 'teacher') {
    throw new ForbiddenException('Solo el rol docente puede publicar o activar reglas.');
  }
}
