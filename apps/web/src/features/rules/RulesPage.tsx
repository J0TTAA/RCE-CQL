import {
  Archive,
  Copy,
  FilePenLine,
  FilePlus2,
  FlaskConical,
  MoreHorizontal,
  Power,
  PowerOff,
  RotateCw,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import './rule-templates.css';
import { useRce } from '../../app/app-context';
import { Link, useRouter } from '../../app/router';
import { lifecycleLabel } from '../../lib/formatters';
import { useAsync } from '../../lib/use-async';
import type { ClinicalRule, Lifecycle, Role, RuleHook, RuleTemplate } from '../../types';
import {
  AsyncState,
  Badge,
  Button,
  IconButton,
  LifecycleBadge,
  Modal,
  SelectInput,
  TextInput,
  Field,
} from '../../components/ui/primitives';

export function RulesPage({ createMode = false }: { createMode?: boolean }) {
  const router = useRouter();
  const { api, role } = useRce();
  const creationPending = useRef(false);
  const [creating, setCreating] = useState(false);
  const [templateId, setTemplateId] = useState('blank');
  const [createError, setCreateError] = useState('');
  const templates = useAsync(() => api.getRuleTemplates(), [api]);
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

  useEffect(() => {
    if (createMode) {
      setTemplateId('blank');
      setCreateError('');
    }
  }, [createMode]);

  const closeCreation = () => {
    if (!creationPending.current) {
      router.navigate('/rules', { replace: true });
    }
  };

  const toggleActivation = async (rule: ClinicalRule) => {
    setActivationBusy(rule.id);
    try {
      await api.setRuleActivation(rule.id, !rule.activation);
      rules.reload();
    } finally {
      setActivationBusy(null);
    }
  };

  const createRule = async () => {
    const template = templates.data?.find((item) => item.id === templateId);
    if (template && !templates.loading && !templates.error && !creationPending.current) {
      const name = `Regla${Date.now().toString()}`;
      creationPending.current = true;
      setCreating(true);
      setCreateError('');
      try {
        const rule = await api.createRule(template.cql, {
          title: template.id === 'blank' ? 'Nueva regla CQL' : template.label,
          name,
          version: '0.1.0',
          hook: template.hook,
          expression: 'Aplica',
          summary: template.summary,
          detail: template.detail,
          indicator: 'info',
        });
        router.navigate(`/rules/${rule.id}`, { replace: true });
      } catch (error) {
        setCreateError(error instanceof Error ? error.message : 'No se pudo crear la regla.');
      } finally {
        creationPending.current = false;
        setCreating(false);
      }
    }
  };

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
                <th>Version automatica</th>
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
                      {canToggleRuleActivation(role, rule) ? (
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
      {createMode ? (
        <RuleCreationDialog
          templates={templates.data ?? []}
          templateId={templateId}
          loading={templates.loading}
          creating={creating}
          error={createError || templates.error}
          canCreate={
            !creating &&
            !templates.loading &&
            !templates.error &&
            Boolean(templates.data?.some((item) => item.id === templateId))
          }
          onSelect={setTemplateId}
          onClose={closeCreation}
          onCreate={() => void createRule()}
          onReload={templates.error ? templates.reload : undefined}
        />
      ) : null}
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

function RuleCreationDialog({
  templates,
  templateId,
  loading,
  creating,
  error,
  canCreate,
  onSelect,
  onClose,
  onCreate,
  onReload,
}: {
  templates: RuleTemplate[];
  templateId: string;
  loading: boolean;
  creating: boolean;
  error: string | null;
  canCreate: boolean;
  onSelect: (id: string) => void;
  onClose: () => void;
  onCreate: () => void;
  onReload?: () => void;
}) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    container.current?.querySelector<HTMLElement>('button')?.focus();
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, []);

  useEffect(() => {
    if (!loading) {
      container.current?.querySelector<HTMLSelectElement>('select:not(:disabled)')?.focus();
    }
  }, [loading]);

  return (
    <div
      ref={container}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
        } else if (event.key === 'Tab') {
          const controls = container.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), select:not(:disabled)',
          );
          const first = controls?.[0];
          const last = controls?.[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <Modal
        open
        title="Nueva regla CQL"
        onClose={onClose}
        footer={
          <>
            <Button type="button" onClick={onClose} disabled={creating}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" form="rule-creation-form" disabled={!canCreate}>
              <FilePlus2 size={16} aria-hidden />
              {creating ? 'Creando regla...' : 'Crear regla'}
            </Button>
          </>
        }
      >
        <form
          id="rule-creation-form"
          className="rule-template-picker"
          aria-busy={loading || creating}
          onSubmit={(event) => {
            event.preventDefault();
            if (canCreate) onCreate();
          }}
        >
          <Field label="Punto de partida">
            <SelectInput
              value={templateId}
              disabled={creating || loading || Boolean(onReload)}
              onChange={(event) => onSelect(event.target.value)}
            >
              {loading ? <option value={templateId}>Cargando...</option> : null}
              {templates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </SelectInput>
          </Field>
          {error ? (
            <p className="state-error" role="alert">
              {error}
            </p>
          ) : null}
          {onReload ? (
            <Button type="button" onClick={onReload} disabled={loading}>
              <RotateCw size={16} aria-hidden />
              Reintentar
            </Button>
          ) : null}
        </form>
      </Modal>
    </div>
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
  const canToggleActivation = canToggleRuleActivation(role, rule);
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
              !canToggleActivation
                ? 'Disponible para reglas publicadas de tu sandbox o compartidas docentes'
                : undefined
            }
          >
            <ActivationIcon size={16} aria-hidden />
            <span>
              <strong>{activationLabel}</strong>
              <small>Controla si participa en las cards CDS.</small>
            </span>
          </button>
          <button type="button" disabled title="El backend calcula la version al publicar">
            <Copy size={16} aria-hidden />
            <span>
              <strong>Version automatica</strong>
              <small>Se calcula al publicar, no se escribe a mano.</small>
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

function canToggleRuleActivation(role: Role, rule: ClinicalRule): boolean {
  return rule.lifecycle === 'published' && (role === 'teacher' || rule.scope === 'sandbox');
}
