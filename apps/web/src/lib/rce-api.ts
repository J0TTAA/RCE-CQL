import type {
  ActivityEntry,
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

export interface PatientUpdateInput {
  patientId: string;
  birthDate?: string;
  gender?: PatientDetail['editableClinicalData']['gender'];
  systolicBloodPressure?: number;
  diastolicBloodPressure?: number;
  hba1c?: number;
  fastingGlucose?: number;
  ldlCholesterol?: number;
  bodyMassIndex?: number;
  bodyWeight?: number;
  bodyHeight?: number;
  diabetesCondition?: boolean;
  metforminMedication?: boolean;
  encounterType?: PatientDetail['editableClinicalData']['encounterType'];
  clinicalResources?: PatientDetail['editableClinicalData']['clinicalResources'];
}

export interface PatientUpdateResult {
  patient: PatientDetail;
  cards: CdsCard[];
  activity: ActivityEntry;
}

export interface RceUiApi {
  getSession(): Promise<SessionContext>;
  setRole(role: SessionContext['role'], teacherPasscode?: string): Promise<SessionContext>;
  resetSandbox(): Promise<SessionContext>;
  getServicesStatus(): Promise<ServicesStatus>;
  listPatients(filters?: PatientFilters): Promise<PatientSummary[]>;
  getPatient(id: string): Promise<PatientDetail>;
  getPatientCards(id: string): Promise<CdsCard[]>;
  updatePatient(input: PatientUpdateInput): Promise<PatientUpdateResult>;
  listRules(filters?: RuleFilters): Promise<ClinicalRule[]>;
  createRule(cql: string, metadata: ClinicalRule['metadata']): Promise<ClinicalRule>;
  getRule(id: string): Promise<ClinicalRule>;
  saveRule(id: string, cql: string, metadata: ClinicalRule['metadata']): Promise<ClinicalRule>;
  validateRule(id: string, cql: string): Promise<ValidationResult>;
  getElm(id: string): Promise<string>;
  testRule(ruleId: string, patientId: string): Promise<RuleTestResult>;
  publishRule(id: string): Promise<ClinicalRule>;
  setRuleActivation(id: string, enabled: boolean): Promise<ClinicalRule>;
  listActivity(filters?: ActivityFilters): Promise<ActivityEntry[]>;
}

const API_PREFIX = '/api/v1';

export function createHttpRceApi(): RceUiApi {
  return new HttpRceApi();
}

class HttpRceApi implements RceUiApi {
  private session: SessionContext | null = null;
  private sessionPromise: Promise<SessionContext> | null = null;

  async getSession(): Promise<SessionContext> {
    if (this.session) {
      return this.session;
    }
    this.sessionPromise ??= this.request<SessionContext>('/ui/session', { skipSession: true });
    try {
      this.session = await this.sessionPromise;
      return this.session;
    } finally {
      this.sessionPromise = null;
    }
  }

  async setRole(role: SessionContext['role'], teacherPasscode?: string): Promise<SessionContext> {
    const session = await this.request<SessionContext>('/ui/session/role', {
      method: 'PATCH',
      body: JSON.stringify({ role, teacherPasscode }),
      skipSession: true,
    });
    this.session = session;
    return session;
  }

  async resetSandbox(): Promise<SessionContext> {
    const session = await this.request<SessionContext>('/ui/session/reset', {
      method: 'POST',
      body: JSON.stringify({ role: this.session?.role ?? 'student' }),
      skipSession: true,
    });
    this.session = session;
    return session;
  }

  async getServicesStatus(): Promise<ServicesStatus> {
    const ready = await this.request<{
      status: string;
      dependencies: Array<{ name: string; status: 'up' | 'down'; details?: unknown }>;
    }>('/health/ready', { skipSession: true });
    const hapi =
      ready.dependencies.find((dependency) => dependency.name === 'hapi-fhir')?.status === 'up'
        ? 'up'
        : 'down';
    const translator =
      ready.dependencies.find((dependency) => dependency.name === 'cql-translator')?.status === 'up'
        ? 'up'
        : 'down';
    return { api: ready.status === 'up' ? 'up' : 'degraded', hapi, translator };
  }

  listPatients(filters?: PatientFilters): Promise<PatientSummary[]> {
    return this.request(`/ui/patients${queryString(filters)}`);
  }

  getPatient(id: string): Promise<PatientDetail> {
    return this.request(`/ui/patients/${encodeURIComponent(id)}`);
  }

  getPatientCards(id: string): Promise<CdsCard[]> {
    return this.request(`/ui/patients/${encodeURIComponent(id)}/cards`);
  }

  updatePatient(input: PatientUpdateInput): Promise<PatientUpdateResult> {
    return this.request(`/ui/patients/${encodeURIComponent(input.patientId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        birthDate: input.birthDate,
        gender: input.gender,
        systolicBloodPressure: input.systolicBloodPressure,
        diastolicBloodPressure: input.diastolicBloodPressure,
        hba1c: input.hba1c,
        fastingGlucose: input.fastingGlucose,
        ldlCholesterol: input.ldlCholesterol,
        bodyMassIndex: input.bodyMassIndex,
        bodyWeight: input.bodyWeight,
        bodyHeight: input.bodyHeight,
        diabetesCondition: input.diabetesCondition,
        metforminMedication: input.metforminMedication,
        encounterType: input.encounterType,
        clinicalResources: input.clinicalResources,
      }),
    });
  }

  listRules(filters?: RuleFilters): Promise<ClinicalRule[]> {
    return this.request(`/ui/rules${queryString(filters)}`);
  }

  createRule(cql: string, metadata: ClinicalRule['metadata']): Promise<ClinicalRule> {
    return this.request('/ui/rules', {
      method: 'POST',
      body: JSON.stringify({ cql, metadata }),
    });
  }

  getRule(id: string): Promise<ClinicalRule> {
    return this.request(`/ui/rules/${encodeURIComponent(id)}`);
  }

  saveRule(id: string, cql: string, metadata: ClinicalRule['metadata']): Promise<ClinicalRule> {
    return this.request(`/ui/rules/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ cql, metadata }),
    });
  }

  async validateRule(id: string, cql: string): Promise<ValidationResult> {
    return this.request(`/ui/rules/${encodeURIComponent(id)}/validate`, {
      method: 'POST',
      body: JSON.stringify({ cql }),
    });
  }

  async getElm(id: string): Promise<string> {
    const rule = await this.getRule(id);
    const validation = await this.validateRule(id, rule.cql);
    if (!validation.elm) {
      throw new RceApiError('error', 'La regla no tiene ELM disponible.');
    }
    return validation.elm;
  }

  testRule(ruleId: string, patientId: string): Promise<RuleTestResult> {
    return this.request(`/ui/rules/${encodeURIComponent(ruleId)}/test`, {
      method: 'POST',
      body: JSON.stringify({ patientId }),
    });
  }

  publishRule(id: string): Promise<ClinicalRule> {
    return this.request(`/ui/rules/${encodeURIComponent(id)}/publish`, { method: 'POST' });
  }

  setRuleActivation(id: string, enabled: boolean): Promise<ClinicalRule> {
    return this.request(`/ui/rules/${encodeURIComponent(id)}/activation`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    });
  }

  listActivity(filters?: ActivityFilters): Promise<ActivityEntry[]> {
    return this.request(`/ui/activity${queryString(filters)}`);
  }

  private async request<T>(
    path: string,
    init: RequestInit & { skipSession?: boolean } = {},
  ): Promise<T> {
    if (!init.skipSession) {
      await this.getSession();
    }
    const response = await fetch(`${API_PREFIX}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        accept: 'application/json',
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
    });
    const payload = (await response.json().catch(() => null)) as
      { code?: string; message?: string } | T | null;
    if (!response.ok) {
      throw new RceApiError(
        mapErrorCode(response.status),
        (payload as { message?: string } | null)?.message ?? 'Error API RCE',
      );
    }
    return payload as T;
  }
}

function queryString(filters?: object): string {
  const params = new URLSearchParams();
  Object.entries(filters ?? {}).forEach(([key, value]) => {
    if (typeof value === 'string' && value && value !== 'all') {
      params.set(key, value);
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

function mapErrorCode(status: number): RceApiError['code'] {
  if (status === 403) {
    return 'forbidden';
  }
  if (status === 404) {
    return 'not-found';
  }
  if (status === 503) {
    return 'degraded';
  }
  return 'error';
}
