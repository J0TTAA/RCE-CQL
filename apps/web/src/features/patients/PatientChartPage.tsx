import { CheckCircle2, ClipboardEdit, Plus, RotateCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRce } from '../../app/app-context';
import { Link } from '../../app/router';
import { formatDate, shortId } from '../../lib/formatters';
import { useAsync } from '../../lib/use-async';
import type {
  CdsCard,
  DemoEncounterType,
  EditableClinicalResource,
  EditableClinicalResourceType,
  PatientDetail,
} from '../../types';
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
  | 'resumen'
  | 'condiciones'
  | 'observaciones'
  | 'medicamentos'
  | 'alergias'
  | 'encuentros'
  | 'procedimientos'
  | 'inmunizaciones'
  | 'ordenes'
  | 'cds';

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
                      'alergias',
                      'encuentros',
                      'procedimientos',
                      'inmunizaciones',
                      'ordenes',
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
                {tab === 'alergias' ? (
                  <ResourceTable
                    rows={displayedPatient.allergies.map((item) => [
                      item.display,
                      item.clinicalStatus,
                      item.criticality,
                      formatDate(item.recordedDate),
                    ])}
                    headers={['Alergia', 'Estado', 'Criticidad', 'Registro']}
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
                {tab === 'procedimientos' ? (
                  <ResourceTable
                    rows={displayedPatient.procedures.map((item) => [
                      item.display,
                      item.code,
                      item.status,
                      formatDate(item.performedDate),
                    ])}
                    headers={['Procedimiento', 'Codigo', 'Estado', 'Fecha']}
                  />
                ) : null}
                {tab === 'inmunizaciones' ? (
                  <ResourceTable
                    rows={displayedPatient.immunizations.map((item) => [
                      item.vaccine,
                      item.status,
                      formatDate(item.occurrenceDate),
                    ])}
                    headers={['Vacuna', 'Estado', 'Fecha']}
                  />
                ) : null}
                {tab === 'ordenes' ? (
                  <ResourceTable
                    rows={displayedPatient.serviceRequests.map((item) => [
                      item.display,
                      item.code,
                      item.status,
                      item.intent,
                      formatDate(item.authoredOn),
                    ])}
                    headers={['Orden', 'Codigo', 'Estado', 'Intencion', 'Fecha']}
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
          {rows.map((row, rowIndex) => (
            <tr key={`${rowIndex}-${row.join('-')}`}>
              {row.map((cell, cellIndex) => (
                <td key={`${cellIndex}-${cell}`}>{cell}</td>
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
  const [clinicalResources, setClinicalResources] = useState<EditableClinicalResource[]>(
    patient.editableClinicalData.clinicalResources ?? [],
  );
  const [stage, setStage] = useState<'idle' | 'validating' | 'saving' | 'reevaluating' | 'updated'>(
    'idle',
  );
  const [saveError, setSaveError] = useState<string | null>(null);

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
    setClinicalResources(patient.editableClinicalData.clinicalResources ?? []);
    setStage('idle');
    setSaveError(null);
  }, [patient.editableClinicalData, open]);

  const save = async () => {
    try {
      setSaveError(null);
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
        clinicalResources,
      });
      setStage('reevaluating');
      await new Promise((resolve) => window.setTimeout(resolve, 360));
      setStage('updated');
      onUpdated(result);
    } catch (error) {
      setStage('idle');
      setSaveError(error instanceof Error ? error.message : 'No se pudo guardar el paciente.');
    }
  };

  return (
    <Drawer
      open={open}
      title="Editar datos del paciente"
      className="drawer-wide"
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
            min={0}
            max={200}
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
            onChange={(event) => setEncounterType(event.target.value as DemoEncounterType)}
          >
            <option value="none">Sin encuentro generado</option>
            <option value="ambulatory">Ambulatorio</option>
            <option value="emergency">Urgencia</option>
            <option value="inpatient">Hospitalizacion</option>
          </SelectInput>
        </Field>
        <ClinicalResourcesEditor resources={clinicalResources} onChange={setClinicalResources} />
        <div className="state-box compact-state">
          Los cambios quedan como overlay del sandbox y se usan al reevaluar CQL.
        </div>
        {saveError ? (
          <div className="state-box state-error" role="alert">
            {saveError}
          </div>
        ) : null}
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

interface ClinicalResourceOption {
  code: string;
  label: string;
  unit?: string;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
}

interface ClinicalResourceTypeConfig {
  label: string;
  addLabel: string;
  options: ClinicalResourceOption[];
  statuses: Array<{ value: string; label: string }>;
}

const clinicalResourceCatalog: Record<EditableClinicalResourceType, ClinicalResourceTypeConfig> = {
  condition: {
    label: 'Condicion',
    addLabel: 'Agregar condicion',
    statuses: [
      { value: 'active', label: 'Activa' },
      { value: 'resolved', label: 'Resuelta' },
    ],
    options: [
      { code: 'diabetes', label: 'Diabetes mellitus' },
      { code: 'hypertension', label: 'Hipertension' },
      { code: 'asthma', label: 'Asma' },
      { code: 'kidneyDisease', label: 'Enfermedad renal cronica' },
      { code: 'pregnancy', label: 'Embarazo' },
      { code: 'depression', label: 'Depresion' },
    ],
  },
  observation: {
    label: 'Observacion',
    addLabel: 'Agregar observacion',
    statuses: [
      { value: 'final', label: 'Final' },
      { value: 'preliminary', label: 'Preliminar' },
    ],
    options: [
      {
        code: 'systolicBloodPressure',
        label: 'Presion sistolica',
        unit: 'mmHg',
        defaultValue: 140,
        min: 40,
        max: 260,
        step: 1,
      },
      {
        code: 'diastolicBloodPressure',
        label: 'Presion diastolica',
        unit: 'mmHg',
        defaultValue: 90,
        min: 30,
        max: 160,
        step: 1,
      },
      { code: 'hba1c', label: 'HbA1c', unit: '%', defaultValue: 7.2, min: 3, max: 18, step: 0.1 },
      {
        code: 'fastingGlucose',
        label: 'Glucosa en ayunas',
        unit: 'mg/dL',
        defaultValue: 126,
        min: 40,
        max: 600,
        step: 1,
      },
      {
        code: 'ldlCholesterol',
        label: 'LDL',
        unit: 'mg/dL',
        defaultValue: 130,
        min: 20,
        max: 400,
        step: 1,
      },
      {
        code: 'creatinine',
        label: 'Creatinina',
        unit: 'mg/dL',
        defaultValue: 1.2,
        min: 0.1,
        max: 15,
        step: 0.1,
      },
      {
        code: 'egfr',
        label: 'eGFR',
        unit: 'mL/min/1.73m2',
        defaultValue: 60,
        min: 1,
        max: 150,
        step: 1,
      },
      {
        code: 'oxygenSaturation',
        label: 'Saturacion O2',
        unit: '%',
        defaultValue: 95,
        min: 50,
        max: 100,
        step: 1,
      },
      {
        code: 'heartRate',
        label: 'Frecuencia cardiaca',
        unit: '/min',
        defaultValue: 80,
        min: 20,
        max: 220,
        step: 1,
      },
    ],
  },
  medication: {
    label: 'Medicamento',
    addLabel: 'Agregar medicamento',
    statuses: [
      { value: 'active', label: 'Activo' },
      { value: 'completed', label: 'Completado' },
      { value: 'stopped', label: 'Suspendido' },
    ],
    options: [
      { code: 'metformin', label: 'Metformina' },
      { code: 'insulinGlargine', label: 'Insulina glargina' },
      { code: 'lisinopril', label: 'Lisinopril' },
      { code: 'atorvastatin', label: 'Atorvastatina' },
      { code: 'amoxicillin', label: 'Amoxicilina' },
    ],
  },
  allergy: {
    label: 'Alergia',
    addLabel: 'Agregar alergia',
    statuses: [
      { value: 'active', label: 'Activa' },
      { value: 'inactive', label: 'Inactiva' },
    ],
    options: [
      { code: 'penicillin', label: 'Penicilina' },
      { code: 'latex', label: 'Latex' },
      { code: 'peanut', label: 'Mani' },
    ],
  },
  encounter: {
    label: 'Encuentro',
    addLabel: 'Agregar encuentro',
    statuses: [
      { value: 'finished', label: 'Finalizado' },
      { value: 'in-progress', label: 'En curso' },
      { value: 'planned', label: 'Planificado' },
    ],
    options: [
      { code: 'ambulatory', label: 'Ambulatorio' },
      { code: 'emergency', label: 'Urgencia' },
      { code: 'inpatient', label: 'Hospitalizacion' },
    ],
  },
  procedure: {
    label: 'Procedimiento',
    addLabel: 'Agregar procedimiento',
    statuses: [
      { value: 'completed', label: 'Completado' },
      { value: 'in-progress', label: 'En curso' },
      { value: 'not-done', label: 'No realizado' },
    ],
    options: [
      { code: 'appendectomy', label: 'Apendicectomia' },
      { code: 'dialysis', label: 'Hemodialisis' },
      { code: 'colonoscopy', label: 'Colonoscopia' },
      { code: 'cesarean', label: 'Cesarea' },
    ],
  },
  immunization: {
    label: 'Inmunizacion',
    addLabel: 'Agregar inmunizacion',
    statuses: [
      { value: 'completed', label: 'Completada' },
      { value: 'not-done', label: 'No realizada' },
    ],
    options: [
      { code: 'influenza', label: 'Influenza' },
      { code: 'covid19', label: 'COVID-19' },
      { code: 'hepatitisB', label: 'Hepatitis B' },
    ],
  },
  serviceRequest: {
    label: 'Orden clinica',
    addLabel: 'Agregar orden',
    statuses: [
      { value: 'active', label: 'Activa' },
      { value: 'completed', label: 'Completada' },
      { value: 'draft', label: 'Borrador' },
    ],
    options: [
      { code: 'completeBloodCount', label: 'Hemograma' },
      { code: 'lipidPanel', label: 'Perfil lipidico' },
      { code: 'chestXray', label: 'Radiografia de torax' },
      { code: 'cardiologyReferral', label: 'Derivacion cardiologia' },
    ],
  },
};

const clinicalResourceTypes = Object.keys(
  clinicalResourceCatalog,
) as EditableClinicalResourceType[];

function ClinicalResourcesEditor({
  resources,
  onChange,
}: {
  resources: EditableClinicalResource[];
  onChange: (resources: EditableClinicalResource[]) => void;
}) {
  const [typeToAdd, setTypeToAdd] = useState<EditableClinicalResourceType>('condition');
  const grouped = useMemo(
    () =>
      clinicalResourceTypes.map((type) => ({
        type,
        label: clinicalResourceCatalog[type].label,
        resources: resources.filter((resource) => resource.type === type),
      })),
    [resources],
  );

  const addResource = () => {
    onChange([...resources, createClinicalResource(typeToAdd)]);
  };

  const updateResource = (resource: EditableClinicalResource) => {
    onChange(resources.map((item) => (item.id === resource.id ? resource : item)));
  };

  const removeResource = (id: string) => {
    onChange(resources.filter((resource) => resource.id !== id));
  };

  return (
    <section className="clinical-resource-editor">
      <div className="clinical-resource-editor-header">
        <div>
          <h3>Recursos clinicos del sandbox</h3>
          <p>Agrega, edita o elimina recursos FHIR controlados para probar reglas CQL.</p>
        </div>
        <div className="clinical-resource-add">
          <SelectInput
            value={typeToAdd}
            onChange={(event) => setTypeToAdd(event.target.value as EditableClinicalResourceType)}
            aria-label="Tipo de recurso"
          >
            {clinicalResourceTypes.map((type) => (
              <option key={type} value={type}>
                {clinicalResourceCatalog[type].label}
              </option>
            ))}
          </SelectInput>
          <Button onClick={addResource}>
            <Plus size={15} aria-hidden />
            Agregar
          </Button>
        </div>
      </div>
      {resources.length === 0 ? (
        <div className="state-box compact-state">Sin recursos agregados en este sandbox.</div>
      ) : null}
      {grouped.map((group) =>
        group.resources.length > 0 ? (
          <div className="clinical-resource-group" key={group.type}>
            <h4>{group.label}</h4>
            {group.resources.map((resource) => (
              <ClinicalResourceRow
                key={resource.id}
                resource={resource}
                onChange={updateResource}
                onRemove={() => removeResource(resource.id)}
              />
            ))}
          </div>
        ) : null,
      )}
    </section>
  );
}

function ClinicalResourceRow({
  resource,
  onChange,
  onRemove,
}: {
  resource: EditableClinicalResource;
  onChange: (resource: EditableClinicalResource) => void;
  onRemove: () => void;
}) {
  const config = clinicalResourceCatalog[resource.type];
  const selectedOption =
    config.options.find((option) => option.code === resource.code) ?? config.options[0];
  const switchType = (type: EditableClinicalResourceType) => {
    onChange(createClinicalResource(type, resource.id));
  };
  const updateCode = (code: string) => {
    const nextOption = config.options.find((option) => option.code === code) ?? config.options[0];
    onChange({
      ...resource,
      code,
      ...(resource.type === 'observation'
        ? { value: nextOption.defaultValue ?? 0 }
        : { value: undefined }),
    });
  };

  return (
    <article className="clinical-resource-row">
      <Field label="Tipo">
        <SelectInput
          value={resource.type}
          onChange={(event) => switchType(event.target.value as EditableClinicalResourceType)}
        >
          {clinicalResourceTypes.map((type) => (
            <option key={type} value={type}>
              {clinicalResourceCatalog[type].label}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Opcion">
        <SelectInput value={resource.code} onChange={(event) => updateCode(event.target.value)}>
          {config.options.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Estado">
        <SelectInput
          value={resource.status ?? config.statuses[0]?.value}
          onChange={(event) => onChange({ ...resource, status: event.target.value })}
        >
          {config.statuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Fecha">
        <TextInput
          type="date"
          value={resource.date ?? todayInput()}
          onChange={(event) => onChange({ ...resource, date: event.target.value })}
        />
      </Field>
      {resource.type === 'observation' ? (
        <Field label={`Valor${selectedOption?.unit ? ` (${selectedOption.unit})` : ''}`}>
          <TextInput
            type="number"
            inputMode="decimal"
            min={selectedOption?.min}
            max={selectedOption?.max}
            step={selectedOption?.step ?? 1}
            value={numericInput(resource.value ?? selectedOption?.defaultValue)}
            onChange={(event) =>
              onChange({ ...resource, value: optionalNumber(event.target.value) })
            }
          />
        </Field>
      ) : null}
      <Button variant="ghost" onClick={onRemove} className="clinical-resource-remove">
        <Trash2 size={15} aria-hidden />
        Eliminar
      </Button>
    </article>
  );
}

function createClinicalResource(
  type: EditableClinicalResourceType,
  id = `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
): EditableClinicalResource {
  const config = clinicalResourceCatalog[type];
  const option = config.options[0];
  return {
    id,
    type,
    code: option.code,
    status: config.statuses[0]?.value,
    date: todayInput(),
    ...(type === 'observation' ? { value: option.defaultValue ?? 0 } : {}),
  };
}

function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
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
