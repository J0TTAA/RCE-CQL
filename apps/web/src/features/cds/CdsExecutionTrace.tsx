import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CircleSlash,
  Database,
  FileCode2,
  ShieldCheck,
  UserRound,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { ActivityEntry, CdsSeverity, RuleHook } from '../../types';

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
  critical: 'Critica',
  warning: 'Advertencia',
  info: 'Informativa',
  none: 'Sin recomendacion',
};

export function CdsExecutionTrace({ entry, sandboxLabel }: CdsExecutionTraceProps) {
  const resourceTypes = uniqueResourceTypes(entry.consideredResources);
  const resultVariant = getResultVariant(entry.result, entry.cardsCount, entry.maxSeverity);
  const ResultIcon = getResultIcon(entry.result, entry.cardsCount);
  const extraRules = Math.max(entry.rules.length - 2, 0);
  const nodes: TraceNodeModel[] = [
    {
      icon: Zap,
      title: 'Momento CDS Hooks',
      value: hookLabel(entry.hook),
      detail: 'El RCE pidio ayuda clinica en este punto.',
      variant: 'default',
    },
    {
      icon: UserRound,
      title: 'Paciente',
      value: entry.patientName || 'Paciente FHIR',
      detail: 'Ficha clinica seleccionada para la evaluacion.',
      variant: 'default',
    },
    {
      icon: ShieldCheck,
      title: 'Sandbox',
      value: sandboxLabel,
      detail: 'Usa solo los cambios de este navegador.',
      variant: 'default',
    },
    {
      icon: Database,
      title: 'Datos HL7 FHIR',
      value: resourceTypes.join(', ') || 'Sin datos reportados',
      detail: `${entry.consideredResources.length} recursos considerados`,
      variant: 'default',
    },
    {
      icon: FileCode2,
      title: 'Reglas CQL',
      value: `${entry.rules.length} ${entry.rules.length === 1 ? 'regla' : 'reglas'}`,
      detail:
        entry.rules.length > 0 ? (
          <>
            {entry.rules.slice(0, 2).join(', ')}
            {extraRules > 0 ? <span className="cds-trace-muted"> +{extraRules} mas</span> : null}
          </>
        ) : (
          'Sin reglas activas'
        ),
      variant: 'default',
    },
    {
      icon: ResultIcon,
      title: 'Card CDS',
      value: getCardsLabel(entry.cardsCount, entry.result),
      detail: severityText[entry.maxSeverity],
      variant: resultVariant,
    },
  ];

  return (
    <section className="cds-trace" aria-label="Paso a paso CDS Hooks">
      <header className="cds-trace-header">
        <div>
          <h3>Paso a paso CDS Hooks</h3>
          <p>De datos HL7 FHIR a reglas CQL y cards educativas.</p>
        </div>
        <span className={`cds-trace-result cds-trace-result-${resultVariant}`}>
          {resultLabel[entry.result]}
        </span>
      </header>

      <div className="cds-trace-teaching">
        <h4>Lectura para la clase</h4>
        <ol>
          <li>
            El alumno abre o reevalua una ficha. Ese momento del flujo se representa con CDS Hooks.
          </li>
          <li>
            El backend toma el paciente y el sandbox del navegador, asi cada alumno prueba sin
            afectar a otros.
          </li>
          <li>
            Los datos clinicos se leen como recursos HL7 FHIR, por ejemplo Patient, Observation o
            Condition.
          </li>
          <li>Cada regla CQL activa se ejecuta sobre esos datos y responde verdadero o falso.</li>
          <li>
            Si una regla devuelve verdadero, el RCE muestra una card CDS con la recomendacion.
          </li>
        </ol>
      </div>

      <div className="cds-trace-flow" role="list" aria-label="Flujo educativo CDS Hooks">
        {nodes.map((node, index) => (
          <div className="cds-trace-flow-item" key={node.title} role="listitem">
            <TraceNode node={node} />
            {index < nodes.length - 1 ? <TraceConnector /> : null}
          </div>
        ))}
      </div>

      <dl className="cds-trace-details" aria-label="Resumen educativo de la ejecucion">
        <TraceDetail label="Cuando">
          <Calendar size={12} aria-hidden />
          {formatDateTime(entry.date)}
        </TraceDetail>
        <TraceDetail label="Momento clinico">{hookLabel(entry.hook)}</TraceDetail>
        <TraceDetail label="Paciente">{entry.patientName || entry.patientId}</TraceDetail>
        <TraceDetail label="Sandbox">{sandboxLabel}</TraceDetail>
        <TraceList label="Reglas CQL evaluadas" values={entry.rules} empty="Sin reglas activas" />
        <TraceList
          label="Tipos de recursos HL7 FHIR"
          values={resourceTypes}
          empty="Sin recursos reportados"
        />
      </dl>

      <div className="cds-trace-warning-section">
        {entry.warnings.length > 0 ? (
          <>
            <p>
              <AlertTriangle size={14} aria-hidden />
              Notas de evaluacion
            </p>
            <ul>
              {entry.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="cds-trace-no-warnings">
            La evaluacion termino sin errores. Si no hubo cards, la condicion CQL devolvio falso.
          </p>
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

function TraceList({ label, values, empty }: { label: string; values: string[]; empty: string }) {
  return (
    <div className="cds-trace-detail cds-trace-detail-list">
      <dt>{label}</dt>
      <dd>
        {values.length === 0 ? (
          <span>{empty}</span>
        ) : (
          <ul>
            {values.map((value) => (
              <li key={value}>{value}</li>
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
    return 'Error de evaluacion';
  }
  if (cardsCount === 0) {
    return 'Sin cards';
  }
  return cardsCount === 1 ? '1 card' : `${cardsCount} cards`;
}

function hookLabel(hook: RuleHook): string {
  const labels: Record<RuleHook, string> = {
    'patient-view': 'Vista de paciente',
    'order-select': 'Seleccion de orden',
    'order-sign': 'Firma de orden',
  };
  return `${labels[hook]} (${hook})`;
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
