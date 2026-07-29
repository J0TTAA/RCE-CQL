import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BadRequestException } from '@nestjs/common';
import type {
  ActivityEntry,
  HookEvaluationInput,
  UiService,
} from '../../ui/application/ui.service';
import { CdsHooksService } from './cds-hooks.service';

describe('CdsHooksService', () => {
  it('discovers the standard RCE CDS services', () => {
    const service = new CdsHooksService(testUiService());

    const discovery = service.discovery();

    assert.deepEqual(
      discovery.services.map((item) => [item.id, item.hook]),
      [
        ['rce-patient-view', 'patient-view'],
        ['rce-order-select', 'order-select'],
        ['rce-order-sign', 'order-sign'],
      ],
    );
  });

  it('invokes patient-view and maps internal cards to CDS Hooks cards', async () => {
    let seenInput: HookEvaluationInput | undefined;
    const service = new CdsHooksService(
      testUiService((input) => {
        seenInput = input;
      }),
    );

    const response = await service.invoke('rce-patient-view', 'sandbox-test', {
      hook: 'patient-view',
      hookInstance: 'd1577c69-dfbe-44ad-ba6d-3e05e953b2ea',
      context: { userId: 'Practitioner/demo', patientId: 'patient-1' },
      prefetch: {
        lab: {
          resourceType: 'Observation',
          id: 'hba1c-prefetch',
          status: 'final',
        },
      },
    });

    assert.equal(seenInput?.patientId, 'patient-1');
    assert.equal(seenInput?.sandboxId, 'sandbox-test');
    assert.equal(seenInput?.hook, 'patient-view');
    assert.equal(seenInput?.correlationId, 'd1577c69-dfbe-44ad-ba6d-3e05e953b2ea');
    assert.equal(seenInput?.additionalResources?.[0]?.resourceType, 'Observation');
    assert.deepEqual(response, {
      cards: [
        {
          uuid: 'card-rule-1',
          summary: 'Sospecha de diabetes por HbA1c',
          detail: 'HbA1c mayor o igual a 6.5%.',
          indicator: 'critical',
          source: { label: 'RceDiabetesRiskHba1c 0.1.0' },
        },
      ],
    });
  });

  it('rejects mismatched service and hook', async () => {
    const service = new CdsHooksService(testUiService());

    await assert.rejects(
      () =>
        service.invoke('rce-patient-view', 'sandbox-test', {
          hook: 'order-sign',
          hookInstance: 'd1577c69-dfbe-44ad-ba6d-3e05e953b2ea',
          context: { userId: 'Practitioner/demo', patientId: 'patient-1' },
        }),
      BadRequestException,
    );
  });
});

function testUiService(onEvaluate?: (input: HookEvaluationInput) => void): UiService {
  return {
    evaluateHook(input: HookEvaluationInput) {
      onEvaluate?.(input);
      return Promise.resolve({
        cards: [
          {
            id: 'card-rule-1',
            severity: 'critical',
            summary: 'Sospecha de diabetes por HbA1c',
            detail: 'HbA1c mayor o igual a 6.5%.',
            source: 'RceDiabetesRiskHba1c 0.1.0',
            ruleName: 'RceDiabetesRiskHba1c',
            ruleVersion: '0.1.0',
          },
        ],
        activity: {} as ActivityEntry,
      });
    },
  } as UiService;
}
