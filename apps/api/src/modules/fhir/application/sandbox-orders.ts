import { BadRequestException } from '@nestjs/common';
import type { FhirResource } from './fhir-gateway.port';

export const ORDER_SYSTEM = 'https://rce-cql.local/fhir/CodeSystem/sandbox-orders';
export const ORDER_PAYLOAD = 'https://rce-cql.local/fhir/StructureDefinition/order-review';
export const ORDER_SANDBOX_TAG = 'https://rce-cql.local/fhir/tags/sandbox';

export interface OrderInput {
  id: string;
  catalogId: string;
  dose?: number;
  frequency?: number;
  durationDays?: number;
  priority: 'routine' | 'urgent';
}

export interface OrderCatalogItem {
  id: string;
  label: string;
  kind: 'medication' | 'laboratory' | 'procedure';
  resourceType: 'MedicationRequest' | 'ServiceRequest';
  system: string;
  code: string;
  unit?: string;
  route?: string;
  routeCode?: string;
}

const RXNORM = 'http://www.nlm.nih.gov/research/umls/rxnorm';
const SNOMED = 'http://snomed.info/sct';
export const ORDER_CATALOG: readonly OrderCatalogItem[] = [
  {
    id: 'metformin',
    label: 'Metformina 500 mg (comprimido)',
    kind: 'medication',
    resourceType: 'MedicationRequest',
    system: RXNORM,
    code: '860975',
    unit: 'mg',
    route: 'Oral',
    routeCode: '26643006',
  },
  {
    id: 'amoxicillin',
    label: 'Amoxicilina 500 mg (capsula)',
    kind: 'medication',
    resourceType: 'MedicationRequest',
    system: RXNORM,
    code: '308182',
    unit: 'mg',
    route: 'Oral',
    routeCode: '26643006',
  },
  {
    id: 'lisinopril',
    label: 'Lisinopril 10 mg (comprimido)',
    kind: 'medication',
    resourceType: 'MedicationRequest',
    system: RXNORM,
    code: '314076',
    unit: 'mg',
    route: 'Oral',
    routeCode: '26643006',
  },
  {
    id: 'atorvastatin',
    label: 'Atorvastatina 20 mg (comprimido)',
    kind: 'medication',
    resourceType: 'MedicationRequest',
    system: RXNORM,
    code: '617314',
    unit: 'mg',
    route: 'Oral',
    routeCode: '26643006',
  },
  {
    id: 'hba1c',
    label: 'Hemoglobina glicosilada (HbA1c)',
    kind: 'laboratory',
    resourceType: 'ServiceRequest',
    system: 'http://loinc.org',
    code: '4548-4',
  },
  {
    id: 'creatinine',
    label: 'Creatinina',
    kind: 'laboratory',
    resourceType: 'ServiceRequest',
    system: 'http://loinc.org',
    code: '2160-0',
  },
  {
    id: 'lipidPanel',
    label: 'Perfil lipidico',
    kind: 'laboratory',
    resourceType: 'ServiceRequest',
    system: 'http://loinc.org',
    code: '57698-3',
  },
  {
    id: 'chestXray',
    label: 'Radiografia de torax',
    kind: 'procedure',
    resourceType: 'ServiceRequest',
    system: SNOMED,
    code: '168731009',
  },
  {
    id: 'colonoscopy',
    label: 'Colonoscopia',
    kind: 'procedure',
    resourceType: 'ServiceRequest',
    system: SNOMED,
    code: '73761001',
  },
];

export function buildDraftOrders(
  patientId: string,
  orders: OrderInput[],
  complete: boolean,
): FhirResource[] {
  if (!/^[A-Za-z0-9.-]{1,64}$/.test(patientId)) {
    throw new BadRequestException('Paciente invalido.');
  }
  if (!Array.isArray(orders) || orders.length < 1 || orders.length > 20) {
    throw new BadRequestException('Selecciona entre 1 y 20 ordenes.');
  }
  const ids = new Set<string>();
  return orders.map((order) => {
    if (!/^[a-f0-9-]{36}$/.test(order.id) || ids.has(order.id)) {
      throw new BadRequestException('Las ordenes deben tener identificadores unicos.');
    }
    ids.add(order.id);
    const item = ORDER_CATALOG.find((candidate) => candidate.id === order.catalogId);
    if (!item || !['routine', 'urgent'].includes(order.priority)) {
      throw new BadRequestException('Selecciona una orden y prioridad del catalogo.');
    }
    const medication = item.kind === 'medication';
    for (const [key, maximum, integer] of [
      ['dose', 10000, false],
      ['frequency', 24, true],
      ['durationDays', 365, true],
    ] as const) {
      const value = order[key];
      if (
        value !== undefined &&
        (!medication ||
          !Number.isFinite(value) ||
          value <= 0 ||
          value > maximum ||
          (integer && !Number.isInteger(value)))
      ) {
        throw new BadRequestException('Revisa dosis, frecuencia y duracion de la orden.');
      }
      if (medication && complete && value === undefined) {
        throw new BadRequestException(
          'Completa dosis, frecuencia y duracion antes de revisar la receta.',
        );
      }
    }
    const concept = { coding: [{ system: item.system, code: item.code }], text: item.label };
    return {
      resourceType: item.resourceType,
      id: order.id,
      status: 'draft',
      intent: 'order',
      priority: order.priority,
      subject: { reference: `Patient/${patientId}` },
      authoredOn: new Date().toISOString(),
      ...(medication
        ? {
            medicationCodeableConcept: concept,
            dosageInstruction: [
              {
                route: { coding: [{ system: SNOMED, code: item.routeCode }], text: item.route },
                ...(order.dose && order.frequency && order.durationDays
                  ? {
                      text: `${order.dose} ${item.unit ?? 'mg'}, ${order.frequency} veces al dia durante ${order.durationDays} dias`,
                    }
                  : {}),
                ...(order.frequency
                  ? {
                      timing: {
                        repeat: { frequency: order.frequency, period: 1, periodUnit: 'd' },
                      },
                    }
                  : {}),
                ...(order.dose
                  ? {
                      doseAndRate: [
                        {
                          doseQuantity: {
                            value: order.dose,
                            unit: item.unit,
                            system: 'http://unitsofmeasure.org',
                            code: item.unit,
                          },
                        },
                      ],
                    }
                  : {}),
              },
            ],
            ...(order.durationDays
              ? {
                  dispenseRequest: {
                    expectedSupplyDuration: {
                      value: order.durationDays,
                      unit: 'dias',
                      system: 'http://unitsofmeasure.org',
                      code: 'd',
                    },
                  },
                }
              : {}),
          }
        : { code: concept }),
    };
  });
}

export interface OrderReview {
  patientId: string;
  sandboxId: string;
  expiresAt: string;
  resources: FhirResource[];
  decision: string;
}

export function reviewResource(id: string, review: OrderReview, signed = false): FhirResource {
  return {
    resourceType: 'Basic',
    id,
    meta: { tag: [{ system: ORDER_SANDBOX_TAG, code: review.sandboxId }] },
    code: { coding: [{ system: ORDER_SYSTEM, code: signed ? 'signed' : 'review' }] },
    subject: { reference: `Patient/${review.patientId}` },
    extension: [{ url: ORDER_PAYLOAD, valueString: JSON.stringify(review) }],
  };
}

export function readOrderReview(
  resource: FhirResource | null,
  patientId: string,
  sandboxId: string,
): OrderReview | null {
  if (
    !resource ||
    !resource.meta?.tag?.some((tag) => tag.system === ORDER_SANDBOX_TAG && tag.code === sandboxId)
  )
    return null;
  const extension = Array.isArray(resource.extension)
    ? (resource.extension as Array<{ url: string; valueString?: string }>)
    : [];
  const text = extension.find((item) => item.url === ORDER_PAYLOAD)?.valueString;
  if (!text) return null;
  try {
    const review = JSON.parse(text) as OrderReview;
    return review.patientId === patientId &&
      review.sandboxId === sandboxId &&
      Array.isArray(review.resources)
      ? review
      : null;
  } catch {
    return null;
  }
}

export function isSignedOrderReview(resource: FhirResource): boolean {
  const code = resource.code as { coding?: Array<{ system?: string; code?: string }> } | undefined;
  return (
    code?.coding?.some((item) => item.system === ORDER_SYSTEM && item.code === 'signed') ?? false
  );
}
