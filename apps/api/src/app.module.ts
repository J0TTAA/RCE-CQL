import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { validateEnvironment } from './config/environment';
import { JsonLoggerService } from './common/logging/json-logger.service';
import { RequestLoggingInterceptor } from './common/http/request-logging.interceptor';
import { CqlModule } from './modules/cql/cql.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    CqlModule,
    HealthModule,
  ],
  providers: [
    JsonLoggerService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
  ],
  exports: [JsonLoggerService],
})
export class AppModule {}
