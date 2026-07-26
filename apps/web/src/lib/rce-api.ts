import type {
  ActivityEntry,
  ApiScenario,
  ClinicalRule,
  CdsCard,
  PatientDetail,
  PatientSummary,
  RuleHook,
  RuleTestResult,
  ServicesStatus,
  SessionContext,
  ValidationResult,
} from '../types';

export class RceApiError extends Error {
  constructor(
    public readonly code: 'degraded' | 'forbidden' | 'not-found' | 'error',
    message: string,
  ) {
    super(message);
    this.name = 'RceApiError';
  }
}

export interface PatientFilters {
  query?: string;
  cohort?: string;
  alertState?: 'all' | 'with-alerts' | 'without-alerts';
}

export interface RuleFilters {
  query?: string;
  lifecycle?: string;
  hook?: string;
  activation?: 'all' | 'active' | 'inactive';
}

export interface ActivityFilters {
  hook?: string;
  severity?: string;
  result?: string;
}

export interface ObservationUpdateInput {
  patientId: string;
  observationId: string;
  value: string;
  unit: string;
  interpretation: string;
}

export interface ObservationUpdateResult {
  patient: PatientDetail;
  cards: CdsCard[];
  activity: ActivityEntry;
}

export interface RceUiApi {
  getSession(): Promise<SessionContext>;
  setRole(role: SessionContext['role']): Promise<SessionContext>;
  resetSandbox(): Promise<SessionContext>;
  getScenario(): ApiScenario;
  setScenario(scenario: ApiScenario): void;
  getServicesStatus(): Promise<ServicesStatus>;
  listPatients(filters?: PatientFilters): Promise<PatientSummary[]>;
  getPatient(id: string): Promise<PatientDetail>;
  getPatientCards(id: string): Promise<CdsCard[]>;
  updateObservation(input: ObservationUpdateInput): Promise<ObservationUpdateResult>;
  listRules(filters?: RuleFilters): Promise<ClinicalRule[]>;
  getRule(id: string): Promise<ClinicalRule>;
  saveRule(id: string, cql: string, metadata: ClinicalRule['metadata']): Promise<ClinicalRule>;
  validateRule(id: string, cql: string): Promise<ValidationResult>;
  getElm(id: string): Promise<string>;
  testRule(ruleId: string, patientId: string): Promise<RuleTestResult>;
  publishRule(id: string): Promise<ClinicalRule>;
  setRuleActivation(id: string, enabled: boolean): Promise<ClinicalRule>;
  listActivity(filters?: ActivityFilters): Promise<ActivityEntry[]>;
}
