import { FilePlus2, MoreHorizontal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRce } from '../../app/app-context';
import { Link, useRouter } from '../../app/router';
import { lifecycleLabel } from '../../lib/formatters';
import { useAsync } from '../../lib/use-async';
import type { Lifecycle, RuleHook } from '../../types';
import {
  AsyncState,
  Badge,
  Button,
  IconButton,
  LifecycleBadge,
  SelectInput,
  TextInput,
} from '../../components/ui/primitives';

export function RulesPage({ createMode = false }: { createMode?: boolean }) {
  const router = useRouter();
  const { api, role } = useRce();
  const [query, setQuery] = useState('');
  const [lifecycle, setLifecycle] = useState<Lifecycle | 'all'>('all');
  const [hook, setHook] = useState<RuleHook | 'all'>('all');
  const [activation, setActivation] = useState<'all' | 'active' | 'inactive'>('all');
  const filters = useMemo(
    () => ({ query, lifecycle, hook, activation }),
    [activation, hook, lifecycle, query],
  );
  const rules = useAsync(() => api.listRules(filters), [filters, role]);

  useEffect(() => {
    if (createMode) {
      router.navigate('/rules/rule-adult-risk', { replace: true });
    }
  }, [createMode, router]);

  if (createMode) {
    return null;
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>Reglas CQL</h1>
          <p>Catálogo de reglas</p>
        </div>
        <Button variant="primary" onClick={() => router.navigate('/rules/rule-adult-risk')}>
          <FilePlus2 size={16} aria-hidden />
          Nueva regla
        </Button>
      </div>

      <div className="toolbar">
        <TextInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar regla"
          aria-label="Buscar regla"
        />
        <SelectInput
          value={lifecycle}
          onChange={(event) => setLifecycle(event.target.value as Lifecycle | 'all')}
          aria-label="Filtrar lifecycle"
        >
          <option value="all">Todos los estados</option>
          {(['draft', 'validated', 'published', 'disabled', 'retired'] as Lifecycle[]).map(
            (item) => (
              <option key={item} value={item}>
                {lifecycleLabel(item)}
              </option>
            ),
          )}
        </SelectInput>
        <SelectInput
          value={hook}
          onChange={(event) => setHook(event.target.value as RuleHook | 'all')}
          aria-label="Filtrar hook"
        >
          <option value="all">Todos los hooks</option>
          <option value="patient-view">patient-view</option>
          <option value="order-select">order-select</option>
          <option value="order-sign">order-sign</option>
        </SelectInput>
        <SelectInput
          value={activation}
          onChange={(event) => setActivation(event.target.value as typeof activation)}
          aria-label="Filtrar activación"
        >
          <option value="all">Todas</option>
          <option value="active">Activas</option>
          <option value="inactive">Inactivas</option>
        </SelectInput>
        <span className="toolbar-count">{rules.data?.length ?? 0} reglas</span>
      </div>

      <AsyncState loading={rules.loading} error={rules.error} empty={rules.data?.length === 0}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Regla</th>
                <th>Versión</th>
                <th>Estado</th>
                <th>Hook</th>
                <th>Activación</th>
                <th>Alcance</th>
                <th>Modificada</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {rules.data?.map((rule) => (
                <tr key={rule.id}>
                  <td>
                    <Link to={`/rules/${rule.id}`} className="table-primary-link">
                      <strong>{rule.title}</strong>
                      <span>{rule.cqlName}</span>
                    </Link>
                  </td>
                  <td>{rule.version}</td>
                  <td>
                    <LifecycleBadge lifecycle={rule.lifecycle} />
                  </td>
                  <td>
                    <code>{rule.hook}</code>
                  </td>
                  <td>{rule.activation ? 'Activa' : 'Inactiva'}</td>
                  <td>
                    <Badge tone={rule.scope === 'sandbox' ? 'interactive' : 'neutral'}>
                      {rule.scope === 'sandbox' ? 'Mi sandbox' : 'Compartida'}
                    </Badge>
                  </td>
                  <td>{rule.modified}</td>
                  <td className="row-action">
                    <IconButton label={`Acciones de ${rule.title}`}>
                      <MoreHorizontal size={16} />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AsyncState>
    </section>
  );
}
