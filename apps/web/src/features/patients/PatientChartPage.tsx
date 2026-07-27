import { CheckCircle2, ClipboardEdit, RotateCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRce } from '../../app/app-context';
import { Link } from '../../app/router';
import { formatDate } from '../../lib/formatters';
import { useAsync } from '../../lib/use-async';
import type { CdsCard, PatientDetail } from '../../types';
import {
  AsyncState,
  Badge,
  Button,
  Drawer,
  Field,
  Panel,
  SeverityBadge,
  TextInput,
} from '../../components/ui/primitives';

type PatientTab =
  'resumen' | 'condiciones' | 'observaciones' | 'medicamentos' | 'encuentros' | 'cds';

export function PatientChartPage({ patientId }: { patientId: string }) {
  const { api } = useRce();
  const [tab, setTab] = useState<PatientTab>('resumen');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const patient = useAsync(() => api.getPatient(patientId), [patientId]);
  const cards = useAsync(() => api.getPatientCards(patientId), [patientId, patient.data?.cdsCount]);

  const refreshAll = () => {
    patient.reload();
    cards.reload();
  };

  return (
    <section className="page">
      <AsyncState loading={patient.loading} error={patient.error}>
        {patient.data ? (
          <>
            <PatientHeader
              patient={patient.data}
              onEdit={() => setDrawerOpen(true)}
              onRefresh={refreshAll}
            />
            <div className="chart-grid">
              <Panel className="chart-main">
                <div className="tabs" role="tablist" aria-label="Ficha clínica">
                  {(
                    [
                      'resumen',
                      'condiciones',
                      'observaciones',
                      'medicamentos',
                      'encuentros',
                    ] as PatientTab[]
                  ).map((item) => (
                    <button
                      key={item}
                      className={tab === item ? 'is-active' : ''}
                      onClick={() => setTab(item)}
                      type="button"
                    >
                      {item}
                    </button>
                  ))}
                  <button
                    className={tab === 'cds' ? 'is-active mobile-only-tab' : 'mobile-only-tab'}
                    onClick={() => setTab('cds')}
                    type="button"
                  >
                    CDS ({cards.data?.length ?? 0})
                  </button>
                </div>
                {tab === 'resumen' ? <SummaryTab patient={patient.data} /> : null}
                {tab === 'condiciones' ? (
                  <ResourceTable
                    rows={patient.data.conditions.map((item) => [
                      item.display,
                      item.code,
                      item.clinicalStatus,
                      formatDate(item.onsetDate),
                    ])}
                    headers={['Condición', 'Código', 'Estado', 'Inicio']}
                  />
                ) : null}
                {tab === 'observaciones' ? (
                  <ResourceTable
                    rows={patient.data.observations.map((item) => [
                      item.display,
                      `${item.value} ${item.unit}`,
                      item.interpretation,
                      formatDate(item.effectiveDate),
                    ])}
                    headers={['Observación', 'Valor', 'Interpretación', 'Fecha']}
                  />
                ) : null}
                {tab === 'medicamentos' ? (
                  <ResourceTable
                    rows={patient.data.medications.map((item) => [
                      item.display,
                      item.dose,
                      item.route,
                      item.status,
                    ])}
                    headers={['Medicamento', 'Dosis', 'Vía', 'Estado']}
                  />
                ) : null}
                {tab === 'encuentros' ? (
                  <ResourceTable
                    rows={patient.data.encounters.map((item) => [
                      item.type,
                      item.reason,
                      formatDate(item.date),
                      item.status,
                    ])}
                    headers={['Tipo', 'Motivo', 'Fecha', 'Estado']}
                  />
                ) : null}
                {tab === 'cds' ? <CdsRail cards={cards.data ?? []} embedded /> : null}
              </Panel>
              <aside className="chart-rail">
                <AsyncState loading={cards.loading} error={cards.error}>
                  <CdsRail cards={cards.data ?? []} />
                </AsyncState>
              </aside>
            </div>
            <PatientDataDrawer
              patient={patient.data}
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              onUpdated={refreshAll}
            />
          </>
        ) : null}
      </AsyncState>
    </section>
  );
}

function PatientHeader({
  patient,
  onEdit,
  onRefresh,
}: {
  patient: PatientDetail;
  onEdit: () => void;
  onRefresh: () => void;
}) {
  return (
    <div className="patient-header">
      <div>
        <div className="breadcrumbs">
          <Link to="/patients">Pacientes</Link>
          <span>/</span>
          <span>{patient.synId}</span>
        </div>
        <h1>{patient.name}</h1>
        <p>
          {patient.synId} · {patient.age} años · {formatDate(patient.birthDate)} · {patient.sex}
        </p>
      </div>
      <div className="header-actions">
        <Badge tone="info">Datos sintéticos</Badge>
        {patient.sandboxTouched ? <Badge tone="interactive">Mi sandbox</Badge> : null}
        <Button onClick={onRefresh}>
          <RotateCw size={15} aria-hidden />
          Reevaluar
        </Button>
        <Button variant="primary" onClick={onEdit}>
          <ClipboardEdit size={15} aria-hidden />
          Editar dato
        </Button>
      </div>
    </div>
  );
}

function SummaryTab({ patient }: { patient: PatientDetail }) {
  return (
    <div className="summary-grid">
      <div>
        <h2>Resumen</h2>
        <dl className="summary-list">
          <div>
            <dt>Condiciones activas</dt>
            <dd>{patient.activeConditions.length}</dd>
          </div>
          <div>
            <dt>Observaciones</dt>
            <dd>{patient.observations.length}</dd>
          </div>
          <div>
            <dt>Medicamentos</dt>
            <dd>{patient.medications.length}</dd>
          </div>
          <div>
            <dt>Último encuentro</dt>
            <dd>{formatDate(patient.lastEncounter)}</dd>
          </div>
        </dl>
      </div>
      <div>
        <h2>Línea temporal</h2>
        <ol className="timeline">
          {patient.timeline.map((item) => (
            <li key={item.id}>
              <time>{formatDate(item.date)}</time>
              <span>{item.kind}</span>
              <strong>{item.label}</strong>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function ResourceTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="table-wrap embedded-table">
      <table className="data-table compact">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join('-')}>
              {row.map((cell) => (
                <td key={cell}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CdsRail({ cards, embedded = false }: { cards: CdsCard[]; embedded?: boolean }) {
  const [selected, setSelected] = useState<CdsCard | null>(null);
  return (
    <div className={embedded ? 'cds-list embedded' : 'cds-list'}>
      <div className="rail-title">
        <h2>Recomendaciones CDS</h2>
        <span>{cards.length}</span>
      </div>
      {cards.length === 0 ? <div className="empty-cds">Sin recomendaciones activas</div> : null}
      {cards.map((card) => (
        <article className={`cds-card cds-${card.severity}`} key={card.id}>
          <SeverityBadge severity={card.severity} />
          <h3>{card.summary}</h3>
          <p>{card.detail}</p>
          <footer>
            <span>{card.source}</span>
            {card.suggestion ? (
              <Button onClick={() => setSelected(card)}>
                <CheckCircle2 size={15} aria-hidden />
                Aplicar
              </Button>
            ) : null}
          </footer>
        </article>
      ))}
      <ApplySuggestionDialog card={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function ApplySuggestionDialog({ card, onClose }: { card: CdsCard | null; onClose: () => void }) {
  return (
    <Drawer
      open={Boolean(card)}
      title="Confirmar sugerencia"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={onClose}>
            Confirmar
          </Button>
        </>
      }
    >
      {card?.suggestion ? (
        <dl className="confirm-list">
          <div>
            <dt>Acción</dt>
            <dd>{card.suggestion.action}</dd>
          </div>
          <div>
            <dt>Recurso FHIR</dt>
            <dd>{card.suggestion.resourceType}</dd>
          </div>
          <div>
            <dt>Detalle</dt>
            <dd>{card.suggestion.description}</dd>
          </div>
        </dl>
      ) : null}
    </Drawer>
  );
}

function PatientDataDrawer({
  patient,
  open,
  onClose,
  onUpdated,
}: {
  patient: PatientDetail;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { api } = useRce();
  const [birthDate, setBirthDate] = useState(patient.editableClinicalData.birthDate);
  const [systolicBloodPressure, setSystolicBloodPressure] = useState(
    numericInput(patient.editableClinicalData.systolicBloodPressure),
  );
  const [diastolicBloodPressure, setDiastolicBloodPressure] = useState(
    numericInput(patient.editableClinicalData.diastolicBloodPressure),
  );
  const [hba1c, setHba1c] = useState(numericInput(patient.editableClinicalData.hba1c));
  const [stage, setStage] = useState<'idle' | 'validating' | 'saving' | 'reevaluating' | 'updated'>(
    'idle',
  );

  useEffect(() => {
    setBirthDate(patient.editableClinicalData.birthDate);
    setSystolicBloodPressure(numericInput(patient.editableClinicalData.systolicBloodPressure));
    setDiastolicBloodPressure(numericInput(patient.editableClinicalData.diastolicBloodPressure));
    setHba1c(numericInput(patient.editableClinicalData.hba1c));
    setStage('idle');
  }, [patient.editableClinicalData, open]);

  const save = async () => {
    setStage('validating');
    await new Promise((resolve) => window.setTimeout(resolve, 280));
    setStage('saving');
    await api.updatePatient({
      patientId: patient.id,
      birthDate,
      systolicBloodPressure: optionalNumber(systolicBloodPressure),
      diastolicBloodPressure: optionalNumber(diastolicBloodPressure),
      hba1c: optionalNumber(hba1c),
    });
    setStage('reevaluating');
    await new Promise((resolve) => window.setTimeout(resolve, 360));
    setStage('updated');
    onUpdated();
  };

  return (
    <Drawer
      open={open}
      title="Editar datos del paciente"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={save}
            disabled={stage !== 'idle' && stage !== 'updated'}
          >
            Guardar cambios
          </Button>
        </>
      }
    >
      <div className="stack">
        <Field label="Fecha de nacimiento">
          <TextInput
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
          />
        </Field>
        <Field label="Presión sistólica">
          <TextInput
            type="number"
            inputMode="numeric"
            min={40}
            max={260}
            step={1}
            value={systolicBloodPressure}
            onChange={(event) => setSystolicBloodPressure(event.target.value)}
          />
        </Field>
        <Field label="Presión diastólica">
          <TextInput
            type="number"
            inputMode="numeric"
            min={30}
            max={160}
            step={1}
            value={diastolicBloodPressure}
            onChange={(event) => setDiastolicBloodPressure(event.target.value)}
          />
        </Field>
        <Field label="HbA1c">
          <TextInput
            type="number"
            inputMode="decimal"
            min={3}
            max={18}
            step={0.1}
            value={hba1c}
            onChange={(event) => setHba1c(event.target.value)}
          />
        </Field>
        <div className="state-box compact-state">
          Los cambios quedan como overlay del sandbox y se usan al reevaluar CQL.
        </div>
        <WriteStage stage={stage} detail={`Patient/${patient.id}`} />
      </div>
    </Drawer>
  );
}

function numericInput(value: number | undefined): string {
  return value === undefined ? '' : `${value}`;
}

function optionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function WriteStage({ stage, detail }: { stage: string; detail?: string }) {
  const steps = [
    ['validating', 'Validando'],
    ['saving', 'Guardando'],
    ['reevaluating', 'Reevaluando reglas'],
    ['updated', 'Actualizado'],
  ];
  return (
    <div className="write-stages" aria-live="polite">
      {steps.map(([id, label]) => (
        <span
          key={id}
          className={
            stage === id || (stage === 'updated' && id !== 'reevaluating') ? 'is-active' : ''
          }
        >
          {label}
        </span>
      ))}
      {detail ? <small>{detail}</small> : null}
    </div>
  );
}
