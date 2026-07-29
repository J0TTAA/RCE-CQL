import { IsIn, IsOptional, IsString } from 'class-validator';
import type { Role } from '../application/classroom-session.service';

const roles: Role[] = ['student', 'teacher'];

export class SessionRoleDto {
  @IsIn(roles)
  role!: Role;

  @IsOptional()
  @IsString()
  teacherPasscode?: string;
}

export class SessionResetDto {
  @IsOptional()
  @IsIn(roles)
  role?: Role;

  @IsOptional()
  @IsString()
  teacherPasscode?: string;
}
