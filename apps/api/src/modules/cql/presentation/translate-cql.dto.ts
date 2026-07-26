import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class TranslateCqlDto {
  @ApiProperty({
    description: 'Fuente CQL completa',
    example:
      "library Example version '1.0.0'\nusing FHIR version '4.0.1'\ncontext Patient\ndefine Ready: true",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200_000)
  cql!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  annotations = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  locators = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  resultTypes = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  detailedErrors = true;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  strict = true;
}
