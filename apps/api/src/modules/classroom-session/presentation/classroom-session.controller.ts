import { Body, Controller, Get, Patch, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ClassroomSessionService } from '../application/classroom-session.service';
import { SessionResetDto, SessionRoleDto } from './classroom-session.dto';

@ApiTags('RCE UI')
@Controller('ui/session')
export class ClassroomSessionController {
  constructor(private readonly sessions: ClassroomSessionService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener o crear la sesion anonima del navegador' })
  getSession(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.sessions.resolve(request, response);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una sesion anonima nueva para el navegador' })
  createSession(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: SessionResetDto,
  ) {
    return this.sessions.reset(request, response, dto.role);
  }

  @Patch('role')
  @ApiOperation({ summary: 'Cambiar el rol efectivo de la sesion anonima' })
  setRole(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: SessionRoleDto,
  ) {
    return this.sessions.setRole(request, response, dto.role);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Reiniciar solo el sandbox del navegador actual' })
  resetSandbox(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body() dto: SessionResetDto,
  ) {
    return this.sessions.reset(request, response, dto.role);
  }
}
