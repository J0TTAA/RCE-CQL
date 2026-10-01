import { BadRequestException } from '@nestjs/common';
import type { FhirResource } from '../../fhir/application/fhir-gateway.port';

export function orderContext(
  context: Record<string, unknown>,
  hook: 'order-select' | 'order-sign',
  patientId: string,
) {
  const bundle = context.draftOrders;
  if (
    !isRecord(bundle) ||
    bundle.resourceType !== 'Bundle' ||
    !Array.isArray(bundle.entry) ||
    bundle.entry.length < 1 ||
    bundle.entry.length > 20
  ) {
    throw new BadRequestException('context.draftOrders debe contener un Bundle de 1 a 20 ordenes.');
  }
  const references = new Set<string>();
  const resources: FhirResource[] = bundle.entry.map((entry: unknown) => {
    const resource = isRecord(entry) ? entry.resource : undefined;
    if (
      !isRecord(resource) ||
      !['MedicationRequest', 'ServiceRequest'].includes(String(resource.resourceType)) ||
      typeof resource.id !== 'string' ||
      !/^[A-Za-z0-9.-]{1,64}$/.test(resource.id)
    ) {
      throw new BadRequestException(
        'Solo se admiten MedicationRequest y ServiceRequest R4 con id valido.',
      );
    }
    const subject = resource.subject;
    const key = `${String(resource.resourceType)}/${resource.id}`;
    if (!isRecord(subject) || subject.reference !== `Patient/${patientId}` || references.has(key)) {
      throw new BadRequestException(
        'Cada orden debe pertenecer al paciente del hook y tener una identidad unica.',
      );
    }
    const allowedStatus = hook === 'order-select' ? ['draft'] : ['draft', 'active'];
    if (!allowedStatus.includes(String(resource.status)) || resource.intent !== 'order') {
      throw new BadRequestException(
        'La orden debe tener intent=order y estado compatible con el hook.',
      );
    }
    const concept =
      resource.resourceType === 'MedicationRequest'
        ? resource.medicationCodeableConcept
        : resource.code;
    if (
      !isRecord(concept) ||
      !Array.isArray(concept.coding) ||
      !concept.coding.some(
        (coding: unknown) =>
          isRecord(coding) &&
          typeof coding.system === 'string' &&
          typeof coding.code === 'string' &&
          coding.code,
      )
    ) {
      throw new BadRequestException(
        'La orden debe incluir un concepto codificado (system y code).',
      );
    }
    references.add(key);
    return resource;
  });
  let selections: string[] = [];
  if (hook === 'order-select') {
    if (
      !Array.isArray(context.selections) ||
      !context.selections.length ||
      context.selections.some((key: unknown) => typeof key !== 'string' || !references.has(key))
    ) {
      throw new BadRequestException('context.selections debe referenciar ordenes de draftOrders.');
    }
    selections = [...new Set(context.selections as string[])];
  }
  return { resources, parameters: { DraftOrders: [...references], Selections: selections } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
