import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  buildDraftOrders,
  isSignedOrderReview,
  readOrderReview,
  type OrderInput,
} from '../../fhir/application/sandbox-orders';
import type { FhirGatewayPort, FhirResource } from '../../fhir/application/fhir-gateway.port';
import type {
  ActivityEntry,
  HookEvaluationInput,
  UiService,
} from '../../ui/application/ui.service';
import { CdsHooksService } from './cds-hooks.service';
import { OrderWorkflowService } from './order-workflow.service';
import { orderContext } from './order-context';
import { ConfirmOrdersDto, ReviewOrdersDto } from '../presentation/order-workflow.dto';

const orderId = 'd1577c69-dfbe-44ad-ba6d-3e05e953b2ea';
const medication: OrderInput = {
  id: orderId,
  catalogId: 'amoxicillin',
  dose: 500,
  frequency: 3,
  durationDays: 5,
  priority: 'routine',
};
const contextFor = (resources = buildDraftOrders('patient-1', [medication], true)) => ({
  patientId: 'patient-1',
  userId: 'Practitioner/demo',
  selections: [`MedicationRequest/${orderId}`],
  draftOrders: {
    resourceType: 'Bundle',
    type: 'collection',
    entry: resources.map((resource) => ({ resource })),
  },
});

describe('FHIR order context', () => {
  it('provides selected references and pending resources to the existing CQL engine', async () => {
    let input: HookEvaluationInput | undefined;
    const cds = new CdsHooksService({
      evaluateHook: (value: HookEvaluationInput) => {
        input = value;
        return Promise.resolve({ cards: [], activity: activity() });
      },
    } as unknown as UiService);
    await cds.invoke('rce-order-select', 'sandbox-a', {
      hook: 'order-select',
      hookInstance: orderId,
      context: contextFor(),
    });
    assert.equal(input?.sandboxId, 'sandbox-a');
    assert.equal(input?.contextResources?.[0]?.status, 'draft');
    assert.deepEqual(input?.parameters, {
      DraftOrders: [`MedicationRequest/${orderId}`],
      Selections: [`MedicationRequest/${orderId}`],
    });
  });

  it('requires draftOrders and a real selection', () => {
    assert.throws(() => orderContext({}, 'order-select', 'patient-1'), BadRequestException);
    assert.throws(
      () =>
        orderContext(
          { ...contextFor(), selections: ['MedicationRequest/missing'] },
          'order-select',
          'patient-1',
        ),
      BadRequestException,
    );
    assert.throws(
      () => orderContext({ ...contextFor(), selections: [] }, 'order-select', 'patient-1'),
      BadRequestException,
    );
  });

  it('rejects wrong patient, unsupported types, duplicate ids and signed selections', () => {
    const [base] = buildDraftOrders('patient-1', [medication], true);
    for (const patch of [
      { subject: { reference: 'Patient/other' } },
      { resourceType: 'Observation' },
      { status: 'active' },
      { intent: 'proposal' },
    ]) {
      assert.throws(
        () => orderContext(contextFor([{ ...base, ...patch }]), 'order-select', 'patient-1'),
        BadRequestException,
      );
    }
    assert.throws(
      () => orderContext(contextFor([base!, base!]), 'order-select', 'patient-1'),
      BadRequestException,
    );
  });

  it('allows active orders during re-sign and does not demand selections for order-sign', () => {
    const [base] = buildDraftOrders('patient-1', [medication], true);
    const parsed = orderContext(
      { ...contextFor([{ ...base, status: 'active' }]), selections: undefined },
      'order-sign',
      'patient-1',
    );
    assert.deepEqual(parsed.parameters.Selections, []);
  });

  it('builds R4 dosage, UCUM units, duration and service requests without invented results', () => {
    const [resource] = buildDraftOrders('patient-1', [medication], true);
    const dosage = resource?.dosageInstruction as Array<{
      doseAndRate: Array<{ doseQuantity: { value: number; code: string } }>;
    }>;
    assert.deepEqual(dosage[0]?.doseAndRate[0]?.doseQuantity, {
      value: 500,
      unit: 'mg',
      system: 'http://unitsofmeasure.org',
      code: 'mg',
    });
    const [lab] = buildDraftOrders(
      'patient-1',
      [{ id: orderId, catalogId: 'hba1c', priority: 'routine' }],
      true,
    );
    assert.equal(lab?.resourceType, 'ServiceRequest');
    assert.equal(lab?.status, 'draft');
    assert.equal(lab?.valueQuantity, undefined);
  });

  it('accepts incomplete selection but rejects incomplete signing and invalid numbers', () => {
    const incomplete = { id: orderId, catalogId: 'amoxicillin', priority: 'routine' as const };
    assert.equal(buildDraftOrders('patient-1', [incomplete], false).length, 1);
    assert.throws(() => buildDraftOrders('patient-1', [incomplete], true), BadRequestException);
    for (const dose of [NaN, Infinity, -1, 0, 10001])
      assert.throws(
        () => buildDraftOrders('patient-1', [{ ...medication, dose }], true),
        BadRequestException,
      );
    assert.throws(
      () => buildDraftOrders('patient-1', [{ ...medication, frequency: 1.5 }], true),
      BadRequestException,
    );
    assert.throws(
      () => buildDraftOrders('patient-1', [{ ...medication, catalogId: 'unknown' }], true),
      BadRequestException,
    );
  });

  it('validates nested inputs without coercing strings and requires explicit confirmation', async () => {
    const bad = plainToInstance(ReviewOrdersDto, {
      hook: 'order-sign',
      orders: [{ ...medication, dose: 'abc' }],
    });
    assert.ok((await validate(bad)).length);
    assert.ok((await validate(plainToInstance(ConfirmOrdersDto, { confirmed: false }))).length);
    assert.equal(
      (await validate(plainToInstance(ConfirmOrdersDto, { confirmed: true }))).length,
      0,
    );
  });
});

describe('Sandbox order workflow', () => {
  it('does not save orders on selection; review is pending until explicitly confirmed', async () => {
    const fixture = workflow();
    const selected = await fixture.service.review('patient-1', 'sandbox-a', {
      hook: 'order-select',
      orders: [medication],
      selections: [orderId],
    });
    assert.equal(selected.reviewId, undefined);
    assert.equal(fixture.records.size, 0);
    const reviewed = await fixture.service.review('patient-1', 'sandbox-a', {
      hook: 'order-sign',
      orders: [medication],
    });
    const stored = fixture.records.get(reviewed.reviewId!)!;
    assert.equal(isSignedOrderReview(stored), false);
    assert.equal(readOrderReview(stored, 'patient-1', 'sandbox-a')?.resources[0]?.status, 'draft');
    await fixture.service.confirm('patient-1', 'sandbox-a', reviewed.reviewId!);
    assert.equal(isSignedOrderReview(fixture.records.get(reviewed.reviewId!)!), true);
    const writes = fixture.writes();
    await fixture.service.confirm('patient-1', 'sandbox-a', reviewed.reviewId!);
    assert.equal(fixture.writes(), writes);
    assert.equal(fixture.records.size, 1);
  });

  it('never lets another sandbox or patient confirm a review', async () => {
    const fixture = workflow();
    const reviewed = await fixture.service.review('patient-1', 'sandbox-a', {
      hook: 'order-sign',
      orders: [medication],
    });
    await assert.rejects(
      () => fixture.service.confirm('patient-1', 'sandbox-b', reviewed.reviewId!),
      NotFoundException,
    );
    await assert.rejects(
      () => fixture.service.confirm('patient-2', 'sandbox-a', reviewed.reviewId!),
      NotFoundException,
    );
  });

  it('requires a new review when a rule or result changes', async () => {
    const fixture = workflow();
    const reviewed = await fixture.service.review('patient-1', 'sandbox-a', {
      hook: 'order-sign',
      orders: [medication],
    });
    fixture.next.rules = ['ChangedRule 2.0.0'];
    await assert.rejects(
      () => fixture.service.confirm('patient-1', 'sandbox-a', reviewed.reviewId!),
      ConflictException,
    );
    assert.equal(isSignedOrderReview(fixture.records.get(reviewed.reviewId!)!), false);
  });

  it('does not enable confirmation when the engine reports an evaluation error', async () => {
    const fixture = workflow();
    fixture.next.warnings = ['No se pudo evaluar una regla'];
    const reviewed = await fixture.service.review('patient-1', 'sandbox-a', {
      hook: 'order-sign',
      orders: [medication],
    });
    assert.equal(reviewed.reviewId, undefined);
    assert.equal(fixture.records.size, 0);
  });
});

function activity(): ActivityEntry {
  return {
    id: 'activity',
    date: new Date().toISOString(),
    patientId: 'patient-1',
    patientName: 'Paciente sintetico',
    hook: 'order-sign',
    rules: [],
    cards: [],
    cardsCount: 0,
    durationMs: 0,
    result: 'no-aplica',
    correlationId: orderId,
    maxSeverity: 'none',
    consideredResources: [],
    warnings: [],
    scope: 'sandbox',
  };
}

function workflow() {
  const records = new Map<string, FhirResource>();
  let writes = 0;
  const fhir = {
    read: (_type: string, id: string) => Promise.resolve(structuredClone(records.get(id) ?? null)),
    update: (_type: string, id: string, resource: FhirResource) => {
      records.set(id, structuredClone(resource));
      writes++;
      return Promise.resolve(resource);
    },
  } as FhirGatewayPort;
  const next = activity();
  const cds = {
    evaluate: () => Promise.resolve({ cards: next.cards, activity: structuredClone(next) }),
  } as unknown as CdsHooksService;
  return { service: new OrderWorkflowService(fhir, cds), records, next, writes: () => writes };
}
