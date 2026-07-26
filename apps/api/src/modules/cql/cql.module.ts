import { Module } from '@nestjs/common';
import { DependencyHttpClient } from '../../common/dependencies/dependency-http.client';
import { CqlTranslatorPort } from './application/cql-translator.port';
import { CqlTranslationHttpAdapter } from './infrastructure/cql-translation-http.adapter';
import { CqlController } from './presentation/cql.controller';

@Module({
  controllers: [CqlController],
  providers: [
    DependencyHttpClient,
    CqlTranslationHttpAdapter,
    {
      provide: CqlTranslatorPort,
      useExisting: CqlTranslationHttpAdapter,
    },
  ],
  exports: [CqlTranslatorPort],
})
export class CqlModule {}
