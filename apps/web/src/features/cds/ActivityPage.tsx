import { Activity, ClipboardList, ExternalLink, Filter, RotateCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRce } from '../../app/app-context';
import { Link } from '../../app/router';
import { useAsync } from '../../lib/use-async';
import type { ActivityEntry, CdsSeverity, RuleHook } from '../../types';
import {
  AsyncState,
  Badge,
  Button,
  Drawer,
  Field,
  Panel,
  SelectInput,
  SeverityBadge,
} from '../../components/ui/primitives';
import { CdsExecutionTrace } from './CdsExecutionTrace';

type ResultFilter = 'all' | ActivityEntry['result'];
type SeverityFilter = 'all' | CdsSeverity | 'none';
type HookFilter = 'all' | RuleHook;

export function ActivityPage() {
  const { api, session } = useRce();
  const [hook, setHook] = useState<HookFilter>('all');
  const [severity, setSeverity] = useState<SeverityFilter>('all');
  const [result, setResult] = useState<ResultFilter>('all');
  const [selected, setSelected] = useState<ActivityEntry | null>(null);
  const filters = useMemo(() => ({ hook, severity, result }), [hook, result, severity]);
  const activity = useAsync(() => api.listActivity(filters), [filters]);

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>Actividad CDS</h1>
          <p>Como las reglas CQL usan datos HL7 FHIR para producir cards.</p>
        </div>
        <Button onClick={activity.reload}>
          <RotateCw size={15} aria-hidden />
          Actualizar
        </Button>
      </div>

      <Panel className="activity-summary">
        <SummaryMetric label="Evaluaciones" value={activity.data?.length ?? 0} />
        <SummaryMetric
          label="Cards CDS"
          value={activity.data?.reduce((total, entry) => total + entry.cardsCount, 0) ?? 0}
        />
        <SummaryMetric
          label="Cards criticas"
          value={activity.data?.filter((entry) => entry.maxSeverity === 'critical').length ?? 0}
        />
      </Panel>

      <div className="toolbar activity-toolbar">
        <span className="toolbar-label">
          <Filter size={15} aria-hidden />
          Filtros
        </span>
        <Field label="Hook">
          <SelectInput value={hook} onChange={(event) => setHook(event.target.value as HookFilter)}>
            <option value="all">Todos</option>
            <option value="patient-view">patient-view</option>
            <option value="order-select">order-select</option>
            <option value="order-sign">order-sign</option>
          </SelectInput>
        </Field>
        <Field label="Severidad">
          <SelectInput
            value={severity}
            onChange={(event) => setSeverity(event.target.value as SeverityFilter)}
          >
            <option value="all">Todas</option>
            <option value="critical">Crítica</option>
            <option value="warning">Advertencia</option>
            <option value="info">Info</option>
            <option value="none">Sin cards</option>
          </SelectInput>
        </Field>
        <Field label="Resultado">
          <SelectInput
            value={result}
            onChange={(event) => setResult(event.target.value as ResultFilter)}
          >
            <option value="all">Todos</option>
            <option value="success">Con cards</option>
            <option value="no-aplica">No aplica</option>
            <option value="error">Error</option>
          </SelectInput>
        </Field>
      </div>

      <AsyncState
        loading={activity.loading}
        error={activity.error}
        empty={activity.data?.length === 0}
      >
        <div className="activity-list">
          {activity.data?.map((entry) => (
            <ActivityRow key={entry.id} entry={entry} onOpen={() => setSelected(entry)} />
          ))}
        </div>
      </AsyncState>

      <ActivityDrawer
        entry={selected}
        sandboxLabel={session?.sandboxLabel ?? 'Sandbox actual'}
        onClose={() => setSelected(null)}
      />
    </section>
  );
}

function SummaryMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="summary-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ActivityRow({ entry, onOpen }: { entry: ActivityEntry; onOpen: () => void }) {
  return (
    <article className="activity-row">
      <div className="activity-icon">
        <Activity size={18} aria-hidden />
      </div>
      <div className="activity-main">
        <div className="activity-title">
          <strong>{entry.patientName}</strong>
          <SeverityBadge severity={entry.maxSeverity} />
          <Badge tone={entry.scope === 'sandbox' ? 'interactive' : 'neutral'}>
            {entry.scope === 'sandbox' ? 'Mi sandbox' : 'Compartida'}
          </Badge>
        </div>
        <div className="activity-meta">
          <span>{formatDateTime(entry.date)}</span>
          <span>{hookLabel(entry.hook)}</span>
          <span>{entry.rules.join(', ')}</span>
        </div>
      </div>
      <div className="activity-stats">
        <strong>{entry.cardsCount}</strong>
        <span>cards</span>
      </div>
      <Button onClick={onOpen}>
        <ClipboardList size={15} aria-hidden />
        Paso a paso
      </Button>
    </article>
  );
}

function ActivityDrawer({
  entry,
  sandboxLabel,
  onClose,
}: {
  entry: ActivityEntry | null;
  sandboxLabel: string;
  onClose: () => void;
}) {
  return (
    <Drawer
      open={Boolean(entry)}
      title="Paso a paso CDS Hooks"
      className="drawer-wide"
      onClose={onClose}
    >
      {entry ? (
        <div className="activity-detail">
          <CdsExecutionTrace entry={entry} sandboxLabel={sandboxLabel} />

          <div className="drawer-section-title">
            <h3>Cards</h3>
            <Link to={`/patients/${entry.patientId}`} className="inline-link" onNavigate={onClose}>
              Abrir ficha <ExternalLink size={13} aria-hidden />
            </Link>
          </div>

          {entry.cards.length === 0 ? (
            <div className="state-box">La evaluación no generó recomendaciones.</div>
          ) : null}
          {entry.cards.map((card) => (
            <article className={`cds-card cds-${card.severity}`} key={card.id}>
              <SeverityBadge severity={card.severity} />
              <h3>{card.summary}</h3>
              <p>{card.detail}</p>
              <footer>
                <span>
                  {card.ruleName} {card.ruleVersion}
                </span>
              </footer>
            </article>
          ))}
        </div>
      ) : null}
    </Drawer>
  );
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
