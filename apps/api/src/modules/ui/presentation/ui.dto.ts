import { Type } from 'class-transformer';
import {
  IsArray,
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
import type {
  DemoEncounterType,
  EditableClinicalResourceType,
  PatientGender,
  RuleHook,
  Severity,
} from '../application/ui.service';

const hooks: RuleHook[] = ['patient-view', 'order-select', 'order-sign'];
const severities: Severity[] = ['info', 'warning', 'critical'];
const patientGenders: PatientGender[] = ['male', 'female', 'other', 'unknown'];
const encounterTypes: DemoEncounterType[] = ['none', 'ambulatory', 'emergency', 'inpatient'];
const clinicalResourceTypes: EditableClinicalResourceType[] = [
  'condition',
  'observation',
  'medication',
  'allergy',
  'encounter',
  'procedure',
  'immunization',
  'serviceRequest',
];

export class RuleMetadataDto {
  @IsString()
  title!: string;

  @Matches(/^[A-Za-z][A-Za-z0-9_]*$/)
  name!: string;

  @IsOptional()
  @Matches(/^[0-9]+(\.[0-9]+){0,2}(-[A-Za-z0-9.-]+)?$/)
  version?: string;

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

export class ClinicalResourceDto {
  @Matches(/^[A-Za-z0-9_-]{1,48}$/)
  id!: string;

  @IsIn(clinicalResourceTypes)
  type!: EditableClinicalResourceType;

  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(-1000)
  @Max(10000)
  value?: number;
}

export class UpdatePatientDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  birthDate?: string;

  @IsOptional()
  @IsIn(patientGenders)
  gender?: PatientGender;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  @Max(400)
  systolicBloodPressure?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  @Max(250)
  diastolicBloodPressure?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(30)
  hba1c?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  @Max(1000)
  fastingGlucose?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(0)
  @Max(1000)
  ldlCholesterol?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(1000)
  bodyMassIndex?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(500)
  bodyWeight?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(300)
  bodyHeight?: number;

  @IsOptional()
  @IsBoolean()
  diabetesCondition?: boolean;

  @IsOptional()
  @IsBoolean()
  metforminMedication?: boolean;

  @IsOptional()
  @IsIn(encounterTypes)
  encounterType?: DemoEncounterType;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClinicalResourceDto)
  clinicalResources?: ClinicalResourceDto[];
}

export class RuleActivationDto {
  @IsBoolean()
  enabled!: boolean;
}
