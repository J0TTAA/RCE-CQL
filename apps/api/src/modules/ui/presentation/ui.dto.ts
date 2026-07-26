import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';
import type { RuleHook, Severity } from '../application/ui.service';

const hooks: RuleHook[] = ['patient-view', 'order-select', 'order-sign'];
const severities: Severity[] = ['info', 'warning', 'critical'];

export class RuleMetadataDto {
  @IsString()
  title!: string;

  @Matches(/^[A-Za-z][A-Za-z0-9_]*$/)
  name!: string;

  @Matches(/^[0-9]+(\.[0-9]+){0,2}(-[A-Za-z0-9.-]+)?$/)
  version!: string;

  @IsIn(hooks)
  hook!: RuleHook;

  @IsString()
  expression!: string;

  @IsString()
  summary!: string;

  @IsString()
  detail!: string;

  @IsIn(severities)
  indicator!: Severity;
}

export class CreateRuleDto {
  @ValidateNested()
  @Type(() => RuleMetadataDto)
  metadata!: RuleMetadataDto;

  @IsString()
  cql!: string;
}

export class SaveRuleDto extends CreateRuleDto {}

export class ValidateRuleDto {
  @IsString()
  cql!: string;
}

export class TestRuleDto {
  @IsString()
  patientId!: string;
}

export class UpdatePatientDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  birthDate!: string;
}

export class CreateSessionDto {
  @IsOptional()
  @IsIn(['student', 'teacher'])
  role?: 'student' | 'teacher';
}

export class RuleActivationDto {
  @IsBoolean()
  enabled!: boolean;
}
