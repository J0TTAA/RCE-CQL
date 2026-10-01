import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { FhirGatewayPort } from '../../fhir/application/fhir-gateway.port';
import {
  buildDraftOrders,
  isSignedOrderReview,
  ORDER_CATALOG,
  readOrderReview,
  reviewResource,
} from '../../fhir/application/sandbox-orders';
import type { ActivityEntry } from '../../ui/application/ui.service';
import type { ReviewOrdersDto } from '../presentation/order-workflow.dto';
import { CdsHooksService } from './cds-hooks.service';

@Injectable()
export class OrderWorkflowService {
  constructor(
    private readonly fhir: FhirGatewayPort,
    private readonly cds: CdsHooksService,
  ) {}

  catalog() {
    return ORDER_CATALOG;
  }

  async review(patientId: string, sandboxId: string, input: ReviewOrdersDto) {
    const resources = buildDraftOrders(patientId, input.orders, input.hook === 'order-sign');
    const selections = input.selections?.map((id) => {
      const resource = resources.find((item) => item.id === id);
      return resource ? `${resource.resourceType}/${id}` : id;
    });
    const evaluation = await this.cds.evaluate(`rce-${input.hook}`, sandboxId, {
      hook: input.hook,
      hookInstance: randomUUID(),
      context: {
        userId: 'Practitioner/rce-educativo',
        patientId,
        draftOrders: {
          resourceType: 'Bundle',
          type: 'collection',
          entry: resources.map((resource) => ({ resource })),
        },
        ...(input.hook === 'order-select' ? { selections } : {}),
      },
    });
    let reviewId: string | undefined;
    if (input.hook === 'order-sign' && !evaluation.activity.warnings.length) {
      reviewId = `orders-${randomUUID()}`;
      await this.fhir.update(
        'Basic',
        reviewId,
        reviewResource(reviewId, {
          patientId,
          sandboxId,
          resources,
          expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
          decision: decisionFingerprint(evaluation.activity),
        }),
      );
    }
    return { ...evaluation, reviewId, hook: input.hook };
  }

  async confirm(patientId: string, sandboxId: string, reviewId: string) {
    if (!/^orders-[a-f0-9-]{36}$/.test(reviewId))
      throw new NotFoundException('Revision no encontrada.');
    const stored = await this.fhir.read('Basic', reviewId);
    const review = readOrderReview(stored, patientId, sandboxId);
    if (!review || !stored) throw new NotFoundException('Revision no encontrada en tu sandbox.');
    if (isSignedOrderReview(stored))
      return { confirmed: true, orderCount: review.resources.length };
    if (Date.parse(review.expiresAt) < Date.now())
      throw new ConflictException('La revision vencio. Vuelve a revisar antes de confirmar.');
    const evaluation = await this.cds.evaluate('rce-order-sign', sandboxId, {
      hook: 'order-sign',
      hookInstance: randomUUID(),
      context: {
        userId: 'Practitioner/rce-educativo',
        patientId,
        draftOrders: {
          resourceType: 'Bundle',
          type: 'collection',
          entry: review.resources.map((resource) => ({ resource })),
        },
      },
    });
    if (
      evaluation.activity.warnings.length ||
      decisionFingerprint(evaluation.activity) !== review.decision
    ) {
      throw new ConflictException(
        'Las reglas o recomendaciones cambiaron. Vuelve a revisar las ordenes antes de confirmar.',
      );
    }
    // La identidad de la revision es estable: confirmar dos veces no crea dos recetas.
    await this.fhir.update('Basic', reviewId, reviewResource(reviewId, review, true));
    return { confirmed: true, orderCount: review.resources.length };
  }
}

function decisionFingerprint(activity: ActivityEntry): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        rules: [...activity.rules].sort(),
        cards: activity.cards,
        warnings: activity.warnings,
      }),
    )
    .digest('hex');
}
