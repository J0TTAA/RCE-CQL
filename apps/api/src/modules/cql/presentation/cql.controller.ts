import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CqlTranslatorPort } from '../application/cql-translator.port';
import { TranslateCqlDto } from './translate-cql.dto';

@ApiTags('CQL')
@Controller('cql')
export class CqlController {
  constructor(private readonly translator: CqlTranslatorPort) {}

  @Post('translate')
  @HttpCode(200)
  @ApiOperation({ summary: 'Validar CQL y traducirlo a ELM JSON' })
  @ApiOkResponse({ description: 'ELM generado por CQL Translation Service' })
  translate(@Body() dto: TranslateCqlDto): Promise<{ elm: unknown }> {
    return this.translator.translate({
      cql: dto.cql,
      options: {
        annotations: dto.annotations,
        locators: dto.locators,
        resultTypes: dto.resultTypes,
        detailedErrors: dto.detailedErrors,
        strict: dto.strict,
      },
    });
  }
}
