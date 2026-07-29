import { CheckCircle2, ClipboardEdit, RotateCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRce } from '../../app/app-context';
import { Link } from '../../app/router';
import { formatDate, shortId } from '../../lib/formatters';
import { useAsync } from '../../lib/use-async';
import type { CdsCard, DemoEncounterType, PatientDetail } from '../../types';
import {
  AsyncState,
  Badge,
  Button,
  Drawer,
  Field,
  Panel,
  SelectInput,
  SeverityBadge,
  TextInput,
} from '../../components/ui/primitives';

type PatientTab =
  'resumen' | 'condiciones' | 'observaciones' | 'medicamentos' | 'encuentros' | 'cds';

export function PatientChartPage({ patientId }: { patientId: string }) {
  const { api } = useRce();
  const [tab, setTab] = useState<PatientTab>('resumen');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [patientDetail, setPatientDetail] = useState<PatientDetail | null>(null);
  const [visibleCards, setVisibleCards] = useState<CdsCard[] | null>(null);
  const [refreshingCards, setRefreshingCards] = useState(false);
  const patient = useAsync(() => api.getPatient(patientId), [patientId]);
  const cards = useAsync(() => api.getPatientCards(patientId), [patientId]);

  useEffect(() => {
    if (patient.data) {
      setPatientDetail(patient.data);
    }
  }, [patient.data]);

  useEffect(() => {
    if (cards.data) {
      setVisibleCards(cards.data);
    }
  }, [cards.data]);

  const displayedPatient = patientDetail ?? patient.data;
  const displayedCards = visibleCards ?? cards.data ?? [];

  const refreshCards = async () => {
    setRefreshingCards(true);
    try {
      const nextCards = await api.getPatientCards(patientId);
      setVisibleCards(nextCards);
      setPatientDetail((current) =>
        current
          ? {
              ...current,
              cdsCount: nextCards.length,
              cdsStatus: maxCardSeverity(nextCards),
            }
          : current,
      );
    } finally {
      setRefreshingCards(false);
    }
  };

  return (
    <section className="page">
      <AsyncState loading={patient.loading && !displayedPatient} error={patient.error}>
        {displayedPatient ? (
          <>
            <PatientHeader
              patient={displayedPatient}
              onEdit={() => setDrawerOpen(true)}
              onRefresh={refreshCards}
              refreshing={refreshingCards}
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
                    CDS ({displayedCards.length})
                  </button>
                </div>
                {tab === 'resumen' ? <SummaryTab patient={displayedPatient} /> : null}
                {tab === 'condiciones' ? (
                  <ResourceTable
                    rows={displayedPatient.conditions.map((item) => [
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
                    rows={displayedPatient.observations.map((item) => [
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
                    rows={displayedPatient.medications.map((item) => [
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
                    rows={displayedPatient.encounters.map((item) => [
                      item.type,
                      item.reason,
                      formatDate(item.date),
                      item.status,
                    ])}
                    headers={['Tipo', 'Motivo', 'Fecha', 'Estado']}
                  />
                ) : null}
                {tab === 'cds' ? <CdsRail cards={displayedCards} embedded /> : null}
              </Panel>
              <aside className="chart-rail">
                <AsyncState loading={cards.loading && !visibleCards} error={cards.error}>
                  <CdsRail cards={displayedCards} />
                </AsyncState>
              </aside>
            </div>
            <PatientDataDrawer
              patient={displayedPatient}
              open={drawerOpen}
              onClose={() => setDrawerOpen(false)}
              onUpdated={(result) => {
                setPatientDetail(result.patient);
                setVisibleCards(result.cards);
              }}
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
  refreshing,
}: {
  patient: PatientDetail;
  onEdit: () => void;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}) {
  const technicalId = patient.synId || patient.id;
  return (
    <div className="patient-header">
      <div>
        <div className="breadcrumbs">
          <Link to="/patients">Pacientes</Link>
          <span>/</span>
          <span>Ficha clínica</span>
        </div>
        <h1>{patient.name}</h1>
        <p className="patient-demographics">
          <span>{patient.age} años</span>
          <span>{formatDate(patient.birthDate)}</span>
          <span>{patient.sex}</span>
          <span className="technical-id" title={`Patient/${patient.id}`}>
            FHIR {shortId(technicalId)}
          </span>
        </p>
      </div>
      <div className="header-actions">
        <Badge tone="info">Datos sintéticos</Badge>
        {patient.sandboxTouched ? <Badge tone="interactive">Mi sandbox</Badge> : null}
        <Button onClick={onRefresh} disabled={refreshing}>
          <RotateCw className={refreshing ? 'spin-icon' : undefined} size={15} aria-hidden />
          {refreshing ? 'Reevaluando' : 'Reevaluar'}
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
  onUpdated: (result: { patient: PatientDetail; cards: CdsCard[] }) => void;
}) {
  const { api } = useRce();
  const [birthDate, setBirthDate] = useState(patient.editableClinicalData.birthDate);
  const [gender, setGender] = useState(patient.editableClinicalData.gender);
  const [systolicBloodPressure, setSystolicBloodPressure] = useState(
    numericInput(patient.editableClinicalData.systolicBloodPressure),
  );
  const [diastolicBloodPressure, setDiastolicBloodPressure] = useState(
    numericInput(patient.editableClinicalData.diastolicBloodPressure),
  );
  const [hba1c, setHba1c] = useState(numericInput(patient.editableClinicalData.hba1c));
  const [fastingGlucose, setFastingGlucose] = useState(
    numericInput(patient.editableClinicalData.fastingGlucose),
  );
  const [ldlCholesterol, setLdlCholesterol] = useState(
    numericInput(patient.editableClinicalData.ldlCholesterol),
  );
  const [bodyMassIndex, setBodyMassIndex] = useState(
    numericInput(patient.editableClinicalData.bodyMassIndex),
  );
  const [bodyWeight, setBodyWeight] = useState(
    numericInput(patient.editableClinicalData.bodyWeight),
  );
  const [bodyHeight, setBodyHeight] = useState(
    numericInput(patient.editableClinicalData.bodyHeight),
  );
  const [diabetesCondition, setDiabetesCondition] = useState(
    Boolean(patient.editableClinicalData.diabetesCondition),
  );
  const [metforminMedication, setMetforminMedication] = useState(
    Boolean(patient.editableClinicalData.metforminMedication),
  );
  const [encounterType, setEncounterType] = useState<DemoEncounterType>(
    patient.editableClinicalData.encounterType ?? 'none',
  );
  const [stage, setStage] = useState<'idle' | 'validating' | 'saving' | 'reevaluating' | 'updated'>(
    'idle',
  );

  useEffect(() => {
    setBirthDate(patient.editableClinicalData.birthDate);
    setGender(patient.editableClinicalData.gender);
    setSystolicBloodPressure(numericInput(patient.editableClinicalData.systolicBloodPressure));
    setDiastolicBloodPressure(numericInput(patient.editableClinicalData.diastolicBloodPressure));
    setHba1c(numericInput(patient.editableClinicalData.hba1c));
    setFastingGlucose(numericInput(patient.editableClinicalData.fastingGlucose));
    setLdlCholesterol(numericInput(patient.editableClinicalData.ldlCholesterol));
    setBodyMassIndex(numericInput(patient.editableClinicalData.bodyMassIndex));
    setBodyWeight(numericInput(patient.editableClinicalData.bodyWeight));
    setBodyHeight(numericInput(patient.editableClinicalData.bodyHeight));
    setDiabetesCondition(Boolean(patient.editableClinicalData.diabetesCondition));
    setMetforminMedication(Boolean(patient.editableClinicalData.metforminMedication));
    setEncounterType(patient.editableClinicalData.encounterType ?? 'none');
    setStage('idle');
  }, [patient.editableClinicalData, open]);

  const save = async () => {
    setStage('validating');
    await new Promise((resolve) => window.setTimeout(resolve, 280));
    setStage('saving');
    const result = await api.updatePatient({
      patientId: patient.id,
      birthDate,
      gender,
      systolicBloodPressure: optionalNumber(systolicBloodPressure),
      diastolicBloodPressure: optionalNumber(diastolicBloodPressure),
      hba1c: optionalNumber(hba1c),
      fastingGlucose: optionalNumber(fastingGlucose),
      ldlCholesterol: optionalNumber(ldlCholesterol),
      bodyMassIndex: optionalNumber(bodyMassIndex),
      bodyWeight: optionalNumber(bodyWeight),
      bodyHeight: optionalNumber(bodyHeight),
      diabetesCondition,
      metforminMedication,
      encounterType,
    });
    setStage('reevaluating');
    await new Promise((resolve) => window.setTimeout(resolve, 360));
    setStage('updated');
    onUpdated(result);
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
        <Field label="Sexo administrativo">
          <SelectInput
            value={gender}
            onChange={(event) =>
              setGender(event.target.value as PatientDetail['editableClinicalData']['gender'])
            }
          >
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
            <option value="other">Otro</option>
            <option value="unknown">Desconocido</option>
          </SelectInput>
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
        <Field label="Glucosa en ayunas">
          <TextInput
            type="number"
            inputMode="numeric"
            min={40}
            max={600}
            step={1}
            value={fastingGlucose}
            onChange={(event) => setFastingGlucose(event.target.value)}
          />
        </Field>
        <Field label="LDL">
          <TextInput
            type="number"
            inputMode="numeric"
            min={20}
            max={400}
            step={1}
            value={ldlCholesterol}
            onChange={(event) => setLdlCholesterol(event.target.value)}
          />
        </Field>
        <Field label="IMC">
          <TextInput
            type="number"
            inputMode="decimal"
            min={10}
            max={80}
            step={0.1}
            value={bodyMassIndex}
            onChange={(event) => setBodyMassIndex(event.target.value)}
          />
        </Field>
        <Field label="Peso">
          <TextInput
            type="number"
            inputMode="decimal"
            min={2}
            max={300}
            step={0.1}
            value={bodyWeight}
            onChange={(event) => setBodyWeight(event.target.value)}
          />
        </Field>
        <Field label="Talla">
          <TextInput
            type="number"
            inputMode="decimal"
            min={40}
            max={230}
            step={0.1}
            value={bodyHeight}
            onChange={(event) => setBodyHeight(event.target.value)}
          />
        </Field>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={diabetesCondition}
            onChange={(event) => setDiabetesCondition(event.target.checked)}
          />
          <span>Condicion activa: diabetes mellitus</span>
        </label>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={metforminMedication}
            onChange={(event) => setMetforminMedication(event.target.checked)}
          />
          <span>Medicamento activo: metformina</span>
        </label>
        <Field label="Encuentro pedagogico">
          <SelectInput
            value={encounterType}
            onChange={(event) =>
              setEncounterType(event.target.value as DemoEncounterType)
            }
          >
            <option value="none">Sin encuentro generado</option>
            <option value="ambulatory">Ambulatorio</option>
            <option value="emergency">Urgencia</option>
            <option value="inpatient">Hospitalizacion</option>
          </SelectInput>
        </Field>
        <div className="state-box compact-state">
          Los cambios quedan como overlay del sandbox y se usan al reevaluar CQL.
        </div>
        <WriteStage stage={stage} detail={`FHIR ${shortId(patient.id)}`} />
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

function maxCardSeverity(cards: CdsCard[]): PatientDetail['cdsStatus'] {
  if (cards.some((card) => card.severity === 'critical')) {
    return 'critical';
  }
  if (cards.some((card) => card.severity === 'warning')) {
    return 'warning';
  }
  if (cards.some((card) => card.severity === 'info')) {
    return 'info';
  }
  return 'none';
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
