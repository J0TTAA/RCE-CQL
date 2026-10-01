import 'reflect-metadata';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const requireFromApi = createRequire(resolve('apps/api/package.json'));
const requireFromDist = createRequire(resolve('apps/api/dist/main.js'));
const { Module, ValidationPipe } = requireFromApi('@nestjs/common');
const { NestFactory } = requireFromApi('@nestjs/core');
const { CqlTranslatorPort } = requireFromDist('./modules/cql/application/cql-translator.port.js');
const { FhirGatewayPort } = requireFromDist('./modules/fhir/application/fhir-gateway.port.js');
const { ClassroomSessionService } = requireFromDist(
  './modules/classroom-session/application/classroom-session.service.js',
);
const { ClassroomSessionController } = requireFromDist(
  './modules/classroom-session/presentation/classroom-session.controller.js',
);
const { CdsHooksService } = requireFromDist('./modules/cds-hooks/application/cds-hooks.service.js');
const { OrderWorkflowService } = requireFromDist(
  './modules/cds-hooks/application/order-workflow.service.js',
);
const { CdsHooksController } = requireFromDist(
  './modules/cds-hooks/presentation/cds-hooks.controller.js',
);
const { OrderWorkflowController } = requireFromDist(
  './modules/cds-hooks/presentation/order-workflow.controller.js',
);
const { HealthService } = requireFromDist('./modules/health/health.service.js');
const { HealthController } = requireFromDist('./modules/health/health.controller.js');
const { UiService } = requireFromDist('./modules/ui/application/ui.service.js');
const { UiController } = requireFromDist('./modules/ui/presentation/ui.controller.js');

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: '19000' },
    translator: { type: 'string', default: 'http://localhost:8081' },
  },
});
const port = Number(values.port);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error('--port debe estar entre 1024 y 65535.');
}
const translatorBase = values.translator.replace(/\/$/, '');

class MemoryFhirGateway {
  resources = new Map();

  constructor() {
    this.store({
      resourceType: 'Patient',
      id: 'complex-patient',
      active: true,
      name: [{ given: ['Paciente'], family: 'Hook' }],
      gender: 'unknown',
      birthDate: '1980-01-01',
    });
  }

  key(type, id) {
    return type + '/' + id;
  }

  store(resource) {
    this.resources.set(this.key(resource.resourceType, resource.id), structuredClone(resource));
    return structuredClone(resource);
  }

  async checkHealth() {
    return {
      name: 'hapi-fhir',
      status: 'up',
      latencyMs: 0,
      details: {
        fhirVersion: '4.0.1',
        softwareVersion: 'memory-smoke',
        libraryAvailable: true,
        basicAvailable: true,
      },
    };
  }

  async search(resourceType) {
    const resources = [...this.resources.values()].filter(
      (resource) => resource.resourceType === resourceType,
    );
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total: resources.length,
      entry: resources.map((resource) => ({ resource: structuredClone(resource) })),
    };
  }

  async read(resourceType, id) {
    const resource = this.resources.get(this.key(resourceType, id));
    return resource ? structuredClone(resource) : null;
  }

  async create(resource) {
    const id = resource.id || 'generated-' + crypto.randomUUID();
    return this.store({ ...resource, id });
  }

  async update(resourceType, id, resource) {
    return this.store({ ...resource, resourceType, id });
  }

  async patientEverything(patientId) {
    const patientReference = 'Patient/' + patientId;
    const resources = [...this.resources.values()].filter((resource) => {
      if (resource.resourceType === 'Patient') return resource.id === patientId;
      if (['Library', 'Basic'].includes(resource.resourceType)) return false;
      return (
        resource.subject?.reference === patientReference ||
        resource.patient?.reference === patientReference
      );
    });
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total: resources.length,
      entry: resources.map((resource) => ({ resource: structuredClone(resource) })),
    };
  }
}

class RealTranslator {
  async translate(command) {
    const parameters = new URLSearchParams({
      annotations: String(command.options.annotations),
      locators: String(command.options.locators),
      'result-types': String(command.options.resultTypes),
      'detailed-errors': String(command.options.detailedErrors),
      strict: String(command.options.strict),
    });
    const response = await fetch(translatorBase + '/cql/translator?' + parameters, {
      method: 'POST',
      signal: AbortSignal.timeout(60000),
      headers: { accept: 'application/elm+json', 'content-type': 'application/cql' },
      body: command.cql,
    });
    const text = await response.text();
    if (!response.ok) throw new Error('Traductor HTTP ' + response.status + ': ' + text);
    return { elm: JSON.parse(text) };
  }

  async checkHealth() {
    return {
      name: 'cql-translator',
      status: 'up',
      latencyMs: 0,
      details: { mode: 'real-http' },
    };
  }
}

const session = {
  resolve(request, response) {
    const stored = /(?:^|; )rce-smoke-session=([^;]+)/.exec(request.headers.cookie ?? '')?.[1];
    const sandboxId = stored ?? 'sandbox-' + crypto.randomUUID();
    if (!stored) {
      response.cookie('rce-smoke-session', sandboxId, {
        httpOnly: true,
        sameSite: 'lax',
      });
    }
    return { sandboxId, role: 'student', displayCode: 'S-HOOK' };
  },
};
const gateway = new MemoryFhirGateway();
const translator = new RealTranslator();

class SmokeModule {}
Module({
  controllers: [
    HealthController,
    ClassroomSessionController,
    UiController,
    CdsHooksController,
    OrderWorkflowController,
  ],
  providers: [
    HealthService,
    UiService,
    CdsHooksService,
    OrderWorkflowService,
    { provide: FhirGatewayPort, useValue: gateway },
    { provide: CqlTranslatorPort, useValue: translator },
    { provide: ClassroomSessionService, useValue: session },
  ],
})(SmokeModule);

const app = await NestFactory.create(SmokeModule, { logger: false });
app.setGlobalPrefix('api/v1');
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
await app.listen(port, '127.0.0.1');
console.log('HOOK_TEST_SERVER_READY=http://127.0.0.1:' + port + '/api/v1');

async function shutdown() {
  await app.close();
  process.exit(0);
}
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
