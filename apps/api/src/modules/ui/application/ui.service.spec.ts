import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { DependencyHealth } from '../../../common/dependencies/dependency-health';
import { CqlTranslatorPort } from '../../cql/application/cql-translator.port';
import {
  FhirGatewayPort,
  type FhirBundle,
  type FhirResource,
} from '../../fhir/application/fhir-gateway.port';
import { UiService } from './ui.service';
import { buildDraftOrders, reviewResource } from '../../fhir/application/sandbox-orders';

describe('UiService patient mapping', () => {
  it('maps sparse FHIR Patient resources without inventing clinical values', async () => {
    const patient: FhirResource = { resourceType: 'Patient', id: 'patient-sparse' };
    const service = new UiService(new SparseFhirGateway(patient), new NoopTranslator());

    const [summary] = await service.listPatients('sandbox-a', {});
    const detail = await service.getPatient('patient-sparse', 'sandbox-a');

    assert.equal(summary?.name, 'Paciente sin nombre');
    assert.equal(summary?.age, null);
    assert.equal(summary?.cohort, 'sin edad');
    assert.equal(summary?.sex, 'sin dato');
    assert.equal(detail.birthDate, null);
    assert.equal(detail.editableClinicalData.birthDate, null);
    assert.equal(detail.editableClinicalData.gender, 'unknown');
    assert.deepEqual(detail.conditions, []);
    assert.deepEqual(detail.observations, []);
    assert.deepEqual(detail.timeline, []);
    assert.deepEqual(detail.sandboxOrders, []);
  });
});

class SparseFhirGateway extends FhirGatewayPort {
  constructor(private readonly patient: FhirResource) {
    super();
  }

  checkHealth(): Promise<DependencyHealth> {
    return Promise.resolve({ name: 'hapi-fhir', status: 'up', latencyMs: 0, details: {} });
  }

  search(resourceType: string): Promise<FhirBundle> {
    if (resourceType === 'Patient') {
      return Promise.resolve({
        resourceType: 'Bundle',
        type: 'searchset',
        total: 1,
        entry: [{ resource: this.patient }],
      });
    }
    return Promise.resolve({ resourceType: 'Bundle', type: 'searchset', total: 0, entry: [] });
  }

  read(resourceType: string, id: string): Promise<FhirResource | null> {
    if (resourceType === 'Patient' && id === this.patient.id) {
      return Promise.resolve(this.patient);
    }
    return Promise.resolve(null);
  }

  create(resource: FhirResource): Promise<FhirResource> {
    return Promise.resolve(resource);
  }

  update(_resourceType: string, _id: string, resource: FhirResource): Promise<FhirResource> {
    return Promise.resolve(resource);
  }

  patientEverything(patientId: string): Promise<FhirBundle> {
    const resource = patientId === this.patient.id ? this.patient : undefined;
    return Promise.resolve({
      resourceType: 'Bundle',
      type: 'searchset',
      total: resource ? 1 : 0,
      entry: resource ? [{ resource }] : [],
    });
  }
}

class NoopTranslator extends CqlTranslatorPort {
  translate(): Promise<{ elm: unknown }> {
    return Promise.resolve({ elm: {} });
  }

  checkHealth(): Promise<DependencyHealth> {
    return Promise.resolve({ name: 'cql-translator', status: 'up', latencyMs: 0, details: {} });
  }
}

describe('UiService order evaluation with the installed CQL engine', () => {
  it('evaluates pending resources and parameters, overriding a persisted version only for this call', async () => {
    const gateway = new OrderTestGateway();
    const service = new UiService(gateway, new NoopTranslator());
    const input = { patientId: 'patient-1', sandboxId: 'sandbox-a', hook: 'order-select' as const };
    const [draft] = buildDraftOrders(
      'patient-1',
      [
        {
          id: 'd1577c69-dfbe-44ad-ba6d-3e05e953b2ea',
          catalogId: 'amoxicillin',
          priority: 'routine',
        },
      ],
      false,
    );
    gateway.bundle.entry!.push({ resource: { ...draft, status: 'active' } });
    const reference = `MedicationRequest/${draft!.id}`;
    const positive = await service.evaluateHook({
      ...input,
      contextResources: [draft!],
      parameters: { Selections: [reference] },
    });
    assert.equal(positive.cards.length, 1, JSON.stringify(positive.activity));
    assert.deepEqual(positive.activity.warnings, []);
    assert.ok(positive.activity.consideredResources.includes(reference));
    const notSelected = await service.evaluateHook({
      ...input,
      contextResources: [draft!],
      parameters: { Selections: [] },
    });
    assert.equal(notSelected.cards.length, 0);
    const anotherSession = await service.evaluateHook({
      ...input,
      sandboxId: 'sandbox-b',
      parameters: { Selections: [reference] },
    });
    assert.equal(anotherSession.cards.length, 0);
    assert.equal(gateway.bundle.entry![1]!.resource!.status, 'active');
    assert.equal((await service.evaluateHook({ ...input, hook: 'order-sign' })).cards.length, 0);
  });

  it('materializes confirmed orders only for their sandbox and leaves pending reviews invisible', async () => {
    const gateway = new OrderTestGateway();
    const service = new UiService(gateway, new NoopTranslator());
    const resources = buildDraftOrders(
      'patient-1',
      [
        { id: 'd1577c69-dfbe-44ad-ba6d-3e05e953b2ea', catalogId: 'hba1c', priority: 'routine' },
        {
          id: 'd1577c69-dfbe-44ad-ba6d-3e05e953b2eb',
          catalogId: 'amoxicillin',
          dose: 500,
          frequency: 3,
          durationDays: 7,
          priority: 'routine',
        },
      ],
      true,
    );
    const review = {
      patientId: 'patient-1',
      sandboxId: 'sandbox-a',
      resources,
      expiresAt: new Date().toISOString(),
      decision: '',
    };
    gateway.orders.push(reviewResource('orders-confirmed', review, true));
    gateway.orders.push(
      reviewResource('orders-pending', {
        ...review,
        resources: [{ ...resources[0], id: 'pending' }],
      }),
    );
    const sandboxA = await service.getPatient('patient-1', 'sandbox-a');
    const sandboxB = await service.getPatient('patient-1', 'sandbox-b');
    assert.equal(sandboxA.serviceRequests.length, 1);
    assert.equal(sandboxA.sandboxOrders.length, 2);
    assert.deepEqual(sandboxA.sandboxOrders.map((order) => order.resourceType).sort(), [
      'MedicationRequest',
      'ServiceRequest',
    ]);
    assert.deepEqual(
      sandboxA.sandboxOrders.map((order) => [order.code, order.status, order.intent]),
      [
        ['4548-4', 'active', 'order'],
        ['308182', 'active', 'order'],
      ],
    );
    assert.ok(sandboxA.sandboxOrders.every((order) => order.display && order.authoredOn));
    assert.deepEqual(
      (await service.getPatient('patient-1', 'sandbox-a')).sandboxOrders,
      sandboxA.sandboxOrders,
    );
    assert.equal(sandboxB.sandboxOrders.length, 0);
    assert.deepEqual(sandboxB.serviceRequests, []);
    assert.deepEqual(sandboxB.medications, []);
    assert.deepEqual(
      gateway.bundle.entry?.map((entry) => entry.resource?.resourceType),
      ['Patient'],
    );
  });
});

// ELM de contrato minimo: existe una receta draft cuya referencia esta en Selections.
// El test usa cql-execution/cql-exec-fhir reales, sin traductor ni servidor HAPI.
const orderElmFixture = {
  library: {
    identifier: { id: 'OrderContract', version: '1.0.0' },
    schemaIdentifier: { id: 'urn:hl7-org:elm', version: 'r1' },
    usings: { def: [{ localIdentifier: 'FHIR', uri: 'http://hl7.org/fhir', version: '4.0.1' }] },
    parameters: {
      def: [
        {
          name: 'Selections',
          parameterTypeSpecifier: {
            type: 'ListTypeSpecifier',
            elementType: { type: 'NamedTypeSpecifier', name: '{urn:hl7-org:elm-types:r1}String' },
          },
        },
      ],
    },
    statements: {
      def: [
        {
          name: 'Aplica',
          context: 'Patient',
          expression: {
            type: 'Exists',
            operand: {
              type: 'Query',
              source: [
                {
                  alias: 'M',
                  expression: {
                    type: 'Retrieve',
                    dataType: '{http://hl7.org/fhir}MedicationRequest',
                  },
                },
              ],
              where: {
                type: 'And',
                operand: [
                  {
                    type: 'Equal',
                    operand: [
                      {
                        type: 'Property',
                        path: 'value',
                        source: { type: 'Property', scope: 'M', path: 'status' },
                      },
                      {
                        type: 'Literal',
                        valueType: '{urn:hl7-org:elm-types:r1}String',
                        value: 'draft',
                      },
                    ],
                  },
                  {
                    type: 'In',
                    operand: [
                      {
                        type: 'Concatenate',
                        operand: [
                          {
                            type: 'Literal',
                            valueType: '{urn:hl7-org:elm-types:r1}String',
                            value: 'MedicationRequest/',
                          },
                          {
                            type: 'Property',
                            path: 'value',
                            source: { type: 'Property', scope: 'M', path: 'id' },
                          },
                        ],
                      },
                      { type: 'ParameterRef', name: 'Selections' },
                    ],
                  },
                ],
              },
            },
          },
        },
      ],
    },
  },
};

class OrderTestGateway extends SparseFhirGateway {
  readonly bundle: FhirBundle = {
    resourceType: 'Bundle',
    type: 'collection',
    entry: [{ resource: { resourceType: 'Patient', id: 'patient-1' } }],
  };
  readonly orders: FhirResource[] = [];
  constructor() {
    super({ resourceType: 'Patient', id: 'patient-1' });
  }
  private library: FhirResource = {
    resourceType: 'Library',
    id: 'rule-orders',
    status: 'active',
    name: 'OrderContract',
    version: '1.0.0',
    meta: { tag: [{ system: 'https://rce-cql.local/fhir/tags/rule', code: 'cql-rule' }] },
    extension: [
      {
        url: 'https://rce-cql.local/fhir/StructureDefinition/rule-hook',
        valueCode: 'order-select',
      },
      { url: 'https://rce-cql.local/fhir/StructureDefinition/rule-activation', valueBoolean: true },
      {
        url: 'https://rce-cql.local/fhir/StructureDefinition/rule-lifecycle',
        valueCode: 'published',
      },
    ],
    content: [
      {
        contentType: 'application/elm+json',
        data: Buffer.from(JSON.stringify(orderElmFixture)).toString('base64'),
      },
    ],
  };
  override read(type: string, id: string): Promise<FhirResource | null> {
    return type === 'Library' ? Promise.resolve(this.library) : super.read(type, id);
  }
  override search(type: string): Promise<FhirBundle> {
    return Promise.resolve({
      resourceType: 'Bundle',
      entry: (type === 'Library' ? [this.library] : type === 'Basic' ? this.orders : []).map(
        (resource) => ({ resource }),
      ),
    });
  }
  override patientEverything(): Promise<FhirBundle> {
    return Promise.resolve(this.bundle);
  }
}
