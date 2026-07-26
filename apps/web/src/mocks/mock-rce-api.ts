import type {
  RceUiApi,
  ObservationUpdateInput,
  PatientFilters,
  RuleFilters,
  ActivityFilters,
} from '../lib/rce-api';
import { RceApiError } from '../lib/rce-api';
import type {
  ActivityEntry,
  ApiScenario,
  ClinicalRule,
  CdsCard,
  PatientDetail,
  PatientSummary,
  RuleTestResult,
  ServicesStatus,
  SessionContext,
  ValidationResult,
} from '../types';
import {
  activityFixtures,
  adultRiskElm,
  invalidValidationResult,
  patientCardsFixture,
  patientsFixture,
  postUpdateCardsFixture,
  ruleFixtures,
  testResultFixtures,
  validValidationResult,
} from './fixtures';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

const sessionLabels = ['S-A4F9', 'S-B8C2', 'S-D317', 'S-F042'];

class MockRceUiApiImpl implements RceUiApi {
  private scenario: ApiScenario = 'normal';
  private sessionCounter = 0;
  private session: SessionContext = this.createSession();
  private patients: PatientDetail[] = clone(patientsFixture);
  private cards: Record<string, CdsCard[]> = clone(patientCardsFixture);
  private rules: ClinicalRule[] = clone(ruleFixtures);
  private activity: ActivityEntry[] = clone(activityFixtures);
  private elmReady = new Set<string>(['rule-adult-risk']);
  private invalidRuleIds = new Set<string>(['rule-draft-invalid']);

  private createSession(role: SessionContext['role'] = 'student'): SessionContext {
    const label = sessionLabels[this.sessionCounter % sessionLabels.length];
    this.sessionCounter += 1;
    return {
      anonymousSessionId: `anon-${label.toLowerCase()}`,
      classroomId: 'demo-aula',
      sandboxId: `sandbox-${label.toLowerCase()}`,
      sandboxLabel: label,
      role,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString(),
    };
  }

  private resetState(): void {
    this.patients = clone(patientsFixture);
    this.cards = clone(patientCardsFixture);
    this.rules = clone(ruleFixtures);
    this.activity = [];
    this.elmReady = new Set<string>(['rule-adult-risk']);
  }

  private ensureHapi(): void {
    if (this.scenario === 'hapi-down') {
      throw new RceApiError('degraded', 'El servidor HAPI FHIR no está disponible.');
    }
  }

  private ensureTranslator(): void {
    if (this.scenario === 'translator-down') {
      throw new RceApiError('degraded', 'El traductor CQL no está disponible.');
    }
  }

  async getSession(): Promise<SessionContext> {
    await delay(120);
    return clone(this.session);
  }

  async setRole(role: SessionContext['role']): Promise<SessionContext> {
    await delay(80);
    this.session = { ...this.session, role };
    return clone(this.session);
  }

  async resetSandbox(): Promise<SessionContext> {
    await delay(280);
    this.session = this.createSession(this.session.role);
    this.resetState();
    return clone(this.session);
  }

  getScenario(): ApiScenario {
    return this.scenario;
  }

  setScenario(scenario: ApiScenario): void {
    this.scenario = scenario;
  }

  async getServicesStatus(): Promise<ServicesStatus> {
    await delay(120);
    return {
      api: 'up',
      hapi: this.scenario === 'hapi-down' ? 'down' : 'up',
      translator: this.scenario === 'translator-down' ? 'down' : 'up',
    };
  }

  async listPatients(filters?: PatientFilters): Promise<PatientSummary[]> {
    await delay(260);
    this.ensureHapi();
    let result = this.patients.map(
      ({ conditions, observations, medications, encounters, timeline, birthDate, ...summary }) =>
        summary,
    );
    const query = filters?.query?.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (patient) =>
          patient.name.toLowerCase().includes(query) || patient.synId.toLowerCase().includes(query),
      );
    }
    if (filters?.cohort && filters.cohort !== 'all') {
      result = result.filter((patient) => patient.cohort === filters.cohort);
    }
    if (filters?.alertState === 'with-alerts') {
      result = result.filter((patient) => patient.cdsStatus !== 'none');
    }
    if (filters?.alertState === 'without-alerts') {
      result = result.filter((patient) => patient.cdsStatus === 'none');
    }
    return clone(result);
  }

  async getPatient(id: string): Promise<PatientDetail> {
    await delay(260);
    this.ensureHapi();
    const patient = this.patients.find((candidate) => candidate.id === id);
    if (!patient) {
      throw new RceApiError('not-found', 'Paciente sintético no encontrado.');
    }
    return clone(patient);
  }

  async getPatientCards(id: string): Promise<CdsCard[]> {
    await delay(220);
    this.ensureHapi();
    this.ensureTranslator();
    return clone(this.cards[id] ?? []);
  }

  async updateObservation(input: ObservationUpdateInput) {
    await delay(680);
    this.ensureHapi();
    const patient = this.patients.find((candidate) => candidate.id === input.patientId);
    if (!patient) {
      throw new RceApiError('not-found', 'Paciente sintético no encontrado.');
    }
    const observation = patient.observations.find(
      (candidate) => candidate.id === input.observationId,
    );
    if (observation) {
      observation.value = input.value;
      observation.unit = input.unit;
      observation.interpretation = input.interpretation;
      observation.effectiveDate = new Date().toISOString().slice(0, 10);
      patient.sandboxTouched = true;
      patient.timeline = [
        {
          id: `t-${Date.now()}`,
          date: observation.effectiveDate,
          kind: 'observación',
          label: `${observation.display} ${input.value} ${input.unit}`,
        },
        ...patient.timeline,
      ];
    }
    const updatedCards = clone(
      postUpdateCardsFixture[input.patientId] ?? this.cards[input.patientId] ?? [],
    );
    this.cards[input.patientId] = updatedCards;
    patient.cdsCount = updatedCards.length;
    patient.cdsStatus = updatedCards[0]?.severity ?? 'none';

    const activity: ActivityEntry = {
      id: `act-${Date.now()}`,
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      patientId: patient.id,
      patientName: `${patient.name} · ${patient.synId}`,
      hook: 'patient-view',
      rules: ['AdultRiskAssessment 0.1.0'],
      cardsCount: updatedCards.length,
      durationMs: 146,
      result: updatedCards.length > 0 ? 'success' : 'no-aplica',
      correlationId: `corr-${this.session.sandboxLabel.toLowerCase()}-${patient.synId.slice(-4)}`,
      maxSeverity: updatedCards[0]?.severity ?? 'none',
      cards: updatedCards,
      consideredResources: [`Patient/${patient.synId}`, `Observation/${input.observationId}`],
      warnings: [],
      scope: 'sandbox',
    };
    this.activity = [activity, ...this.activity];
    return { patient: clone(patient), cards: clone(updatedCards), activity: clone(activity) };
  }

  async listRules(filters?: RuleFilters): Promise<ClinicalRule[]> {
    await delay(260);
    let result = [...this.rules];
    const query = filters?.query?.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (rule) =>
          rule.title.toLowerCase().includes(query) || rule.cqlName.toLowerCase().includes(query),
      );
    }
    if (filters?.lifecycle && filters.lifecycle !== 'all') {
      result = result.filter((rule) => rule.lifecycle === filters.lifecycle);
    }
    if (filters?.hook && filters.hook !== 'all') {
      result = result.filter((rule) => rule.hook === filters.hook);
    }
    if (filters?.activation === 'active') {
      result = result.filter((rule) => rule.activation);
    }
    if (filters?.activation === 'inactive') {
      result = result.filter((rule) => !rule.activation);
    }
    return clone(result);
  }

  async getRule(id: string): Promise<ClinicalRule> {
    await delay(240);
    const rule = this.rules.find((candidate) => candidate.id === id);
    if (!rule) {
      throw new RceApiError('not-found', 'Regla CQL no encontrada.');
    }
    return clone(rule);
  }

  async saveRule(
    id: string,
    cql: string,
    metadata: ClinicalRule['metadata'],
  ): Promise<ClinicalRule> {
    await delay(340);
    const rule = this.rules.find((candidate) => candidate.id === id);
    if (!rule) {
      throw new RceApiError('not-found', 'Regla CQL no encontrada.');
    }
    rule.cql = cql;
    rule.metadata = metadata;
    rule.title = metadata.title;
    rule.cqlName = metadata.name;
    rule.version = metadata.version;
    rule.hook = metadata.hook;
    rule.modified = new Date().toISOString().slice(0, 10);
    rule.scope = 'sandbox';
    this.elmReady.delete(id);
    return clone(rule);
  }

  async validateRule(id: string, cql: string): Promise<ValidationResult> {
    await delay(520);
    this.ensureTranslator();
    const rule = this.rules.find((candidate) => candidate.id === id);
    if (rule) {
      rule.cql = cql;
    }
    if (this.invalidRuleIds.has(id)) {
      this.elmReady.delete(id);
      return clone(invalidValidationResult);
    }
    this.elmReady.add(id);
    return {
      ...clone(validValidationResult),
      elm: id === 'rule-adult-risk' ? adultRiskElm : undefined,
    };
  }

  async getElm(id: string): Promise<string> {
    await delay(260);
    this.ensureTranslator();
    if (!this.elmReady.has(id)) {
      throw new RceApiError('error', 'El ELM no está disponible. Valida la regla primero.');
    }
    return id === 'rule-adult-risk'
      ? adultRiskElm
      : JSON.stringify({ library: { identifier: { id, version: '0.0.0' } } }, null, 2);
  }

  async testRule(ruleId: string, patientId: string): Promise<RuleTestResult> {
    await delay(580);
    this.ensureHapi();
    this.ensureTranslator();
    return clone(
      testResultFixtures[ruleId]?.[patientId] ?? {
        applies: false,
        cards: [],
        consideredResources: [],
        warnings: ['No hay fixture de prueba para esta combinación regla/paciente.'],
        correlationId: `corr-${patientId.slice(-4)}`,
      },
    );
  }

  async publishRule(id: string): Promise<ClinicalRule> {
    await delay(520);
    if (this.session.role !== 'teacher') {
      throw new RceApiError('forbidden', 'Solo docentes pueden publicar reglas compartidas.');
    }
    const rule = this.rules.find((candidate) => candidate.id === id);
    if (!rule) {
      throw new RceApiError('not-found', 'Regla CQL no encontrada.');
    }
    rule.lifecycle = 'published';
    rule.activation = true;
    rule.scope = 'shared';
    rule.modified = new Date().toISOString().slice(0, 10);
    return clone(rule);
  }

  async setRuleActivation(id: string, enabled: boolean): Promise<ClinicalRule> {
    await delay(220);
    if (this.session.role !== 'teacher') {
      throw new RceApiError('forbidden', 'Solo docentes pueden activar reglas compartidas.');
    }
    const rule = this.rules.find((candidate) => candidate.id === id);
    if (!rule) {
      throw new RceApiError('not-found', 'Regla CQL no encontrada.');
    }
    rule.activation = enabled;
    rule.lifecycle = enabled ? 'published' : 'disabled';
    return clone(rule);
  }

  async listActivity(filters?: ActivityFilters): Promise<ActivityEntry[]> {
    await delay(260);
    let result = [...this.activity];
    if (filters?.hook && filters.hook !== 'all') {
      result = result.filter((entry) => entry.hook === filters.hook);
    }
    if (filters?.severity && filters.severity !== 'all') {
      result = result.filter((entry) => entry.maxSeverity === filters.severity);
    }
    if (filters?.result && filters.result !== 'all') {
      result = result.filter((entry) => entry.result === filters.result);
    }
    return clone(result);
  }
}

export const mockRceApi: RceUiApi = new MockRceUiApiImpl();
