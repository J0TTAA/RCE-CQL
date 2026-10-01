import { useState } from 'react';
import './orders.css';
import { Check, ClipboardCheck, Plus, RotateCw, Trash2 } from 'lucide-react';
import { useRce } from '../../app/app-context';
import { Link } from '../../app/router';
import { useAsync } from '../../lib/use-async';
import {
  Badge,
  Button,
  Field,
  IconButton,
  SelectInput,
  SeverityBadge,
  TextInput,
} from '../../components/ui/primitives';
import type { OrderInput, OrderReviewResult } from '../../types';

export function OrdersPanel({
  patientId,
  onConfirmed,
}: {
  patientId: string;
  onConfirmed: () => Promise<void>;
}) {
  const { api } = useRce();
  const catalog = useAsync(() => api.getOrderCatalog(), []);
  const [choice, setChoice] = useState('');
  const [orders, setOrders] = useState<OrderInput[]>([]);
  const [result, setResult] = useState<OrderReviewResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeHook, setActiveHook] = useState<'order-select' | 'order-sign' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const changeOrders = (next: OrderInput[]) => {
    setOrders(next);
    setResult(null);
    setError('');
    setNotice('');
  };

  const evaluate = async (
    hook: 'order-select' | 'order-sign',
    next: OrderInput[],
    selections?: string[],
  ) => {
    setBusy(true);
    setActiveHook(hook);
    setError('');
    setResult(null);
    setNotice('');
    try {
      setResult(await api.reviewOrders(patientId, hook, next, selections));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'No se pudieron evaluar las ordenes.');
    } finally {
      setBusy(false);
      setActiveHook(null);
    }
  };

  const addOrder = async () => {
    if (!choice || busy || orders.length >= 20) return;
    const order: OrderInput = { id: orderId(), catalogId: choice, priority: 'routine' };
    const next = [...orders, order];
    changeOrders(next);
    await evaluate('order-select', next, [order.id]);
  };

  const confirm = async () => {
    if (!result?.reviewId || busy) return;
    setBusy(true);
    setError('');
    try {
      const confirmation = await api.confirmOrders(patientId, result.reviewId);
      setOrders([]);
      setResult(null);
      setNotice(`${confirmation.orderCount} ordenes confirmadas en mi sandbox.`);
      try {
        await onConfirmed();
      } catch {
        setError(
          'Las ordenes se guardaron, pero no se pudo actualizar la ficha. Vuelve a abrirla.',
        );
      }
    } catch (failure) {
      setResult(null);
      setError(
        failure instanceof Error ? failure.message : 'No se pudieron confirmar las ordenes.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="orders-workflow" aria-label="Órdenes clínicas">
      <header className="orders-heading">
        <div>
          <h2>Órdenes clínicas</h2>
          <p className="orders-intro">
            Al agregar una orden se revisa la selección. Al firmar, se revisa el conjunto completo
            antes de guardarlo.
          </p>
        </div>
        <Badge tone="interactive">Mi sandbox</Badge>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void evaluate('order-sign', orders);
        }}
      >
        <fieldset disabled={busy}>
          <div className="order-picker">
            <Field label="Medicamento, examen o procedimiento">
              <SelectInput
                value={choice}
                onChange={(event) => setChoice(event.target.value)}
                disabled={catalog.loading || !!catalog.error}
              >
                <option value="">
                  {catalog.loading ? 'Cargando catalogo...' : 'Seleccionar orden'}
                </option>
                {(['medication', 'laboratory', 'procedure'] as const).map((kind) => (
                  <optgroup
                    key={kind}
                    label={
                      {
                        medication: 'Medicamentos',
                        laboratory: 'Examenes',
                        procedure: 'Procedimientos',
                      }[kind]
                    }
                  >
                    {(catalog.data ?? [])
                      .filter((item) => item.kind === kind)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </SelectInput>
            </Field>
            <Button
              type="button"
              onClick={() => void addOrder()}
              disabled={!choice || orders.length >= 20}
            >
              <Plus size={16} aria-hidden />
              Agregar a órdenes pendientes
            </Button>
          </div>
          {catalog.error ? (
            <div>
              <p role="alert" className="state-error">
                {catalog.error}
              </p>
              <Button type="button" onClick={catalog.reload}>
                <RotateCw size={16} aria-hidden />
                Reintentar catalogo
              </Button>
            </div>
          ) : null}
          {orders.length === 0 ? <p className="orders-empty">Sin órdenes pendientes.</p> : null}
          {orders.length ? <h3 className="pending-orders-title">Órdenes pendientes de firma</h3> : null}
          <div className="orders-list">
            {orders.map((order, index) => {
              const item = catalog.data?.find((entry) => entry.id === order.catalogId);
              const update = (patch: Partial<OrderInput>) =>
                changeOrders(
                  orders.map((entry) => (entry.id === order.id ? { ...entry, ...patch } : entry)),
                );
              return (
                <article className="order-row" key={order.id}>
                  <header>
                    <strong>
                      {index + 1}. {item?.label}
                    </strong>
                    <IconButton
                      type="button"
                      label={`Quitar ${item?.label ?? 'orden'}`}
                      onClick={() => changeOrders(orders.filter((entry) => entry.id !== order.id))}
                    >
                      <Trash2 size={16} aria-hidden />
                    </IconButton>
                  </header>
                  <div className="order-fields">
                    {item?.kind === 'medication' ? (
                      <>
                        <Field label={`Dosis (${item.unit})`}>
                          <TextInput
                            required
                            type="number"
                            min="0.01"
                            max="10000"
                            step="0.01"
                            value={order.dose ?? ''}
                            onChange={(event) => update({ dose: numberInput(event.target.value) })}
                          />
                        </Field>
                        <Field label="Veces al dia">
                          <TextInput
                            required
                            type="number"
                            min="1"
                            max="24"
                            step="1"
                            value={order.frequency ?? ''}
                            onChange={(event) =>
                              update({ frequency: numberInput(event.target.value) })
                            }
                          />
                        </Field>
                        <Field label="Duracion (dias)">
                          <TextInput
                            required
                            type="number"
                            min="1"
                            max="365"
                            step="1"
                            value={order.durationDays ?? ''}
                            onChange={(event) =>
                              update({ durationDays: numberInput(event.target.value) })
                            }
                          />
                        </Field>
                        <Field label="Via">
                          <TextInput readOnly value={item.route ?? ''} />
                        </Field>
                      </>
                    ) : null}
                    <Field label="Prioridad">
                      <SelectInput
                        value={order.priority}
                        onChange={(event) =>
                          update({ priority: event.target.value as OrderInput['priority'] })
                        }
                      >
                        <option value="routine">Habitual</option>
                        <option value="urgent">Urgente</option>
                      </SelectInput>
                    </Field>
                  </div>
                </article>
              );
            })}
          </div>
          {orders.length ? (
            <div className="order-hook-actions">
              <Button type="submit" variant="primary" disabled={busy}>
                <ClipboardCheck size={16} aria-hidden />
                Firmar órdenes
              </Button>
            </div>
          ) : null}
        </fieldset>
      </form>
      {busy ? (
        <p className="orders-progress" role="status">
          <RotateCw size={16} className="spin-icon" aria-hidden />
          {activeHook === 'order-select'
            ? 'Revisando la orden seleccionada...'
            : 'Revisando las órdenes antes de firmar...'}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="state-box state-error">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="orders-success">
          <Check size={16} aria-hidden />
          {notice}
        </p>
      ) : null}
      {result ? (
        <section className="order-results" aria-live="polite">
          <header className="orders-heading">
            <h3>
              {result.hook === 'order-select'
                ? 'Revisión al agregar la orden'
                : 'Revisión previa a la firma'}
            </h3>
            <Badge>{result.activity.rules.length} reglas evaluadas</Badge>
          </header>
          {result.activity.warnings.length ? (
            <div role="alert" className="state-box state-error">
              {result.activity.warnings.join(' ')}
            </div>
          ) : result.cards.length === 0 ? (
            <p>
              {result.hook === 'order-select'
                ? 'No se generaron recomendaciones para esta selección. La orden sigue pendiente.'
                : 'No se generaron recomendaciones. Puedes continuar y firmar las órdenes.'}
            </p>
          ) : null}
          {result.cards.map((card) => (
            <article key={card.id} className={`cds-card cds-${card.severity}`}>
              <SeverityBadge severity={card.severity} />
              <h3>{card.summary}</h3>
              <p>{card.detail}</p>
              <small>{card.source}</small>
            </article>
          ))}
          <div className="order-actions">
            <Link to="/activity">Ver paso a paso CDS</Link>
            {result.reviewId ? (
              <Button
                type="button"
                variant="primary"
                disabled={busy}
                onClick={() => void confirm()}
              >
                <Check size={16} aria-hidden />
                Firmar y guardar órdenes
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}
    </section>
  );
}

function numberInput(value: string): number | undefined {
  return value.trim() && Number.isFinite(Number(value)) ? Number(value) : undefined;
}

function orderId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // getRandomValues tambien funciona en las demos HTTP de una red local.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
