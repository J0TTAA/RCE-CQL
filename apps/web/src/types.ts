export type Role = 'student' | 'teacher';
export type DependencyState = 'up' | 'degraded' | 'down';
export type CdsSeverity = 'info' | 'warning' | 'critical';
export type Lifecycle = 'draft' | 'validated' | 'published' | 'disabled' | 'retired';
export type RuleHook = 'patient-view' | 'order-select' | 'order-sign';
export type RuleScope = 'sandbox' | 'shared';
export type PatientGender = 'male' | 'female' | 'other' | 'unknown';
export type DemoEncounterType = 'none' | 'ambulatory' | 'emergency' | 'inpatient';
export type EditableClinicalResourceType =
  | 'condition'
  | 'observation'
  | 'medication'
  | 'allergy'
  | 'encounter'
  | 'procedure'
  | 'immunization'
  | 'serviceRequest';
export type Cohort = 'niños' | 'adolescentes' | 'adultos' | 'adultos mayores';

export interface ServicesStatus {
  api: DependencyState;
  hapi: DependencyState;
  translator: DependencyState;
}

export interface SessionContext {
  anonymousSessionId: string;
  classroomId: string;
  sandboxId: string;
  sandboxLabel: string;
  role: Role;
  expiresAt: string;
}

export interface ClinicalCondition {
  id: string;
  code: string;
  display: string;
  clinicalStatus: string;
  onsetDate: string;
}

export interface ClinicalObservation {
  id: string;
  code: string;
  display: string;
  value: string;
  unit: string;
  effectiveDate: string;
  interpretation: string;
}

export interface MedicationItem {
  id: string;
  display: string;
  dose: string;
  route: string;
  status: string;
  startDate: string;
}

export interface EncounterItem {
  id: string;
  type: string;
  reason: string;
  date: string;
  clinician: string;
  status: string;
}

export interface AllergyItem {
  id: string;
  display: string;
  clinicalStatus: string;
  criticality: string;
  recordedDate: string;
}

export interface ProcedureItem {
  id: string;
  code: string;
  display: string;
  status: string;
  performedDate: string;
}

export interface ImmunizationItem {
  id: string;
  vaccine: string;
  status: string;
  occurrenceDate: string;
}

export interface ServiceRequestItem {
  id: string;
  code: string;
  display: string;
  status: string;
  intent: string;
  authoredOn: string;
}

export interface EditableClinicalResource {
  id: string;
  type: EditableClinicalResourceType;
  code: string;
  status?: string;
  date?: string;
  value?: number;
}

export interface TimelineItem {
  id: string;
  date: string;
  kind: string;
  label: string;
}

export interface PatientSummary {
  id: string;
  synId: string;
  name: string;
  age: number;
  cohort: Cohort;
  sex: string;
  activeConditions: string[];
  lastEncounter: string;
  cdsStatus: CdsSeverity | 'none';
  cdsCount: number;
  sandboxTouched?: boolean;
}

export interface PatientDetail extends PatientSummary {
  birthDate: string;
  editableClinicalData: {
    birthDate: string;
    gender: PatientGender;
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
    encounterType?: DemoEncounterType;
    clinicalResources: EditableClinicalResource[];
  };
  conditions: ClinicalCondition[];
  observations: ClinicalObservation[];
  medications: MedicationItem[];
  encounters: EncounterItem[];
  allergies: AllergyItem[];
  procedures: ProcedureItem[];
  immunizations: ImmunizationItem[];
  serviceRequests: ServiceRequestItem[];
  timeline: TimelineItem[];
}

export interface CdsSuggestion {
  action: 'create' | 'update' | 'delete';
  resourceType: string;
  description: string;
}

export interface CdsCard {
  id: string;
  severity: CdsSeverity;
  summary: string;
  detail: string;
  source: string;
  ruleName: string;
  ruleVersion: string;
  suggestion?: CdsSuggestion;
}

export interface RuleMetadata {
  title: string;
  name: string;
  version: string;
  hook: RuleHook;
  expression: string;
  summary: string;
  detail: string;
  indicator: CdsSeverity;
}

export interface ClinicalRule {
  id: string;
  title: string;
  cqlName: string;
  version: string;
  lifecycle: Lifecycle;
  hook: RuleHook;
  activation: boolean;
  modified: string;
  scope: RuleScope;
  cql: string;
  metadata: RuleMetadata;
}

export interface Diagnostic {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  line: number;
  column: number;
}

export interface ValidationResult {
  valid: boolean;
  diagnostics: Diagnostic[];
  elm?: string;
}

export interface RuleTestResult {
  applies: boolean;
  cards: CdsCard[];
  consideredResources: string[];
  warnings: string[];
  correlationId: string;
}

export interface ActivityEntry {
  id: string;
  date: string;
  patientId: string;
  patientName: string;
  hook: RuleHook;
  rules: string[];
  cardsCount: number;
  durationMs: number;
  result: 'success' | 'no-aplica' | 'error';
  correlationId: string;
  maxSeverity: CdsSeverity | 'none';
  cards: CdsCard[];
  consideredResources: string[];
  warnings: string[];
  scope: RuleScope;
}
