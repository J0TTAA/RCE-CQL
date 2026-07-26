import { Module } from '@nestjs/common';
import { DependencyHttpClient } from '../../common/dependencies/dependency-http.client';
import { FhirGatewayPort } from './application/fhir-gateway.port';
import { HapiFhirHttpAdapter } from './infrastructure/hapi-fhir-http.adapter';

@Module({
  providers: [
    DependencyHttpClient,
    HapiFhirHttpAdapter,
    {
      provide: FhirGatewayPort,
      useExisting: HapiFhirHttpAdapter,
    },
  ],
  exports: [FhirGatewayPort],
})
export class FhirModule {}
