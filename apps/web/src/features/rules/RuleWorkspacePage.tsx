import Editor, { type OnMount } from '@monaco-editor/react';
import {
  AlertTriangle,
  Braces,
  Check,
  ClipboardCheck,
  Eye,
  FlaskConical,
  Save,
  Send,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRce } from '../../app/app-context';
import { Link, useRouter } from '../../app/router';
import { formatAge, severityLabel, shortId } from '../../lib/formatters';
import { useAsync } from '../../lib/use-async';
import type { ClinicalRule, Diagnostic, PatientSummary, RuleTestResult } from '../../types';
import {
  AsyncState,
  Badge,
  Button,
  Field,
  LifecycleBadge,
  Modal,
  Panel,
  SelectInput,
  SeverityBadge,
  TextArea,
  TextInput,
} from '../../components/ui/primitives';

type InspectorTab = 'metadata' | 'test' | 'elm';

export function RuleWorkspacePage({
  ruleId,
  initialTab,
}: {
  ruleId: string;
  initialTab?: InspectorTab;
}) {
  const { api, role } = useRce();
  const router = useRouter();
  const ruleState = useAsync(() => api.getRule(ruleId), [ruleId]);
  const patients = useAsync(() => api.listPatients(), []);
  const [rule, setRule] = useState<ClinicalRule | null>(null);
  const [cql, setCql] = useState('');
  const [metadata, setMetadata] = useState<ClinicalRule['metadata'] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const [elm, setElm] = useState<string | null>(null);
  const [tab, setTab] = useState<InspectorTab>(initialTab ?? 'metadata');
  const [selectedPatient, setSelectedPatient] = useState('');
  const [testResult, setTestResult] = useState<RuleTestResult | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [publishOpen, setPublishOpen] = useState(false);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = useRef<Parameters<OnMount>[1] | null>(null);

  useEffect(() => {
    if (ruleState.data) {
      setRule(ruleState.data);
      setCql(ruleState.data.cql);
      setMetadata(ruleState.data.metadata);
      setElm(null);
      setDiagnostics([]);
      setDirty(false);
    }
  }, [ruleState.data]);

  useEffect(() => {
    if (!selectedPatient && patients.data?.[0]) {
      setSelectedPatient(patients.data[0].id);
    }
  }, [patients.data, selectedPatient]);

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor?.getModel();
    if (!editor || !monaco || !model) {
      return;
    }
    monaco.editor.setModelMarkers(
      model,
      'cql',
      diagnostics.map((diagnostic) => ({
        severity:
          diagnostic.severity === 'error'
            ? monaco.MarkerSeverity.Error
            : diagnostic.severity === 'warning'
              ? monaco.MarkerSeverity.Warning
              : monaco.MarkerSeverity.Info,
        message: diagnostic.message,
        startLineNumber: diagnostic.line,
        startColumn: diagnostic.column,
        endLineNumber: diagnostic.line,
        endColumn: diagnostic.column + 1,
      })),
    );
  }, [diagnostics]);

  const canPublish =
    rule?.lifecycle === 'validated' && !dirty && (role === 'teacher' || rule.scope === 'sandbox');
  const canWriteRule = Boolean(rule && (role === 'teacher' || rule.scope === 'sandbox'));
  const expressionOptions = useMemo(
    () => extractBooleanExpressionCandidates(cql, metadata?.expression),
    [cql, metadata?.expression],
  );
  const publishScopeLabel = role === 'teacher' ? 'Compartida' : 'Mi sandbox';
  const selectedPatientSummary = useMemo(
    () => patients.data?.find((patient) => patient.id === selectedPatient),
    [patients.data, selectedPatient],
  );

  const updateCql = (value?: string) => {
    setCql(value ?? '');
    setDirty(true);
    setElm(null);
  };

  const updateMetadata = (next: ClinicalRule['metadata']) => {
    setMetadata(next);
    setDirty(true);
    setElm(null);
  };

  const save = async () => {
    if (!rule || !metadata) {
      return;
    }
    if (!canWriteRule) {
      return;
    }
    setBusy('saving');
    try {
      const saved = await api.saveRule(rule.id, cql, metadata);
      setRule(saved);
      setMetadata(saved.metadata);
      setCql(saved.cql);
      setElm(null);
      setDirty(false);
      if (saved.id !== rule.id) {
        router.navigate(`/rules/${saved.id}`, { replace: true });
      }
    } finally {
      setBusy(null);
    }
  };

  const validate = async () => {
    if (!rule) {
      return;
    }
    if (!canWriteRule) {
      return;
    }
    setBusy('validating');
    try {
      let targetRule = rule;
      let targetCql = cql;
      if (dirty && metadata) {
        const saved = await api.saveRule(rule.id, cql, metadata);
        targetRule = saved;
        targetCql = saved.cql;
        setRule(saved);
        setMetadata(saved.metadata);
        setCql(saved.cql);
        if (saved.id !== rule.id) {
          router.navigate(`/rules/${saved.id}`, { replace: true });
        }
      }
      const result = await api.validateRule(targetRule.id, targetCql);
      setDiagnostics(result.diagnostics);
      setElm(result.elm ?? null);
      if (result.valid) {
        setRule({ ...targetRule, cql: targetCql, lifecycle: 'validated' });
        setDirty(false);
        setTab('elm');
      }
    } catch (error) {
      setDiagnostics([
        {
          id: `diag-${Date.now()}`,
          severity: 'error',
          message: error instanceof Error ? error.message : 'No se pudo traducir CQL a ELM.',
          line: 1,
          column: 1,
        },
      ]);
    } finally {
      setBusy(null);
    }
  };

  const runTest = async () => {
    if (!rule) {
      return;
    }
    setBusy('testing');
    try {
      const result = await api.testRule(rule.id, selectedPatient);
      setTestResult(result);
      setTab('test');
    } finally {
      setBusy(null);
    }
  };

  const publish = async () => {
    if (!rule) {
      return;
    }
    if (!canPublish) {
      return;
    }
    setBusy('publishing');
    try {
      const next = await api.publishRule(rule.id);
      setRule(next);
      setMetadata(next.metadata);
      setCql(next.cql);
      setElm(null);
      setDirty(false);
      setPublishOpen(false);
    } finally {
      setBusy(null);
    }
  };

  const revealDiagnostic = (diagnostic: Diagnostic) => {
    editorRef.current?.revealPositionInCenter({
      lineNumber: diagnostic.line,
      column: diagnostic.column,
    });
    editorRef.current?.setPosition({ lineNumber: diagnostic.line, column: diagnostic.column });
    editorRef.current?.focus();
  };

  return (
    <section className="page rule-page">
      <AsyncState loading={ruleState.loading} error={ruleState.error}>
        {rule && metadata ? (
          <>
            <div className="rule-header">
              <div>
                <div className="breadcrumbs">
                  <Link to="/rules">Reglas CQL</Link>
                  <span>/</span>
                  <span>{rule.cqlName}</span>
                </div>
                <h1>{rule.title}</h1>
                <div className="rule-meta-line">
                  <code>{rule.cqlName}</code>
                  <span>Version automatica v{rule.version}</span>
                  <LifecycleBadge lifecycle={rule.lifecycle} />
                  {dirty ? (
                    <Badge tone="warning">Sin guardar</Badge>
                  ) : (
                    <Badge tone="success">Guardado</Badge>
                  )}
                  <Badge tone={rule.scope === 'sandbox' ? 'interactive' : 'neutral'}>
                    {rule.scope === 'sandbox' ? 'Mi sandbox' : 'Compartida'}
                  </Badge>
                </div>
              </div>
              <div className="rule-actions">
                <Button
                  onClick={save}
                  disabled={!dirty || Boolean(busy) || !canWriteRule}
                  title={
                    !canWriteRule ? 'Regla compartida de solo lectura para alumnos' : undefined
                  }
                >
                  <Save size={15} aria-hidden />
                  Guardar
                </Button>
                <Button
                  onClick={validate}
                  disabled={Boolean(busy) || !canWriteRule}
                  title={
                    !canWriteRule ? 'Regla compartida de solo lectura para alumnos' : undefined
                  }
                >
                  <Check size={15} aria-hidden />
                  Validar
                </Button>
                <Button onClick={runTest} disabled={Boolean(busy) || !selectedPatient}>
                  <FlaskConical size={15} aria-hidden />
                  Probar
                </Button>
                <Button onClick={() => setTab('elm')} disabled={!elm}>
                  <Eye size={15} aria-hidden />
                  Ver ELM
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setPublishOpen(true)}
                  disabled={!canPublish}
                  title={!canPublish ? 'Valida y guarda la regla antes de publicar' : undefined}
                >
                  <Send size={15} aria-hidden />
                  Publicar
                </Button>
              </div>
            </div>
            <div className="rule-workspace">
              <Panel className="editor-panel">
                <Editor
                  height="100%"
                  language="plaintext"
                  theme="vs"
                  value={cql}
                  onChange={updateCql}
                  onMount={(editor, monaco) => {
                    editorRef.current = editor;
                    monacoRef.current = monaco;
                  }}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    tabSize: 2,
                    ariaLabel: 'Editor de código CQL',
                    readOnly: !canWriteRule,
                  }}
                />
              </Panel>
              <Panel className="inspector-panel">
                <div className="tabs" role="tablist" aria-label="Inspector de regla">
                  <button
                    className={tab === 'metadata' ? 'is-active' : ''}
                    onClick={() => setTab('metadata')}
                    type="button"
                  >
                    Metadata
                  </button>
                  <button
                    className={tab === 'test' ? 'is-active' : ''}
                    onClick={() => setTab('test')}
                    type="button"
                  >
                    Prueba
                  </button>
                  <button
                    className={tab === 'elm' ? 'is-active' : ''}
                    onClick={() => setTab('elm')}
                    type="button"
                  >
                    ELM
                  </button>
                </div>
                {tab === 'metadata' ? (
                  <MetadataForm
                    metadata={metadata}
                    expressionOptions={expressionOptions}
                    onChange={updateMetadata}
                  />
                ) : null}
                {tab === 'test' ? (
                  <TestPanel
                    patients={patients.data ?? []}
                    selectedPatient={selectedPatient}
                    onSelectPatient={setSelectedPatient}
                    onRun={runTest}
                    result={testResult}
                    patient={selectedPatientSummary}
                    busy={busy === 'testing'}
                  />
                ) : null}
                {tab === 'elm' ? <ElmPanel elm={elm} dirty={dirty} /> : null}
              </Panel>
            </div>
            <Panel className="diagnostics-panel">
              <div className="diagnostics-header">
                <h2>Diagnósticos</h2>
                <span>{diagnostics.length}</span>
              </div>
              {diagnostics.length === 0 ? (
                <div className="diagnostic-empty">Sin diagnósticos para mostrar.</div>
              ) : (
                <div className="diagnostic-list">
                  {diagnostics.map((diagnostic) => (
                    <button
                      key={diagnostic.id}
                      className={`diagnostic-row diagnostic-${diagnostic.severity}`}
                      onClick={() => revealDiagnostic(diagnostic)}
                      type="button"
                    >
                      <AlertTriangle size={15} aria-hidden />
                      <span>{diagnostic.message}</span>
                      <code>
                        Ln {diagnostic.line}, Col {diagnostic.column}
                      </code>
                    </button>
                  ))}
                </div>
              )}
            </Panel>
            <Modal
              open={publishOpen}
              title="Publicar regla"
              onClose={() => setPublishOpen(false)}
              footer={
                <>
                  <Button onClick={() => setPublishOpen(false)}>Cancelar</Button>
                  <Button variant="primary" onClick={publish} disabled={busy === 'publishing'}>
                    Publicar
                  </Button>
                </>
              }
            >
              <dl className="confirm-list">
                <div>
                  <dt>Library</dt>
                  <dd>{metadata.name}</dd>
                </div>
                <div>
                  <dt>ELM</dt>
                  <dd>Guardado en Library</dd>
                </div>
                <div>
                  <dt>Version automatica</dt>
                  <dd>El backend asignara la siguiente version al publicar.</dd>
                </div>
                <div>
                  <dt>Alcance</dt>
                  <dd>{publishScopeLabel}</dd>
                </div>
              </dl>
            </Modal>
          </>
        ) : null}
      </AsyncState>
    </section>
  );
}

function MetadataForm({
  metadata,
  expressionOptions,
  onChange,
}: {
  metadata: ClinicalRule['metadata'];
  expressionOptions: string[];
  onChange: (metadata: ClinicalRule['metadata']) => void;
}) {
  const update = (field: keyof ClinicalRule['metadata'], value: string) =>
    onChange({ ...metadata, [field]: value });
  const options = expressionOptions.length > 0 ? expressionOptions : [metadata.expression];
  return (
    <div className="metadata-form">
      <Field label="Título">
        <TextInput
          value={metadata.title}
          onChange={(event) => update('title', event.target.value)}
        />
      </Field>
      <Field label="Nombre CQL">
        <TextInput value={metadata.name} onChange={(event) => update('name', event.target.value)} />
      </Field>
      <div className="version-readonly" aria-label="Version automatica">
        <span>Version automatica</span>
        <strong>v{metadata.version}</strong>
        <small>
          El backend la actualiza al publicar para mantener CQL, ELM y Library alineados.
        </small>
      </div>
      <Field label="Hook">
        <SelectInput value={metadata.hook} onChange={(event) => update('hook', event.target.value)}>
          <option value="patient-view">patient-view</option>
          <option value="order-select">order-select</option>
          <option value="order-sign">order-sign</option>
        </SelectInput>
      </Field>
      <Field label="Expresión booleana">
        <SelectInput
          value={metadata.expression}
          onChange={(event) => update('expression', event.target.value)}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Summary">
        <TextInput
          value={metadata.summary}
          onChange={(event) => update('summary', event.target.value)}
        />
      </Field>
      <Field label="Detail">
        <TextArea
          rows={4}
          value={metadata.detail}
          onChange={(event) => update('detail', event.target.value)}
        />
      </Field>
      <Field label="Indicator">
        <SelectInput
          value={metadata.indicator}
          onChange={(event) => update('indicator', event.target.value)}
        >
          <option value="info">info</option>
          <option value="warning">warning</option>
          <option value="critical">critical</option>
        </SelectInput>
      </Field>
    </div>
  );
}

function TestPanel({
  patients,
  selectedPatient,
  onSelectPatient,
  onRun,
  result,
  patient,
  busy,
}: {
  patients: PatientSummary[];
  selectedPatient: string;
  onSelectPatient: (id: string) => void;
  onRun: () => void;
  result: RuleTestResult | null;
  patient?: PatientSummary;
  busy: boolean;
}) {
  return (
    <div className="test-panel">
      <Field label="Paciente">
        <SelectInput
          value={selectedPatient}
          onChange={(event) => onSelectPatient(event.target.value)}
        >
          {patients.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name} · {formatAge(candidate.age)} · FHIR{' '}
              {shortId(candidate.synId || candidate.id)}
            </option>
          ))}
        </SelectInput>
      </Field>
      {patient ? (
        <div className="patient-mini">
          <strong>{patient.name}</strong>
          <span>
            {formatAge(patient.age)} · {patient.cohort}
          </span>
          <span className="technical-id" title={`Patient/${patient.id}`}>
            FHIR {shortId(patient.synId || patient.id)}
          </span>
          <SeverityBadge severity={patient.cdsStatus} />
        </div>
      ) : null}
      <Button variant="primary" onClick={onRun} disabled={busy}>
        <ClipboardCheck size={15} aria-hidden />
        Ejecutar prueba
      </Button>
      {result ? (
        <div className="test-result">
          <Badge tone={result.applies ? 'warning' : 'success'}>
            {result.applies ? 'Aplica' : 'No aplica'}
          </Badge>
          <dl>
            <div>
              <dt>Datos HL7 FHIR usados</dt>
              <dd>{result.consideredResources.join(', ') || 'Sin recursos'}</dd>
            </div>
          </dl>
          {result.cards.map((card) => (
            <article className={`cds-card cds-${card.severity}`} key={card.id}>
              <SeverityBadge severity={card.severity} />
              <h3>{card.summary}</h3>
              <p>{card.detail}</p>
            </article>
          ))}
          {result.warnings.length > 0 ? (
            <ul className="warnings">
              {result.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ElmPanel({ elm, dirty }: { elm: string | null; dirty: boolean }) {
  if (dirty) {
    return <div className="state-box">ELM obsoleto por cambios sin validar.</div>;
  }
  if (!elm) {
    return <div className="state-box">Valida la regla para consultar ELM.</div>;
  }
  return (
    <div className="elm-ready">
      <div className="state-box success-state">
        ELM validado. La regla esta lista para publicar.
      </div>
      <div className="elm-json-viewer">
        <Editor
          height="100%"
          language="json"
          theme="vs"
          value={elm}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 12,
            lineNumbers: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            ariaLabel: 'ELM JSON de solo lectura',
          }}
        />
      </div>
    </div>
  );
}

function extractBooleanExpressionCandidates(cqlText: string, currentExpression?: string): string[] {
  const candidates = new Set<string>();
  const definePattern = /^\s*define\s+(?:"([^"]+)"|([A-Za-z][A-Za-z0-9_]*))\s*:/gm;
  let match: RegExpExecArray | null;
  while ((match = definePattern.exec(cqlText)) !== null) {
    const name = match[1] ?? match[2];
    if (name) {
      candidates.add(name);
    }
  }
  if (currentExpression) {
    candidates.add(currentExpression);
  }
  return [...candidates];
}
