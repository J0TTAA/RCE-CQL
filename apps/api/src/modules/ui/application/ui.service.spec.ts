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
