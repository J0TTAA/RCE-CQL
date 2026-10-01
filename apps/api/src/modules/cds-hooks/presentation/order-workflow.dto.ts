import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  Equals,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import type { OrderInput } from '../../fhir/application/sandbox-orders';

export class OrderInputDto implements OrderInput {
  @IsUUID() id!: string;
  @IsString() catalogId!: string;
  @IsIn(['routine', 'urgent']) priority!: 'routine' | 'urgent';
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(10000) dose?: number;
  @IsOptional() @IsInt() @Min(1) @Max(24) frequency?: number;
  @IsOptional() @IsInt() @Min(1) @Max(365) durationDays?: number;
}

export class ReviewOrdersDto {
  @IsIn(['order-select', 'order-sign']) hook!: 'order-select' | 'order-sign';
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => OrderInputDto)
  orders!: OrderInputDto[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsUUID(undefined, { each: true })
  selections?: string[];
}

export class ConfirmOrdersDto {
  @Equals(true, { message: 'Debes confirmar explicitamente las ordenes revisadas.' })
  confirmed!: true;
}
