import { IsIn, IsOptional } from 'class-validator';
import type { Role } from '../application/classroom-session.service';

const roles: Role[] = ['student', 'teacher'];

export class SessionRoleDto {
  @IsIn(roles)
  role!: Role;
}

export class SessionResetDto {
  @IsOptional()
  @IsIn(roles)
  role?: Role;
}
