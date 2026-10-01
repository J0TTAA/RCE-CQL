import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  UiService,
  type CdsCard,
  type RuleHook,
  type Severity,
} from '../../ui/application/ui.service';
import type { FhirResource } from '../../fhir/application/fhir-gateway.port';
import type { CdsFeedbackRequestDto, CdsHookRequestDto } from '../presentation/cds-hooks.dto';
import { orderContext } from './order-context';

export interface CdsServiceDefinition {
  hook: RuleHook;
  title: string;
  description: string;
  id: string;
  prefetch: Record<string, string>;
  usageRequirements?: string;
}

export interface CdsDiscoveryResponse {
  services: CdsServiceDefinition[];
}

export interface CdsHooksCard {
  uuid: string;
  summary: string;
  detail?: string;
  indicator: Severity;
  source: {
    label: string;
  };
}

export interface CdsHooksResponse {
  cards: CdsHooksCard[];
}

export interface CdsFeedbackResponse {
  accepted: true;
  feedbackCount: number;
}

const SERVICE_DEFINITIONS: CdsServiceDefinition[] = [
  {
    hook: 'patient-view',
    title: 'RCE CQL patient-view',
    description: 'Evalua reglas CQL publicadas para el paciente abierto en el RCE educativo.',
    id: 'rce-patient-view',
    prefetch: {
      patient: 'Patient/{{context.patientId}}',
    },
  },
  {
    hook: 'order-select',
    title: 'RCE CQL order-select',
    description: 'Evalua reglas CQL publicadas cuando un usuario selecciona ordenes clinicas.',
    id: 'rce-order-select',
    prefetch: {
      patient: 'Patient/{{context.patientId}}',
    },
    usageRequirements:
      'FHIR R4: MedicationRequest y ServiceRequest. Requiere draftOrders y selections. Usa el HAPI configurado y el sandbox de la sesion.',
  },
  {
    hook: 'order-sign',
    title: 'RCE CQL order-sign',
    description: 'Evalua reglas CQL publicadas antes de firmar ordenes clinicas.',
    id: 'rce-order-sign',
    prefetch: {
      patient: 'Patient/{{context.patientId}}',
    },
    usageRequirements:
      'FHIR R4: MedicationRequest y ServiceRequest. Requiere draftOrders. Evaluar no firma ni persiste las ordenes.',
  },
];

@Injectable()
export class CdsHooksService {
  constructor(private readonly ui: UiService) {}

  discovery(): CdsDiscoveryResponse {
    return {
      services: SERVICE_DEFINITIONS.map((service) => ({
        ...service,
        prefetch: { ...service.prefetch },
      })),
    };
  }

  async invoke(
    serviceId: string,
    sandboxId: string,
    request: CdsHookRequestDto,
  ): Promise<CdsHooksResponse> {
    const evaluation = await this.evaluate(serviceId, sandboxId, request);
    return { cards: evaluation.cards.map(toCdsHooksCard) };
  }

  async evaluate(serviceId: string, sandboxId: string, request: CdsHookRequestDto) {
    const service = this.serviceFor(serviceId);
    if (request.hook !== service.hook) {
      throw new BadRequestException(
        `El hook "${request.hook}" no corresponde al servicio "${service.id}".`,
      );
    }
    if (request.fhirAuthorization && !request.fhirServer) {
      throw new BadRequestException('fhirServer es requerido cuando se envia fhirAuthorization.');
    }

    const patientId = patientIdFromContext(request.context);
    if (
      typeof request.context.userId !== 'string' ||
      !/^(Practitioner|PractitionerRole)\/[A-Za-z0-9.-]{1,64}$/.test(request.context.userId)
    ) {
      throw new BadRequestException(
        'context.userId debe identificar un Practitioner o PractitionerRole.',
      );
    }
    const orders =
      service.hook === 'patient-view'
        ? undefined
        : orderContext(request.context, service.hook, patientId);
    const prefetch = fhirResourcesFromPrefetch(request.prefetch);
    for (const resource of prefetch) {
      const subject = resource.subject as { reference?: string } | undefined;
      const patient = resource.patient as { reference?: string } | undefined;
      if (
        (resource.resourceType === 'Patient' && resource.id !== patientId) ||
        (subject?.reference && subject.reference !== `Patient/${patientId}`) ||
        (patient?.reference && patient.reference !== `Patient/${patientId}`)
      ) {
        throw new BadRequestException('El prefetch contiene recursos de otro paciente.');
      }
    }
    return this.ui.evaluateHook({
      patientId,
      sandboxId,
      hook: service.hook,
      persistActivity: true,
      correlationId: request.hookInstance,
      additionalResources: prefetch,
      contextResources: orders?.resources,
      parameters: orders?.parameters,
    });
  }

  acceptFeedback(serviceId: string, request: CdsFeedbackRequestDto): CdsFeedbackResponse {
    this.serviceFor(serviceId);
    return { accepted: true, feedbackCount: request.feedback.length };
  }

  private serviceFor(serviceId: string): CdsServiceDefinition {
    const service = SERVICE_DEFINITIONS.find((candidate) => candidate.id === serviceId);
    if (!service) {
      throw new NotFoundException('CDS Service no encontrado.');
    }
    return service;
  }
}

function patientIdFromContext(context: Record<string, unknown>): string {
  const patientId = context.patientId;
  if (typeof patientId !== 'string' || !/^[A-Za-z0-9.-]{1,64}$/.test(patientId)) {
    throw new BadRequestException('context.patientId es requerido para este CDS Hook.');
  }
  return patientId.trim();
}

function toCdsHooksCard(card: CdsCard): CdsHooksCard {
  return {
    uuid: card.id,
    summary: card.summary,
    detail: card.detail,
    indicator: card.severity,
    source: { label: card.source },
  };
}

function fhirResourcesFromPrefetch(prefetch: Record<string, unknown> | undefined): FhirResource[] {
  if (!prefetch) {
    return [];
  }
  const resources: FhirResource[] = [];
  for (const value of Object.values(prefetch)) {
    collectFhirResources(value, resources);
  }
  return resources;
}

function collectFhirResources(value: unknown, resources: FhirResource[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectFhirResources(item, resources);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  if (value.resourceType === 'Bundle') {
    const entries = Array.isArray(value.entry) ? value.entry : [];
    for (const entry of entries) {
      if (isRecord(entry)) {
        collectFhirResources(entry.resource, resources);
      }
    }
    return;
  }
  if (typeof value.resourceType === 'string') {
    resources.push(value);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
