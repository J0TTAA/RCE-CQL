import { IsArray, IsIn, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';
import type { RuleHook } from '../../ui/application/ui.service';

const hooks: RuleHook[] = ['patient-view', 'order-select', 'order-sign'];

export class CdsHookRequestDto {
  @IsIn(hooks)
  hook!: RuleHook;

  @IsUUID()
  hookInstance!: string;

  @IsOptional()
  @IsString()
  fhirServer?: string;

  @IsOptional()
  @IsObject()
  fhirAuthorization?: Record<string, unknown>;

  @IsObject()
  context!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  prefetch?: Record<string, unknown>;
}

export class CdsFeedbackRequestDto {
  @IsArray()
  feedback!: unknown[];
}
