import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CircleSlash,
  Clock,
  Database,
  FileCode2,
  Hash,
  ShieldCheck,
  UserRound,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { shortId } from '../../lib/formatters';
import type { ActivityEntry, CdsSeverity } from '../../types';

type TraceVariant = 'default' | 'critical' | 'warning' | 'info' | 'none' | 'error';

interface CdsExecutionTraceProps {
  entry: ActivityEntry;
  sandboxLabel: string;
}

interface TraceNodeModel {
  icon: LucideIcon;
  title: string;
  value: string;
  detail: ReactNode;
  variant: TraceVariant;
}

const resultLabel: Record<ActivityEntry['result'], string> = {
  success: 'Con cards',
  'no-aplica': 'No aplica',
  error: 'Error',
};

const severityText: Record<CdsSeverity | 'none', string> = {
  critical: 'Crítica',
  warning: 'Advertencia',
  info: 'Informativa',
  none: 'Sin recomendación',
};

export function CdsExecutionTrace({ entry, sandboxLabel }: CdsExecutionTraceProps) {
  const resourceTypes = uniqueResourceTypes(entry.consideredResources);
  const resultVariant = getResultVariant(entry.result, entry.cardsCount, entry.maxSeverity);
  const ResultIcon = getResultIcon(entry.result, entry.cardsCount);
  const extraRules = Math.max(entry.rules.length - 2, 0);
  const nodes: TraceNodeModel[] = [
    {
      icon: Zap,
      title: 'Hook disparado',
      value: entry.hook,
      detail: <code>{shortId(entry.correlationId)}</code>,
      variant: 'default',
    },
    {
      icon: UserRound,
      title: 'Paciente',
      value: `Patient/${entry.patientId}`,
      detail: entry.patientName || 'Paciente FHIR',
      variant: 'default',
    },
    {
      icon: ShieldCheck,
      title: 'Sandbox',
      value: sandboxLabel,
      detail: 'Aislado por navegador',
      variant: 'default',
    },
    {
      icon: FileCode2,
      title: 'Reglas evaluadas',
      value: `${entry.rules.length} ${entry.rules.length === 1 ? 'regla' : 'reglas'}`,
      detail:
        entry.rules.length > 0 ? (
          <>
            {entry.rules.slice(0, 2).join(', ')}
            {extraRules > 0 ? <span className="cds-trace-muted"> +{extraRules} más</span> : null}
          </>
        ) : (
          'Sin reglas activas'
        ),
      variant: 'default',
    },
    {
      icon: Database,
      title: 'Recursos FHIR',
      value: resourceTypes.join(', ') || 'Sin recursos',
      detail: `${entry.consideredResources.length} recursos`,
      variant: 'default',
    },
    {
      icon: ResultIcon,
      title: 'Resultado',
      value: getCardsLabel(entry.cardsCount, entry.result),
      detail: severityText[entry.maxSeverity],
      variant: resultVariant,
    },
  ];

  return (
    <section className="cds-trace" aria-label="Trazabilidad CDS Hooks">
      <header className="cds-trace-header">
        <div>
          <h3>Trazabilidad CDS Hooks</h3>
          <p>Ejecución de soporte a decisiones clínicas</p>
        </div>
        <span className={`cds-trace-result cds-trace-result-${resultVariant}`}>
          {resultLabel[entry.result]}
        </span>
      </header>

      <div className="cds-trace-flow" role="list" aria-label="Flujo de ejecución CDS Hooks">
        {nodes.map((node, index) => (
          <div className="cds-trace-flow-item" key={node.title} role="listitem">
            <TraceNode node={node} />
            {index < nodes.length - 1 ? <TraceConnector /> : null}
          </div>
        ))}
      </div>

      <dl className="cds-trace-details" aria-label="Detalles técnicos de la ejecución">
        <TraceDetail label="Fecha / hora">
          <Calendar size={12} aria-hidden />
          {formatDateTime(entry.date)}
        </TraceDetail>
        <TraceDetail label="Duración">
          <Clock size={12} aria-hidden />
          {entry.durationMs} ms
        </TraceDetail>
        <TraceDetail label="Correlation ID">
          <Hash size={12} aria-hidden />
          <code>{entry.correlationId}</code>
        </TraceDetail>
        <TraceDetail label="Hook">{entry.hook}</TraceDetail>
        <TraceDetail label="Sandbox">{sandboxLabel}</TraceDetail>
        <TraceList label="Reglas evaluadas" values={entry.rules} empty="Sin reglas activas" />
        <TraceList
          label="Recursos considerados"
          values={entry.consideredResources}
          empty="Sin recursos registrados"
          code
        />
      </dl>

      <div className="cds-trace-warning-section">
        {entry.warnings.length > 0 ? (
          <>
            <p>
              <AlertTriangle size={14} aria-hidden />
              Advertencias
            </p>
            <ul>
              {entry.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="cds-trace-no-warnings">Sin advertencias del motor.</p>
        )}
      </div>
    </section>
  );
}

function TraceNode({ node }: { node: TraceNodeModel }) {
  const Icon = node.icon;
  return (
    <article className={`cds-trace-node cds-trace-node-${node.variant}`}>
      <div className="cds-trace-node-title">
        <span className="cds-trace-node-icon" aria-hidden>
          <Icon size={15} />
        </span>
        <span>{node.title}</span>
      </div>
      <strong>{node.value}</strong>
      <small>{node.detail}</small>
    </article>
  );
}

function TraceConnector() {
  return (
    <span className="cds-trace-connector" aria-hidden>
      <ChevronRight size={16} />
    </span>
  );
}

function TraceDetail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="cds-trace-detail">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function TraceList({
  label,
  values,
  empty,
  code = false,
}: {
  label: string;
  values: string[];
  empty: string;
  code?: boolean;
}) {
  return (
    <div className="cds-trace-detail cds-trace-detail-list">
      <dt>{label}</dt>
      <dd>
        {values.length === 0 ? (
          <span>{empty}</span>
        ) : (
          <ul>
            {values.map((value) => (
              <li key={value}>{code ? <code>{value}</code> : value}</li>
            ))}
          </ul>
        )}
      </dd>
    </div>
  );
}

function getResultVariant(
  result: ActivityEntry['result'],
  cardsCount: number,
  maxSeverity: CdsSeverity | 'none',
): TraceVariant {
  if (result === 'error') {
    return 'error';
  }
  if (cardsCount === 0) {
    return 'none';
  }
  return maxSeverity === 'none' ? 'info' : maxSeverity;
}

function getResultIcon(result: ActivityEntry['result'], cardsCount: number): LucideIcon {
  if (result === 'error') {
    return AlertTriangle;
  }
  if (cardsCount === 0) {
    return CircleSlash;
  }
  return CheckCircle2;
}

function getCardsLabel(cardsCount: number, result: ActivityEntry['result']): string {
  if (result === 'error') {
    return 'Error de evaluación';
  }
  if (cardsCount === 0) {
    return 'Sin cards';
  }
  return cardsCount === 1 ? '1 card' : `${cardsCount} cards`;
}

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed);
}

function uniqueResourceTypes(resources: string[]): string[] {
  return [
    ...new Set(
      resources
        .map((resource) => resource.split('/')[0]?.trim())
        .filter((resourceType): resourceType is string => Boolean(resourceType)),
    ),
  ];
}
