import {
  Archive,
  Copy,
  FilePenLine,
  FilePlus2,
  FlaskConical,
  MoreHorizontal,
  Power,
  PowerOff,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRce } from '../../app/app-context';
import { Link, useRouter } from '../../app/router';
import { lifecycleLabel } from '../../lib/formatters';
import { useAsync } from '../../lib/use-async';
import type { ClinicalRule, Lifecycle, Role, RuleHook } from '../../types';
import {
  AsyncState,
  Badge,
  Button,
  IconButton,
  LifecycleBadge,
  Modal,
  SelectInput,
  TextInput,
} from '../../components/ui/primitives';

export function RulesPage({ createMode = false }: { createMode?: boolean }) {
  const router = useRouter();
  const { api, role } = useRce();
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [lifecycle, setLifecycle] = useState<Lifecycle | 'all'>('all');
  const [hook, setHook] = useState<RuleHook | 'all'>('all');
  const [activation, setActivation] = useState<'all' | 'active' | 'inactive'>('all');
  const [activationBusy, setActivationBusy] = useState<string | null>(null);
  const [actionRule, setActionRule] = useState<ClinicalRule | null>(null);
  const filters = useMemo(
    () => ({ query, lifecycle, hook, activation }),
    [activation, hook, lifecycle, query],
  );
  const rules = useAsync(() => api.listRules(filters), [filters, role]);

  const toggleActivation = async (rule: ClinicalRule) => {
    setActivationBusy(rule.id);
    try {
      await api.setRuleActivation(rule.id, !rule.activation);
      rules.reload();
    } finally {
      setActivationBusy(null);
    }
  };

  useEffect(() => {
    if (createMode) {
      const name = `AgeRule${Date.now().toString().slice(-6)}`;
      setCreating(true);
      api
        .createRule(defaultCql(name), {
          title: 'Nueva regla por edad',
          name,
          version: '0.1.0',
          hook: 'patient-view',
          expression: 'Aplica',
          summary: 'Paciente cumple criterio de edad',
          detail: 'La regla CQL evaluada indica que el paciente cumple el criterio configurado.',
          indicator: 'info',
        })
        .then((rule) => router.navigate(`/rules/${rule.id}`, { replace: true }))
        .finally(() => setCreating(false));
    }
  }, [api, createMode, router]);

  if (createMode) {
    return (
      <section className="page">
        <div className="state-box">
          {creating ? 'Creando regla en HAPI...' : 'Preparando regla...'}
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h1>Reglas CQL</h1>
          <p>Catálogo de reglas</p>
        </div>
        <Button variant="primary" onClick={() => router.navigate('/rules/new')}>
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
                  <td>
                    <div className="activation-cell">
                      <Badge tone={rule.activation ? 'success' : 'neutral'}>
                        {rule.activation ? 'Activa' : 'Inactiva'}
                      </Badge>
                      {role === 'teacher' && rule.lifecycle === 'published' ? (
                        <Button
                          variant="ghost"
                          onClick={() => toggleActivation(rule)}
                          disabled={activationBusy === rule.id}
                        >
                          {rule.activation ? 'Desactivar' : 'Activar'}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <Badge tone={rule.scope === 'sandbox' ? 'interactive' : 'neutral'}>
                      {rule.scope === 'sandbox' ? 'Mi sandbox' : 'Compartida'}
                    </Badge>
                  </td>
                  <td>{rule.modified}</td>
                  <td className="row-action">
                    <IconButton
                      label={`Acciones de ${rule.title}`}
                      onClick={() => setActionRule(rule)}
                    >
                      <MoreHorizontal size={16} />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AsyncState>
      <RuleActionsDialog
        rule={actionRule}
        role={role}
        busy={actionRule ? activationBusy === actionRule.id : false}
        onClose={() => setActionRule(null)}
        onOpenEditor={(rule) => {
          setActionRule(null);
          router.navigate(`/rules/${rule.id}`);
        }}
        onOpenTest={(rule) => {
          setActionRule(null);
          router.navigate(`/rules/${rule.id}/test`);
        }}
        onToggleActivation={async (rule) => {
          await toggleActivation(rule);
          setActionRule(null);
        }}
      />
    </section>
  );
}

function RuleActionsDialog({
  rule,
  role,
  busy,
  onClose,
  onOpenEditor,
  onOpenTest,
  onToggleActivation,
}: {
  rule: ClinicalRule | null;
  role: Role;
  busy: boolean;
  onClose: () => void;
  onOpenEditor: (rule: ClinicalRule) => void;
  onOpenTest: (rule: ClinicalRule) => void;
  onToggleActivation: (rule: ClinicalRule) => Promise<void>;
}) {
  if (!rule) {
    return null;
  }
  const canToggleActivation = role === 'teacher' && rule.lifecycle === 'published';
  const activationLabel = rule.activation ? 'Desactivar regla' : 'Activar regla';
  const ActivationIcon = rule.activation ? PowerOff : Power;

  return (
    <Modal open={Boolean(rule)} title="Acciones de regla" onClose={onClose}>
      <div className="rule-action-dialog">
        <div className="rule-action-summary">
          <strong>{rule.title}</strong>
          <span>
            {rule.cqlName} v{rule.version}
          </span>
          <div className="rule-action-badges">
            <LifecycleBadge lifecycle={rule.lifecycle} />
            <Badge tone={rule.activation ? 'success' : 'neutral'}>
              {rule.activation ? 'Activa' : 'Inactiva'}
            </Badge>
          </div>
        </div>

        <div className="rule-action-list" role="list">
          <button type="button" onClick={() => onOpenEditor(rule)}>
            <FilePenLine size={16} aria-hidden />
            <span>
              <strong>Abrir editor</strong>
              <small>Editar CQL, metadata, validar y publicar.</small>
            </span>
          </button>
          <button type="button" onClick={() => onOpenTest(rule)}>
            <FlaskConical size={16} aria-hidden />
            <span>
              <strong>Probar con paciente</strong>
              <small>Abrir el panel de prueba de esta regla.</small>
            </span>
          </button>
          <button
            type="button"
            onClick={() => onToggleActivation(rule)}
            disabled={!canToggleActivation || busy}
            title={
              !canToggleActivation ? 'Disponible solo para docentes con reglas publicadas' : undefined
            }
          >
            <ActivationIcon size={16} aria-hidden />
            <span>
              <strong>{activationLabel}</strong>
              <small>Controla si participa en las cards CDS.</small>
            </span>
          </button>
          <button type="button" disabled title="Pendiente de endpoint backend">
            <Copy size={16} aria-hidden />
            <span>
              <strong>Duplicar version</strong>
              <small>Pendiente para una siguiente iteracion.</small>
            </span>
          </button>
          <button type="button" disabled title="Pendiente de endpoint backend">
            <Archive size={16} aria-hidden />
            <span>
              <strong>Retirar regla</strong>
              <small>Pendiente hasta implementar lifecycle retired.</small>
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}

function defaultCql(name: string): string {
  return `library ${name} version '0.1.0'

using FHIR version '4.0.1'

context Patient

define "Aplica":
  AgeInYears() >= 18
`;
}
