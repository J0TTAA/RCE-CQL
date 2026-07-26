import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/errors/api-exception.filter';
import { correlationIdMiddleware } from './common/http/correlation-id.middleware';
import { JsonLoggerService } from './common/logging/json-logger.service';
import type { EnvironmentVariables } from './config/environment';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });
  const config = app.get(ConfigService<EnvironmentVariables, true>);
  const logger = app.get(JsonLoggerService);

  app.useLogger(logger);
  app.use(helmet());
  app.use(json({ limit: '256kb' }));
  app.use(correlationIdMiddleware);
  app.enableCors({
    origin: config
      .get('CORS_ORIGINS', { infer: true })
      .split(',')
      .map((origin) => origin.trim()),
    credentials: false,
  });
  app.setGlobalPrefix(config.get('API_PREFIX', { infer: true }));
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter(logger));

  const openApiConfig = new DocumentBuilder()
    .setTitle('RCE CQL API')
    .setDescription('API educativa para autoria CQL, FHIR R4 y CDS Hooks')
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'docs/openapi.json' });

  const port = config.get('PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
  logger.log({ event: 'application_started', port }, 'Bootstrap');
}

void bootstrap();
