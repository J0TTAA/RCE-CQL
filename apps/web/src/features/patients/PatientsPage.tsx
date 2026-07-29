import { ChevronRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useRce } from '../../app/app-context';
import { Link } from '../../app/router';
import { formatAge, formatDate, shortId } from '../../lib/formatters';
import { useAsync } from '../../lib/use-async';
import type { Cohort, PatientSummary } from '../../types';
import {
  AsyncState,
  Badge,
  SelectInput,
  SeverityBadge,
  TextInput,
} from '../../components/ui/primitives';

const cohorts: Array<Cohort | 'all'> = [
  'all',
  'niños',
  'adolescentes',
  'adultos',
  'adultos mayores',
  'sin edad',
];

export function PatientsPage() {
  const { api } = useRce();
  const [query, setQuery] = useState('');
  const [cohort, setCohort] = useState<Cohort | 'all'>('all');
  const [alertState, setAlertState] = useState<'all' | 'with-alerts' | 'without-alerts'>('all');
  const filters = useMemo(() => ({ query, cohort, alertState }), [alertState, cohort, query]);
  const patients = useAsync(() => api.listPatients(filters), [filters]);

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>Pacientes</h1>
          <p>Datos sintéticos</p>
        </div>
      </div>

      <div className="toolbar">
        <label className="search-field">
          <Search size={16} aria-hidden />
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nombre o SYN"
            aria-label="Buscar paciente"
          />
        </label>
        <SelectInput
          value={cohort}
          onChange={(event) => setCohort(event.target.value as Cohort | 'all')}
          aria-label="Filtrar cohorte"
        >
          {cohorts.map((item) => (
            <option key={item} value={item}>
              {item === 'all' ? 'Todas las cohortes' : item}
            </option>
          ))}
        </SelectInput>
        <SelectInput
          value={alertState}
          onChange={(event) => setAlertState(event.target.value as typeof alertState)}
          aria-label="Filtrar alertas"
        >
          <option value="all">Todas las alertas</option>
          <option value="with-alerts">Con alertas</option>
          <option value="without-alerts">Sin alertas</option>
        </SelectInput>
        <span className="toolbar-count">{patients.data?.length ?? 0} pacientes</span>
      </div>

      <AsyncState
        loading={patients.loading}
        error={patients.error}
        empty={patients.data?.length === 0}
      >
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Edad</th>
                <th>Sexo</th>
                <th>Condiciones activas</th>
                <th>Último encuentro</th>
                <th>CDS</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {patients.data?.map((patient) => (
                <PatientRow key={patient.id} patient={patient} />
              ))}
            </tbody>
          </table>
        </div>
      </AsyncState>
    </section>
  );
}

function PatientRow({ patient }: { patient: PatientSummary }) {
  const technicalId = patient.synId || patient.id;
  return (
    <tr>
      <td>
        <Link to={`/patients/${patient.id}`} className="table-primary-link">
          <strong>{patient.name}</strong>
          <span title={`Patient/${patient.id}`}>FHIR {shortId(technicalId)}</span>
        </Link>
      </td>
      <td>
        {formatAge(patient.age)}
        <span className="cell-muted">{patient.cohort}</span>
      </td>
      <td>{patient.sex}</td>
      <td>
        <div
          className="condition-list"
          title={patient.activeConditions.join(', ') || 'Sin condiciones activas'}
        >
          {patient.activeConditions.slice(0, 2).map((condition) => (
            <Badge key={condition}>{condition}</Badge>
          ))}
          {patient.activeConditions.length === 0 ? (
            <span className="muted">Sin condiciones</span>
          ) : null}
          {patient.sandboxTouched ? <Badge tone="interactive">Mi sandbox</Badge> : null}
        </div>
      </td>
      <td>{formatDate(patient.lastEncounter)}</td>
      <td>
        <SeverityBadge severity={patient.cdsStatus} />
      </td>
      <td className="row-action">
        <Link
          to={`/patients/${patient.id}`}
          className="icon-link"
          ariaLabel={`Abrir ${patient.name}`}
        >
          <ChevronRight size={16} aria-hidden />
        </Link>
      </td>
    </tr>
  );
}
