import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
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
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  birthDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(40)
  @Max(260)
  systolicBloodPressure?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(30)
  @Max(160)
  diastolicBloodPressure?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(3)
  @Max(18)
  hba1c?: number;
}

export class RuleActivationDto {
  @IsBoolean()
  enabled!: boolean;
}
