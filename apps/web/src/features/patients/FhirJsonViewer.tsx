import { ChevronRight, RotateCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRce } from '../../app/app-context';
import { Badge, Button, Field, SelectInput } from '../../components/ui/primitives';
import type { FhirJsonResource } from '../../types';

export function FhirJsonViewer({
  patientId,
  active,
  revision,
}: {
  patientId: string;
  active: boolean;
  revision: number;
}) {
  const { api } = useRce();
  const [snapshot, setSnapshot] = useState<{
    revision: number;
    resources: FhirJsonResource[];
  } | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resources = snapshot?.revision === revision ? snapshot.resources : null;

  useEffect(() => {
    if (!active || resources) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getPatientFhirResources(patientId)
      .then((result) => {
        if (!cancelled) setSnapshot({ revision, resources: result });
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los recursos.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, api, patientId, resources, retry, revision]);

  const types = useMemo(
    () => [...new Set((resources ?? []).map((resource) => resource.resourceType))].sort(),
    [resources],
  );
  const visibleResources = (resources ?? []).filter(
    (resource) => typeFilter === 'all' || resource.resourceType === typeFilter,
  );

  return (
    <section className="fhir-json-viewer" aria-label="Recursos FHIR JSON">
      <div className="fhir-json-toolbar">
        <div className="fhir-json-title">
          <h2>FHIR JSON</h2>
          <Badge tone="interactive">Vista efectiva</Badge>
          {resources ? (
            <span className="fhir-json-count">
              {visibleResources.length} {visibleResources.length === 1 ? 'recurso' : 'recursos'}
            </span>
          ) : null}
        </div>
        <Field label="Tipo de recurso">
          <SelectInput value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">Todos</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>
      {loading || (!resources && !error) ? (
        <p className="state-box" role="status">
          Cargando recursos FHIR...
        </p>
      ) : null}
      {error ? (
        <div className="state-box state-error" role="alert">
          {error}
          <Button type="button" onClick={() => setRetry((value) => value + 1)}>
            <RotateCw size={15} aria-hidden />
            Reintentar
          </Button>
        </div>
      ) : null}
      {resources && !visibleResources.length ? <p>Sin recursos para este filtro.</p> : null}
      {visibleResources.length ? (
        <div className="fhir-json-list">
          {visibleResources.map((resource, index) => (
            <FhirJsonItem
              key={`${resource.resourceType}/${resource.id ?? index}`}
              resource={resource}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function FhirJsonItem({ resource }: { resource: FhirJsonResource }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="fhir-json-item" open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>
        <ChevronRight className="fhir-json-chevron" size={16} aria-hidden />
        <strong>{resource.resourceType}</strong>
        <code>{resource.id ?? 'Sin ID'}</code>
      </summary>
      {open ? (
        <pre>
          <code>{JSON.stringify(resource, null, 2)}</code>
        </pre>
      ) : null}
    </details>
  );
}
