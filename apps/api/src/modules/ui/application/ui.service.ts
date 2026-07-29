import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import cql from 'cql-execution';
import * as cqlfhir from 'cql-exec-fhir';
import { CqlTranslatorPort } from '../../cql/application/cql-translator.port';
import {
  FhirGatewayPort,
  type FhirBundle,
  type FhirResource,
} from '../../fhir/application/fhir-gateway.port';

const DATASET_TAG_SYSTEM = 'https://rce-cql.local/fhir/tags/dataset';
const DATASET_TAG_CODE = 'synthea-4.0.0-v1';
const SANDBOX_TAG_SYSTEM = 'https://rce-cql.local/fhir/tags/sandbox';
const RULE_TAG_SYSTEM = 'https://rce-cql.local/fhir/tags/rule';
const RULE_TAG_CODE = 'cql-rule';
const ACTIVITY_TAG_SYSTEM = 'https://rce-cql.local/fhir/tags/activity';
const ACTIVITY_TAG_CODE = 'cds-evaluation';
const OVERLAY_CODE_SYSTEM = 'https://rce-cql.local/fhir/CodeSystem/sandbox-overlay';
const OVERLAY_CODE = 'patient-overlay';
const EXT_BASE = 'https://rce-cql.local/fhir/StructureDefinition';
const LOINC_SYSTEM = 'http://loinc.org';
const UCUM_SYSTEM = 'http://unitsofmeasure.org';
const SNOMED_SYSTEM = 'http://snomed.info/sct';
const RXNORM_SYSTEM = 'http://www.nlm.nih.gov/research/umls/rxnorm';
const ACT_CODE_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-ActCode';
const INITIAL_RULE_VERSION = '0.1.0';
const FIRST_PUBLISHED_RULE_VERSION = '1.0.0';
const RULE_VERSION_PATTERN = /^[0-9]+(\.[0-9]+){0,2}(-[A-Za-z0-9.-]+)?$/;
const CQL_LIBRARY_DECLARATION_PATTERN =
  /^([ \t]*library[ \t]+)[A-Za-z][A-Za-z0-9_]*(?:[ \t]+version[ \t]+'[^']*')?([ \t]*)$/m;

export type Severity = 'info' | 'warning' | 'critical';
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

export interface EditableClinicalResource {
  id: string;
  type: EditableClinicalResourceType;
  code: string;
  status?: string;
  date?: string;
  value?: number;
}

export interface EditableClinicalData {
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
}

export interface RuleMetadata {
  title: string;
  name: string;
  version: string;
  hook: RuleHook;
  expression: string;
  summary: string;
  detail: string;
  indicator: Severity;
}

type RuleMetadataInput = Omit<RuleMetadata, 'version'> & { version?: string };

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

export interface PatientSummary {
  id: string;
  synId: string;
  name: string;
  age: number;
  cohort: string;
  sex: string;
  activeConditions: string[];
  lastEncounter: string;
  cdsStatus: Severity | 'none';
  cdsCount: number;
  sandboxTouched?: boolean;
}

export interface PatientDetail extends PatientSummary {
  birthDate: string;
  editableClinicalData: EditableClinicalData;
  conditions: Array<{
    id: string;
    code: string;
    display: string;
    clinicalStatus: string;
    onsetDate: string;
  }>;
  observations: Array<{
    id: string;
    code: string;
    display: string;
    value: string;
    unit: string;
    effectiveDate: string;
    interpretation: string;
  }>;
  medications: Array<{
    id: string;
    display: string;
    dose: string;
    route: string;
    status: string;
    startDate: string;
  }>;
  encounters: Array<{
    id: string;
    type: string;
    reason: string;
    date: string;
    clinician: string;
    status: string;
  }>;
  allergies: Array<{
    id: string;
    display: string;
    clinicalStatus: string;
    criticality: string;
    recordedDate: string;
  }>;
  procedures: Array<{
    id: string;
    code: string;
    display: string;
    status: string;
    performedDate: string;
  }>;
  immunizations: Array<{
    id: string;
    vaccine: string;
    status: string;
    occurrenceDate: string;
  }>;
  serviceRequests: Array<{
    id: string;
    code: string;
    display: string;
    status: string;
    intent: string;
    authoredOn: string;
  }>;
  timeline: Array<{ id: string; date: string; kind: string; label: string }>;
}

export interface CdsCard {
  id: string;
  severity: Severity;
  summary: string;
  detail: string;
  source: string;
  ruleName: string;
  ruleVersion: string;
  suggestion?: {
    action: 'create' | 'update' | 'delete';
    resourceType: string;
    description: string;
  };
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
  maxSeverity: Severity | 'none';
  cards: CdsCard[];
  consideredResources: string[];
  warnings: string[];
  scope: RuleScope;
}

interface PatientOverlay {
  birthDate?: string;
  gender?: PatientGender;
  observations?: ObservationOverlay;
  conditions?: ConditionOverlay;
  medications?: MedicationOverlay;
  encounterType?: DemoEncounterType;
  clinicalResources?: EditableClinicalResource[];
}

interface ObservationOverlay {
  systolicBloodPressure?: number;
  diastolicBloodPressure?: number;
  hba1c?: number;
  fastingGlucose?: number;
  ldlCholesterol?: number;
  bodyMassIndex?: number;
  bodyWeight?: number;
  bodyHeight?: number;
}

interface ConditionOverlay {
  diabetes?: boolean;
}

interface MedicationOverlay {
  metformin?: boolean;
}

export interface PatientClinicalUpdate {
  birthDate?: string;
  gender?: PatientGender;
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
  clinicalResources?: EditableClinicalResource[];
}

interface PatientClinicalSummary {
  activeConditions: string[];
  lastEncounter: string;
}

interface CachedValue<T> {
  expiresAt: number;
  value: T;
}

export interface HookEvaluationInput {
  patientId: string;
  sandboxId: string;
  hook: RuleHook;
  persistActivity?: boolean;
  correlationId?: string;
  additionalResources?: FhirResource[];
}

@Injectable()
export class UiService {
  private readonly listCacheTtlMs = 30_000;
  private patientSearchCache: CachedValue<FhirBundle> | null = null;
  private clinicalSummaryIndexCache: CachedValue<Map<string, PatientClinicalSummary>> | null = null;

  constructor(
    private readonly fhir: FhirGatewayPort,
    private readonly translator: CqlTranslatorPort,
  ) {}

  async listPatients(
    sandboxId: string,
    filters: Record<string, string | undefined>,
  ): Promise<PatientSummary[]> {
    const bundle = await this.searchPatients();
    const patients = resourcesOfType(bundle, 'Patient');
    const clinicalSummaryIndex = await this.patientClinicalSummaryIndex();
    const summaries = await Promise.all(
      patients.map(async (patient) =>
        this.patientToSummary(
          patient,
          sandboxId,
          clinicalSummaryIndex.get(String(patient.id ?? '')),
        ),
      ),
    );
    const query = filters.query?.trim().toLowerCase();
    return summaries
      .filter((patient) =>
        query ? `${patient.name} ${patient.synId}`.toLowerCase().includes(query) : true,
      )
      .filter((patient) => {
        const cohort = filters.cohort;
        return !cohort || cohort === 'all' ? true : patient.cohort === cohort;
      })
      .filter((patient) => {
        if (filters.alertState === 'with-alerts') {
          return patient.cdsCount > 0;
        }
        if (filters.alertState === 'without-alerts') {
          return patient.cdsCount === 0;
        }
        return true;
      });
  }

  async getPatient(patientId: string, sandboxId: string): Promise<PatientDetail> {
    const overlay = await this.getPatientOverlay(patientId, sandboxId);
    const bundle = await this.patientBundleWithOverlay(patientId, sandboxId);
    const patient = firstResourceOfType(bundle, 'Patient');
    if (!patient) {
      throw new NotFoundException('Paciente no encontrado en HAPI.');
    }
    const cards = await this.evaluateHook({
      patientId,
      sandboxId,
      hook: 'patient-view',
      persistActivity: false,
    });
    return this.patientBundleToDetail(
      patient,
      bundle,
      cards.cards,
      hasPatientOverlay(overlay),
      overlay,
    );
  }

  async updatePatientClinicalData(
    patientId: string,
    sandboxId: string,
    input: PatientClinicalUpdate,
  ): Promise<{
    patient: PatientDetail;
    cards: CdsCard[];
    activity: ActivityEntry;
  }> {
    if (input.birthDate !== undefined) {
      assertDate(input.birthDate);
    }
    const patient = await this.fhir.read('Patient', patientId);
    if (!patient) {
      throw new NotFoundException('Paciente no encontrado en HAPI.');
    }
    const currentOverlay = await this.getPatientOverlay(patientId, sandboxId);
    await this.savePatientOverlay(patientId, sandboxId, mergePatientOverlay(currentOverlay, input));
    const evaluation = await this.evaluateHook({
      patientId,
      sandboxId,
      hook: 'patient-view',
      persistActivity: true,
    });
    const detail = await this.getPatient(patientId, sandboxId);
    return { patient: detail, cards: evaluation.cards, activity: evaluation.activity };
  }

  async getPatientCards(patientId: string, sandboxId: string): Promise<CdsCard[]> {
    return (
      await this.evaluateHook({
        patientId,
        sandboxId,
        hook: 'patient-view',
        persistActivity: false,
      })
    ).cards;
  }

  async evaluateHook(input: HookEvaluationInput): Promise<{
    cards: CdsCard[];
    activity: ActivityEntry;
  }> {
    return this.evaluateActiveRules(input);
  }

  async listRules(
    sandboxId: string,
    filters: Record<string, string | undefined>,
  ): Promise<ClinicalRule[]> {
    const bundle = await this.fhir.search('Library', {
      _count: '100',
      _tag: `${RULE_TAG_SYSTEM}|${RULE_TAG_CODE}`,
    });
    const rules = resourcesOfType(bundle, 'Library')
      .filter((resource) => !hasAnySandboxTag(resource) || hasSandboxTag(resource, sandboxId))
      .map((library) => this.libraryToRule(library, sandboxId))
      .filter((rule): rule is ClinicalRule => Boolean(rule));
    const query = filters.query?.trim().toLowerCase();
    return rules
      .filter((rule) =>
        query ? `${rule.title} ${rule.cqlName}`.toLowerCase().includes(query) : true,
      )
      .filter((rule) =>
        !filters.lifecycle || filters.lifecycle === 'all'
          ? true
          : rule.lifecycle === filters.lifecycle,
      )
      .filter((rule) =>
        !filters.hook || filters.hook === 'all' ? true : rule.hook === filters.hook,
      )
      .filter((rule) => {
        if (filters.activation === 'active') {
          return rule.activation;
        }
        if (filters.activation === 'inactive') {
          return !rule.activation;
        }
        return true;
      })
      .sort((a, b) => b.modified.localeCompare(a.modified));
  }

  async createRule(
    sandboxId: string,
    metadata: RuleMetadataInput,
    cqlText: string,
  ): Promise<ClinicalRule> {
    const id = `rce-rule-${hash(`${sandboxId}:${metadata.name}:${Date.now()}`).slice(0, 24)}`;
    const version = INITIAL_RULE_VERSION;
    const versionedMetadata = metadataWithVersion(metadata, version);
    const versionedCql = cqlWithLibraryVersion(cqlText, metadata.name, version);
    const library = this.ruleToLibrary(
      {
        id,
        title: versionedMetadata.title,
        cqlName: versionedMetadata.name,
        version,
        lifecycle: 'draft',
        hook: versionedMetadata.hook,
        activation: false,
        modified: today(),
        scope: 'sandbox',
        cql: versionedCql,
        metadata: versionedMetadata,
      },
      sandboxId,
    );
    const saved = await this.fhir.update('Library', id, library);
    return (
      this.libraryToRule(saved, sandboxId) ??
      (this.libraryToRule(library, sandboxId) as ClinicalRule)
    );
  }

  async getRule(id: string, sandboxId: string): Promise<ClinicalRule> {
    const library = await this.fhir.read('Library', id);
    if (!library) {
      throw new NotFoundException('Regla CQL no encontrada en HAPI.');
    }
    const rule = this.libraryToRule(library, sandboxId);
    if (!rule) {
      throw new NotFoundException('El recurso Library no contiene una regla RCE CQL.');
    }
    return rule;
  }

  async saveRule(
    id: string,
    sandboxId: string,
    cqlText: string,
    metadata: RuleMetadataInput,
  ): Promise<ClinicalRule> {
    const current = await this.getRule(id, sandboxId);
    const isEditingPublishedVersion = current.lifecycle === 'published';
    const version = isEditingPublishedVersion
      ? nextPatchRuleVersion(current.version)
      : normalizeRuleVersion(current.version);
    const nextId = isEditingPublishedVersion
      ? `rce-rule-${hash(`${sandboxId}:${metadata.name}:${version}:${Date.now()}`).slice(0, 24)}`
      : id;
    const versionedMetadata = metadataWithVersion(metadata, version);
    const versionedCql = cqlWithLibraryVersion(cqlText, versionedMetadata.name, version);
    const next = {
      ...current,
      id: nextId,
      cql: versionedCql,
      metadata: versionedMetadata,
      title: versionedMetadata.title,
      cqlName: versionedMetadata.name,
      version,
      hook: versionedMetadata.hook,
      activation: isEditingPublishedVersion ? false : current.activation,
      scope: isEditingPublishedVersion ? 'sandbox' : current.scope,
      lifecycle: 'draft' as Lifecycle,
      modified: today(),
    };
    const saved = await this.fhir.update('Library', nextId, this.ruleToLibrary(next, sandboxId));
    return this.libraryToRule(saved, sandboxId) ?? next;
  }

  async validateRule(
    id: string,
    sandboxId: string,
    cqlText: string,
  ): Promise<{ valid: boolean; diagnostics: unknown[]; elm?: string }> {
    const current = await this.getRule(id, sandboxId);
    if (current.lifecycle === 'published') {
      throw new UnprocessableEntityException(
        'Edita y guarda una nueva version antes de validar una regla publicada.',
      );
    }
    const version = normalizeRuleVersion(current.version);
    const versionedCql = cqlWithLibraryVersion(cqlText, current.cqlName, version);
    const translation = await this.translator.translate({
      cql: versionedCql,
      options: {
        annotations: true,
        locators: true,
        resultTypes: true,
        detailedErrors: true,
        strict: true,
      },
    });
    const elm = JSON.stringify(translation.elm, null, 2);
    const next = {
      ...current,
      cql: versionedCql,
      version,
      metadata: metadataWithVersion(current.metadata, version),
      lifecycle: 'validated' as Lifecycle,
      modified: today(),
    };
    const resource = this.ruleToLibrary(next, sandboxId, elm);
    await this.fhir.update('Library', id, resource);
    return { valid: true, diagnostics: [], elm };
  }

  async publishRule(
    id: string,
    sandboxId: string,
    scope: RuleScope = 'sandbox',
  ): Promise<ClinicalRule> {
    const current = await this.getRule(id, sandboxId);
    if (current.lifecycle !== 'validated') {
      throw new UnprocessableEntityException('La regla debe estar validada antes de publicarse.');
    }
    const version = publishedRuleVersion(current.version);
    const versionedMetadata = metadataWithVersion(current.metadata, version);
    const versionedCql = cqlWithLibraryVersion(current.cql, current.cqlName, version);
    const translation = await this.translator.translate({
      cql: versionedCql,
      options: {
        annotations: true,
        locators: true,
        resultTypes: true,
        detailedErrors: true,
        strict: true,
      },
    });
    const elm = JSON.stringify(translation.elm, null, 2);
    const next = {
      ...current,
      cql: versionedCql,
      metadata: versionedMetadata,
      version,
      lifecycle: 'published' as Lifecycle,
      activation: true,
      scope,
      modified: today(),
    };
    const saved = await this.fhir.update('Library', id, this.ruleToLibrary(next, sandboxId, elm));
    return this.libraryToRule(saved, sandboxId) ?? next;
  }

  async setRuleActivation(id: string, sandboxId: string, enabled: boolean): Promise<ClinicalRule> {
    const current = await this.getRule(id, sandboxId);
    const next = {
      ...current,
      activation: enabled,
      modified: today(),
    };
    const saved = await this.fhir.update('Library', id, this.ruleToLibrary(next, sandboxId));
    return this.libraryToRule(saved, sandboxId) ?? next;
  }

  async testRule(id: string, patientId: string, sandboxId: string): Promise<RuleTestResult> {
    const startedAt = performance.now();
    const rule = await this.getRule(id, sandboxId);
    const bundle = await this.patientBundleWithOverlay(patientId, sandboxId);
    const patient = firstResourceOfType(bundle, 'Patient');
    if (!patient) {
      throw new NotFoundException('Paciente no encontrado en HAPI.');
    }
    const result = await this.evaluateRule(rule, bundle);
    const cards = result.applies ? [this.ruleToCard(rule)] : [];
    const activity = await this.saveActivity(
      {
        patientId,
        patientName: patientDisplay(patient),
        hook: rule.hook,
        rules: [`${rule.cqlName} ${rule.version}`],
        cards,
        durationMs: Math.round(performance.now() - startedAt),
        correlationId: `corr-${hash(`${sandboxId}:${id}:${patientId}:${Date.now()}`).slice(0, 10)}`,
        consideredResources: result.consideredResources,
        warnings: result.warnings,
        scope: rule.scope,
      },
      sandboxId,
    );
    return {
      applies: result.applies,
      cards,
      consideredResources: result.consideredResources,
      warnings: result.warnings,
      correlationId: activity.correlationId,
    };
  }

  async listActivity(
    sandboxId: string,
    filters: Record<string, string | undefined>,
  ): Promise<ActivityEntry[]> {
    const bundle = await this.fhir.search('Basic', {
      _count: '100',
      _tag: `${ACTIVITY_TAG_SYSTEM}|${ACTIVITY_TAG_CODE}`,
    });
    return resourcesOfType(bundle, 'Basic')
      .filter((resource) => !hasAnySandboxTag(resource) || hasSandboxTag(resource, sandboxId))
      .map((resource) => this.basicToActivity(resource))
      .filter((entry): entry is ActivityEntry => Boolean(entry))
      .filter((entry) =>
        !filters.hook || filters.hook === 'all' ? true : entry.hook === filters.hook,
      )
      .filter((entry) =>
        !filters.severity || filters.severity === 'all'
          ? true
          : entry.maxSeverity === filters.severity,
      )
      .filter((entry) =>
        !filters.result || filters.result === 'all' ? true : entry.result === filters.result,
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  private async searchPatients(): Promise<FhirBundle> {
    const cached = this.readCache(this.patientSearchCache);
    if (cached) {
      return cached;
    }
    const tagged = await this.fhir.search('Patient', {
      _count: '50',
      _tag: `${DATASET_TAG_SYSTEM}|${DATASET_TAG_CODE}`,
    });
    if ((tagged.total ?? 0) > 0 || (tagged.entry?.length ?? 0) > 0) {
      this.patientSearchCache = this.cacheValue(tagged);
      return tagged;
    }
    const fallback = await this.fhir.search('Patient', { _count: '50' });
    if ((fallback.total ?? 0) > 0 || (fallback.entry?.length ?? 0) > 0) {
      this.patientSearchCache = this.cacheValue(fallback);
    }
    return fallback;
  }

  private async patientToSummary(
    patient: FhirResource,
    sandboxId: string,
    clinicalSummary: PatientClinicalSummary = { activeConditions: [], lastEncounter: '' },
  ): Promise<PatientSummary> {
    const patientId = String(patient.id ?? '');
    const overlay = await this.getPatientOverlay(patientId, sandboxId);
    const merged = {
      ...patient,
      ...(overlay.birthDate ? { birthDate: overlay.birthDate } : {}),
      ...(overlay.gender ? { gender: overlay.gender } : {}),
    };
    return {
      id: String(merged.id ?? ''),
      synId: patientIdentifier(merged),
      name: patientDisplay(merged),
      age: ageFromBirthDate(stringField(merged, 'birthDate')),
      cohort: cohortForAge(ageFromBirthDate(stringField(merged, 'birthDate'))),
      sex: genderLabel(stringField(merged, 'gender')),
      activeConditions: clinicalSummary.activeConditions,
      lastEncounter: clinicalSummary.lastEncounter,
      cdsStatus: 'none',
      cdsCount: 0,
      sandboxTouched: hasPatientOverlay(overlay),
    };
  }

  private async patientClinicalSummaryIndex(): Promise<Map<string, PatientClinicalSummary>> {
    const cached = this.readCache(this.clinicalSummaryIndexCache);
    if (cached) {
      return cached;
    }
    const index = new Map<string, PatientClinicalSummary>();
    try {
      const [conditions, encounters] = await Promise.all([
        this.fhir.search('Condition', {
          _count: '1000',
          _tag: `${DATASET_TAG_SYSTEM}|${DATASET_TAG_CODE}`,
        }),
        this.fhir.search('Encounter', {
          _count: '1000',
          _tag: `${DATASET_TAG_SYSTEM}|${DATASET_TAG_CODE}`,
        }),
      ]);
      for (const condition of resourcesOfType(conditions, 'Condition')) {
        const patientId = patientIdFromReference(
          stringField(objectField(condition, 'subject'), 'reference'),
        );
        if (!patientId) {
          continue;
        }
        const clinicalStatus = codeDisplay(objectField(condition, 'clinicalStatus'));
        const display = codeDisplay(condition);
        if (!clinicalStatus.toLowerCase().includes('active') || !display) {
          continue;
        }
        const summary = ensureClinicalSummary(index, patientId);
        if (!summary.activeConditions.includes(display) && summary.activeConditions.length < 4) {
          summary.activeConditions.push(display);
        }
      }
      for (const encounter of resourcesOfType(encounters, 'Encounter')) {
        const patientId = patientIdFromReference(
          stringField(objectField(encounter, 'subject'), 'reference'),
        );
        const date = periodStart(encounter);
        if (!patientId || !date) {
          continue;
        }
        const summary = ensureClinicalSummary(index, patientId);
        if (!summary.lastEncounter || date > summary.lastEncounter) {
          summary.lastEncounter = date;
        }
      }
    } catch {
      return index;
    }
    this.clinicalSummaryIndexCache = this.cacheValue(index);
    return index;
  }

  private async patientBundleWithOverlay(
    patientId: string,
    sandboxId: string,
  ): Promise<FhirBundle> {
    const bundle = await this.fhir.patientEverything(patientId);
    const overlay = await this.getPatientOverlay(patientId, sandboxId);
    if (overlay.birthDate) {
      const patient = firstResourceOfType(bundle, 'Patient');
      if (patient) {
        patient.birthDate = overlay.birthDate;
      }
    }
    if (overlay.gender) {
      const patient = firstResourceOfType(bundle, 'Patient');
      if (patient) {
        patient.gender = overlay.gender;
      }
    }
    applyObservationOverlay(bundle, patientId, overlay.observations);
    applyConditionOverlay(bundle, patientId, overlay.conditions);
    applyMedicationOverlay(bundle, patientId, overlay.medications);
    applyEncounterOverlay(bundle, patientId, overlay.encounterType);
    applyClinicalResourceOverlay(bundle, patientId, overlay.clinicalResources);
    return bundle;
  }

  private async getPatientOverlay(patientId: string, sandboxId: string): Promise<PatientOverlay> {
    if (!patientId) {
      return {};
    }
    const basic = await this.fhir.read('Basic', overlayId(patientId, sandboxId));
    if (!basic) {
      return {};
    }
    return {
      birthDate: extensionValueString(basic, 'patient-birthDate'),
      gender: normalizeGender(extensionValueString(basic, 'patient-gender')),
      observations: observationOverlayFromJson(
        extensionValueString(basic, 'patient-observations-json'),
      ),
      conditions: conditionOverlayFromJson(extensionValueString(basic, 'patient-conditions-json')),
      medications: medicationOverlayFromJson(
        extensionValueString(basic, 'patient-medications-json'),
      ),
      encounterType: normalizeEncounterType(extensionValueString(basic, 'patient-encounter-type')),
      clinicalResources: clinicalResourcesFromJson(
        extensionValueString(basic, 'patient-clinical-resources-json'),
      ),
    };
  }

  private async savePatientOverlay(
    patientId: string,
    sandboxId: string,
    overlay: PatientOverlay,
  ): Promise<void> {
    const observations = normalizeObservationOverlay(overlay.observations);
    const conditions = normalizeConditionOverlay(overlay.conditions);
    const medications = normalizeMedicationOverlay(overlay.medications);
    const encounterType = normalizeEncounterType(overlay.encounterType);
    const clinicalResources = normalizeClinicalResources(overlay.clinicalResources);
    await this.fhir.update('Basic', overlayId(patientId, sandboxId), {
      resourceType: 'Basic',
      id: overlayId(patientId, sandboxId),
      meta: { tag: sandboxTags(sandboxId) },
      code: { coding: [{ system: OVERLAY_CODE_SYSTEM, code: OVERLAY_CODE }] },
      subject: { reference: `Patient/${patientId}` },
      extension: [
        { url: `${EXT_BASE}/sandbox-id`, valueString: sandboxId },
        ...(overlay.birthDate
          ? [{ url: `${EXT_BASE}/patient-birthDate`, valueDate: overlay.birthDate }]
          : []),
        ...(overlay.gender
          ? [{ url: `${EXT_BASE}/patient-gender`, valueCode: overlay.gender }]
          : []),
        ...(hasObservationOverlay(observations)
          ? [
              {
                url: `${EXT_BASE}/patient-observations-json`,
                valueString: JSON.stringify(observations),
              },
            ]
          : []),
        ...(hasConditionOverlay(conditions)
          ? [
              {
                url: `${EXT_BASE}/patient-conditions-json`,
                valueString: JSON.stringify(conditions),
              },
            ]
          : []),
        ...(hasMedicationOverlay(medications)
          ? [
              {
                url: `${EXT_BASE}/patient-medications-json`,
                valueString: JSON.stringify(medications),
              },
            ]
          : []),
        ...(encounterType && encounterType !== 'none'
          ? [{ url: `${EXT_BASE}/patient-encounter-type`, valueCode: encounterType }]
          : []),
        ...(clinicalResources.length > 0
          ? [
              {
                url: `${EXT_BASE}/patient-clinical-resources-json`,
                valueString: JSON.stringify(clinicalResources),
              },
            ]
          : []),
      ],
    });
  }

  private patientBundleToDetail(
    patient: FhirResource,
    bundle: FhirBundle,
    cards: CdsCard[],
    sandboxTouched: boolean,
    overlay: PatientOverlay,
  ): PatientDetail {
    const birthDate = stringField(patient, 'birthDate');
    const conditions = resourcesOfType(bundle, 'Condition').map((condition) => ({
      id: String(condition.id ?? ''),
      code: codeDisplay(condition),
      display: codeDisplay(condition),
      clinicalStatus: codeDisplay(objectField(condition, 'clinicalStatus')),
      onsetDate: dateLike(condition, 'onsetDateTime') || dateLike(condition, 'onsetDate') || '',
    }));
    const observations = resourcesOfType(bundle, 'Observation')
      .slice(0, 30)
      .map((observation) => ({
        id: String(observation.id ?? ''),
        code: codingCode(observation),
        display: codeDisplay(observation),
        value: observationValue(observation).value,
        unit: observationValue(observation).unit,
        effectiveDate:
          dateLike(observation, 'effectiveDateTime') ||
          dateLike(observation, 'effectiveDate') ||
          '',
        interpretation:
          codeDisplay(objectField(firstArrayItem(observation.interpretation), 'coding')) || '',
      }));
    const medications = resourcesOfType(bundle, 'MedicationRequest')
      .slice(0, 20)
      .map((medication) => ({
        id: String(medication.id ?? ''),
        display:
          codeDisplay(objectField(medication, 'medicationCodeableConcept')) || 'MedicationRequest',
        dose: dosageText(medication),
        route: '',
        status: stringField(medication, 'status'),
        startDate: dateLike(medication, 'authoredOn') || '',
      }));
    const encounters = resourcesOfType(bundle, 'Encounter')
      .slice(0, 20)
      .map((encounter) => ({
        id: String(encounter.id ?? ''),
        type: codeDisplay(firstArrayItem(encounter.type)) || 'Encuentro',
        reason: codeDisplay(firstArrayItem(encounter.reasonCode)) || '',
        date: periodStart(encounter) || '',
        clinician: '',
        status: stringField(encounter, 'status'),
      }));
    const allergies = resourcesOfType(bundle, 'AllergyIntolerance')
      .slice(0, 20)
      .map((allergy) => ({
        id: String(allergy.id ?? ''),
        display: codeDisplay(objectField(allergy, 'code')) || 'AllergyIntolerance',
        clinicalStatus: codeDisplay(objectField(allergy, 'clinicalStatus')),
        criticality: stringField(allergy, 'criticality'),
        recordedDate: dateLike(allergy, 'recordedDate') || '',
      }));
    const procedures = resourcesOfType(bundle, 'Procedure')
      .slice(0, 20)
      .map((procedure) => ({
        id: String(procedure.id ?? ''),
        code: codingCode(procedure),
        display: codeDisplay(procedure) || 'Procedure',
        status: stringField(procedure, 'status'),
        performedDate:
          dateLike(procedure, 'performedDateTime') || dateLike(procedure, 'performedDate') || '',
      }));
    const immunizations = resourcesOfType(bundle, 'Immunization')
      .slice(0, 20)
      .map((immunization) => ({
        id: String(immunization.id ?? ''),
        vaccine: codeDisplay(objectField(immunization, 'vaccineCode')) || 'Immunization',
        status: stringField(immunization, 'status'),
        occurrenceDate:
          dateLike(immunization, 'occurrenceDateTime') ||
          dateLike(immunization, 'occurrenceDate') ||
          '',
      }));
    const serviceRequests = resourcesOfType(bundle, 'ServiceRequest')
      .slice(0, 20)
      .map((serviceRequest) => ({
        id: String(serviceRequest.id ?? ''),
        code: codingCode(serviceRequest),
        display: codeDisplay(serviceRequest) || 'ServiceRequest',
        status: stringField(serviceRequest, 'status'),
        intent: stringField(serviceRequest, 'intent'),
        authoredOn: dateLike(serviceRequest, 'authoredOn') || '',
      }));
    const summary: PatientSummary = {
      id: String(patient.id ?? ''),
      synId: patientIdentifier(patient),
      name: patientDisplay(patient),
      age: ageFromBirthDate(birthDate),
      cohort: cohortForAge(ageFromBirthDate(birthDate)),
      sex: genderLabel(stringField(patient, 'gender')),
      activeConditions: conditions
        .filter((condition) => condition.clinicalStatus.toLowerCase().includes('active'))
        .map((condition) => condition.display),
      lastEncounter: encounters[0]?.date ?? '',
      cdsStatus: maxSeverity(cards),
      cdsCount: cards.length,
      sandboxTouched,
    };
    return {
      ...summary,
      birthDate,
      editableClinicalData: {
        birthDate,
        gender: normalizeGender(stringField(patient, 'gender')) ?? 'unknown',
        systolicBloodPressure: observationNumberValue(bundle, 'systolic-blood-pressure', '8480-6'),
        diastolicBloodPressure: observationNumberValue(
          bundle,
          'diastolic-blood-pressure',
          '8462-4',
        ),
        hba1c: observationNumberValue(bundle, 'hba1c', '4548-4'),
        fastingGlucose: observationNumberValue(bundle, 'fasting-glucose', '1558-6'),
        ldlCholesterol: observationNumberValue(bundle, 'ldl-cholesterol', '13457-7'),
        bodyMassIndex: observationNumberValue(bundle, 'body-mass-index', '39156-5'),
        bodyWeight: observationNumberValue(bundle, 'body-weight', '29463-7'),
        bodyHeight: observationNumberValue(bundle, 'body-height', '8302-2'),
        diabetesCondition: hasClinicalCoding(bundle, 'Condition', SNOMED_SYSTEM, '44054006'),
        metforminMedication: hasClinicalCoding(
          bundle,
          'MedicationRequest',
          RXNORM_SYSTEM,
          '860975',
        ),
        encounterType: encounterTypeFromBundle(bundle),
        clinicalResources: normalizeClinicalResources(overlay.clinicalResources),
      },
      conditions,
      observations,
      medications,
      encounters,
      allergies,
      procedures,
      immunizations,
      serviceRequests,
      timeline: [
        ...encounters.map((item) => ({
          id: `enc-${item.id}`,
          date: item.date,
          kind: 'encuentro',
          label: item.type,
        })),
        ...conditions.map((item) => ({
          id: `cond-${item.id}`,
          date: item.onsetDate,
          kind: 'condicion',
          label: item.display,
        })),
        ...observations.map((item) => ({
          id: `obs-${item.id}`,
          date: item.effectiveDate,
          kind: 'observacion',
          label: `${item.display} ${item.value} ${item.unit}`,
        })),
        ...allergies.map((item) => ({
          id: `allergy-${item.id}`,
          date: item.recordedDate,
          kind: 'alergia',
          label: item.display,
        })),
        ...procedures.map((item) => ({
          id: `proc-${item.id}`,
          date: item.performedDate,
          kind: 'procedimiento',
          label: item.display,
        })),
        ...immunizations.map((item) => ({
          id: `imm-${item.id}`,
          date: item.occurrenceDate,
          kind: 'inmunizacion',
          label: item.vaccine,
        })),
        ...serviceRequests.map((item) => ({
          id: `sr-${item.id}`,
          date: item.authoredOn,
          kind: 'orden',
          label: item.display,
        })),
      ]
        .filter((item) => item.date)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 25),
    };
  }

  private libraryToRule(resource: FhirResource, sandboxId: string): ClinicalRule | null {
    if (resource.resourceType !== 'Library' || !hasTag(resource, RULE_TAG_SYSTEM, RULE_TAG_CODE)) {
      return null;
    }
    const metadata: RuleMetadata = {
      title: stringField(resource, 'title') || stringField(resource, 'name') || 'Regla CQL',
      name: stringField(resource, 'name') || String(resource.id ?? ''),
      version: normalizeRuleVersion(stringField(resource, 'version')),
      hook: (extensionValueString(resource, 'rule-hook') as RuleHook) || 'patient-view',
      expression: extensionValueString(resource, 'rule-expression') || 'Aplica',
      summary:
        extensionValueString(resource, 'rule-summary') ||
        stringField(resource, 'title') ||
        'Recomendacion CDS',
      detail:
        extensionValueString(resource, 'rule-detail') ||
        'La regla CQL evaluada aplica para este paciente.',
      indicator: (extensionValueString(resource, 'rule-indicator') as Severity) || 'info',
    };
    const scope = hasSandboxTag(resource, sandboxId) ? 'sandbox' : 'shared';
    return {
      id: String(resource.id ?? ''),
      title: metadata.title,
      cqlName: metadata.name,
      version: metadata.version,
      lifecycle: lifecycleFromStatus(
        stringField(resource, 'status'),
        extensionValueString(resource, 'rule-lifecycle'),
      ),
      hook: metadata.hook,
      activation: extensionValueString(resource, 'rule-activation') === 'true',
      modified: resource.meta && typeof resource.meta === 'object' ? today() : today(),
      scope,
      cql: contentData(resource, 'text/cql'),
      metadata,
    };
  }

  private ruleToLibrary(rule: ClinicalRule, sandboxId: string, elm?: string): FhirResource {
    return {
      resourceType: 'Library',
      id: rule.id,
      meta: {
        tag: [
          { system: RULE_TAG_SYSTEM, code: RULE_TAG_CODE },
          ...(rule.scope === 'sandbox' ? sandboxTags(sandboxId) : []),
        ],
      },
      status: statusFromLifecycle(rule.lifecycle),
      type: {
        coding: [
          { system: 'http://terminology.hl7.org/CodeSystem/library-type', code: 'logic-library' },
        ],
      },
      name: rule.cqlName,
      title: rule.title,
      version: rule.version,
      date: new Date().toISOString(),
      extension: [
        { url: `${EXT_BASE}/rule-hook`, valueCode: rule.metadata.hook },
        { url: `${EXT_BASE}/rule-expression`, valueString: rule.metadata.expression },
        { url: `${EXT_BASE}/rule-summary`, valueString: rule.metadata.summary },
        { url: `${EXT_BASE}/rule-detail`, valueString: rule.metadata.detail },
        { url: `${EXT_BASE}/rule-indicator`, valueCode: rule.metadata.indicator },
        { url: `${EXT_BASE}/rule-activation`, valueBoolean: rule.activation },
        { url: `${EXT_BASE}/rule-lifecycle`, valueCode: rule.lifecycle },
      ],
      content: [
        { contentType: 'text/cql', data: Buffer.from(rule.cql, 'utf8').toString('base64') },
        ...(elm
          ? [
              {
                contentType: 'application/elm+json',
                data: Buffer.from(elm, 'utf8').toString('base64'),
              },
            ]
          : []),
      ],
    };
  }

  private async evaluateActiveRules(input: HookEvaluationInput): Promise<{
    cards: CdsCard[];
    activity: ActivityEntry;
  }> {
    const startedAt = performance.now();
    const persistActivity = input.persistActivity ?? false;
    const [rules, bundle] = await Promise.all([
      this.listRules(input.sandboxId, { hook: input.hook, activation: 'active' }),
      this.patientBundleWithOverlay(input.patientId, input.sandboxId),
    ]);
    appendAdditionalResources(bundle, input.additionalResources);
    const patient = firstResourceOfType(bundle, 'Patient');
    const cards: CdsCard[] = [];
    const warnings: string[] = [];
    const consideredResources = [
      `Patient/${input.patientId}`,
      ...(input.additionalResources ?? [])
        .map((resource) => resourceKey(resource.resourceType, resource.id))
        .filter((key) => key),
    ];
    for (const rule of rules) {
      try {
        const result = await this.evaluateRule(rule, bundle);
        consideredResources.push(...result.consideredResources);
        warnings.push(...result.warnings);
        if (result.applies) {
          cards.push(this.ruleToCard(rule));
        }
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : 'No se pudo evaluar una regla CQL.');
      }
    }
    sortCardsBySeverity(cards);
    const activity = await this.saveActivity(
      {
        patientId: input.patientId,
        patientName: patient ? patientDisplay(patient) : input.patientId,
        hook: input.hook,
        rules: rules.map((rule) => `${rule.cqlName} ${rule.version}`),
        cards,
        durationMs: Math.round(performance.now() - startedAt),
        correlationId:
          input.correlationId ??
          `corr-${hash(`${input.sandboxId}:${input.patientId}:${Date.now()}`).slice(0, 10)}`,
        consideredResources: [...new Set(consideredResources)],
        warnings,
        scope: 'sandbox',
      },
      input.sandboxId,
      persistActivity,
    );
    return { cards, activity };
  }

  private async evaluateRule(
    rule: ClinicalRule,
    bundle: FhirBundle,
  ): Promise<{ applies: boolean; consideredResources: string[]; warnings: string[] }> {
    const elmText = await this.elmForRule(rule);
    const library = new cql.Library(JSON.parse(elmText));
    const executor = new cql.Executor(library);
    const patientSource = cqlfhir.PatientSource.FHIRv401();
    patientSource.loadBundles([bundle]);
    const results = await executor.exec_expression(
      rule.metadata.expression,
      patientSource,
      undefined as never,
    );
    const patientId = String(firstResourceOfType(bundle, 'Patient')?.id ?? '');
    const patientResults = results.patientResults as Record<string, Record<string, unknown>>;
    const expressionResults = patientResults[patientId] ?? Object.values(patientResults)[0] ?? {};
    const value = expressionResults[rule.metadata.expression];
    return {
      applies: value === true,
      consideredResources: [`Patient/${patientId}`],
      warnings:
        value === undefined
          ? [`La expresion "${rule.metadata.expression}" no produjo resultado.`]
          : [],
    };
  }

  private async elmForRule(rule: ClinicalRule): Promise<string> {
    const current = await this.fhir.read('Library', rule.id);
    const elm = current ? contentData(current, 'application/elm+json') : '';
    if (elm) {
      return elm;
    }
    const translation = await this.translator.translate({
      cql: rule.cql,
      options: {
        annotations: true,
        locators: true,
        resultTypes: true,
        detailedErrors: true,
        strict: true,
      },
    });
    return JSON.stringify(translation.elm);
  }

  private ruleToCard(rule: ClinicalRule): CdsCard {
    return {
      id: `card-${rule.id}`,
      severity: rule.metadata.indicator,
      summary: rule.metadata.summary,
      detail: rule.metadata.detail,
      source: `${rule.cqlName} ${rule.version}`,
      ruleName: rule.cqlName,
      ruleVersion: rule.version,
    };
  }

  private async saveActivity(
    input: Omit<ActivityEntry, 'id' | 'date' | 'cardsCount' | 'result' | 'maxSeverity'>,
    sandboxId: string,
    persist = true,
  ): Promise<ActivityEntry> {
    const entry: ActivityEntry = {
      id: `act-${hash(`${input.correlationId}:${Date.now()}`).slice(0, 24)}`,
      date: new Date().toISOString(),
      cardsCount: input.cards.length,
      result: input.cards.length > 0 ? 'success' : 'no-aplica',
      maxSeverity: maxSeverity(input.cards),
      ...input,
    };
    if (persist) {
      await this.fhir.update('Basic', entry.id, activityToResource(entry, sandboxId));
    }
    return entry;
  }

  private basicToActivity(resource: FhirResource): ActivityEntry | null {
    const payload = extensionValueString(resource, 'activity-payload');
    if (!payload) {
      return null;
    }
    try {
      return JSON.parse(payload) as ActivityEntry;
    } catch {
      return null;
    }
  }

  private cacheValue<T>(value: T): CachedValue<T> {
    return { value, expiresAt: Date.now() + this.listCacheTtlMs };
  }

  private readCache<T>(cache: CachedValue<T> | null): T | null {
    if (!cache || cache.expiresAt <= Date.now()) {
      return null;
    }
    return cache.value;
  }
}

function resourcesOfType(bundle: FhirBundle, resourceType: string): FhirResource[] {
  return (bundle.entry ?? [])
    .map((entry) => entry.resource)
    .filter((resource): resource is FhirResource => resource?.resourceType === resourceType);
}

function firstResourceOfType(bundle: FhirBundle, resourceType: string): FhirResource | undefined {
  return resourcesOfType(bundle, resourceType)[0];
}

function appendAdditionalResources(
  bundle: FhirBundle,
  resources: FhirResource[] | undefined,
): void {
  if (!resources?.length) {
    return;
  }
  const existingKeys = new Set(
    (bundle.entry ?? []).map((entry) =>
      resourceKey(entry.resource?.resourceType, entry.resource?.id),
    ),
  );
  const additionalEntries = resources
    .filter((resource) => resource.resourceType)
    .filter((resource) => {
      const key = resourceKey(resource.resourceType, resource.id);
      if (!key) {
        return true;
      }
      if (existingKeys.has(key)) {
        return false;
      }
      existingKeys.add(key);
      return true;
    })
    .map((resource) => ({ resource }));
  if (additionalEntries.length > 0) {
    bundle.entry = [...(bundle.entry ?? []), ...additionalEntries];
  }
}

function resourceKey(resourceType: unknown, id: unknown): string {
  return typeof resourceType === 'string' && typeof id === 'string' ? `${resourceType}/${id}` : '';
}

function applyObservationOverlay(
  bundle: FhirBundle,
  patientId: string,
  observations: ObservationOverlay | undefined,
): void {
  const normalized = normalizeObservationOverlay(observations);
  if (!hasObservationOverlay(normalized)) {
    return;
  }
  const generated = [
    normalized.systolicBloodPressure !== undefined
      ? quantityObservation({
          id: observationId('systolic-blood-pressure'),
          patientId,
          code: '8480-6',
          display: 'Systolic Blood Pressure',
          value: normalized.systolicBloodPressure,
          unit: 'mmHg',
          unitCode: 'mm[Hg]',
          category: 'vital-signs',
        })
      : null,
    normalized.diastolicBloodPressure !== undefined
      ? quantityObservation({
          id: observationId('diastolic-blood-pressure'),
          patientId,
          code: '8462-4',
          display: 'Diastolic Blood Pressure',
          value: normalized.diastolicBloodPressure,
          unit: 'mmHg',
          unitCode: 'mm[Hg]',
          category: 'vital-signs',
        })
      : null,
    normalized.hba1c !== undefined
      ? quantityObservation({
          id: observationId('hba1c'),
          patientId,
          code: '4548-4',
          display: 'Hemoglobin A1c/Hemoglobin.total in Blood',
          value: normalized.hba1c,
          unit: '%',
          unitCode: '%',
          category: 'laboratory',
        })
      : null,
    normalized.fastingGlucose !== undefined
      ? quantityObservation({
          id: observationId('fasting-glucose'),
          patientId,
          code: '1558-6',
          display: 'Glucose [Mass/volume] in Serum or Plasma --fasting',
          value: normalized.fastingGlucose,
          unit: 'mg/dL',
          unitCode: 'mg/dL',
          category: 'laboratory',
        })
      : null,
    normalized.ldlCholesterol !== undefined
      ? quantityObservation({
          id: observationId('ldl-cholesterol'),
          patientId,
          code: '13457-7',
          display: 'Cholesterol in LDL [Mass/volume] in Serum or Plasma',
          value: normalized.ldlCholesterol,
          unit: 'mg/dL',
          unitCode: 'mg/dL',
          category: 'laboratory',
        })
      : null,
    normalized.bodyMassIndex !== undefined
      ? quantityObservation({
          id: observationId('body-mass-index'),
          patientId,
          code: '39156-5',
          display: 'Body mass index (BMI) [Ratio]',
          value: normalized.bodyMassIndex,
          unit: 'kg/m2',
          unitCode: 'kg/m2',
          category: 'vital-signs',
        })
      : null,
    normalized.bodyWeight !== undefined
      ? quantityObservation({
          id: observationId('body-weight'),
          patientId,
          code: '29463-7',
          display: 'Body weight',
          value: normalized.bodyWeight,
          unit: 'kg',
          unitCode: 'kg',
          category: 'vital-signs',
        })
      : null,
    normalized.bodyHeight !== undefined
      ? quantityObservation({
          id: observationId('body-height'),
          patientId,
          code: '8302-2',
          display: 'Body height',
          value: normalized.bodyHeight,
          unit: 'cm',
          unitCode: 'cm',
          category: 'vital-signs',
        })
      : null,
  ].filter((resource): resource is FhirResource => Boolean(resource));
  const overlayIds = new Set(generated.map((resource) => resource.id));
  bundle.entry = [
    ...generated.map((resource) => ({ resource })),
    ...(bundle.entry ?? []).filter((entry) => !overlayIds.has(entry.resource?.id)),
  ];
}

function quantityObservation(input: {
  id: string;
  patientId: string;
  code: string;
  display: string;
  value: number;
  unit: string;
  unitCode: string;
  category: 'vital-signs' | 'laboratory';
  effectiveDate?: string;
}): FhirResource {
  const now = new Date().toISOString();
  const effectiveDateTime = input.effectiveDate ? `${input.effectiveDate}T00:00:00.000Z` : now;
  return {
    resourceType: 'Observation',
    id: input.id,
    meta: { tag: [{ system: SANDBOX_TAG_SYSTEM, code: 'bundle-overlay' }] },
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: input.category,
          },
        ],
      },
    ],
    code: {
      coding: [{ system: LOINC_SYSTEM, code: input.code, display: input.display }],
      text: input.display,
    },
    subject: { reference: `Patient/${input.patientId}` },
    effectiveDateTime,
    issued: now,
    valueQuantity: {
      value: input.value,
      unit: input.unit,
      system: UCUM_SYSTEM,
      code: input.unitCode,
    },
  };
}

function applyConditionOverlay(
  bundle: FhirBundle,
  patientId: string,
  conditions: ConditionOverlay | undefined,
): void {
  const normalized = normalizeConditionOverlay(conditions);
  const generatedIds = new Set([conditionId('diabetes')]);
  const generated = normalized.diabetes
    ? [
        {
          resourceType: 'Condition',
          id: conditionId('diabetes'),
          meta: { tag: [{ system: SANDBOX_TAG_SYSTEM, code: 'bundle-overlay' }] },
          clinicalStatus: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                code: 'active',
                display: 'Active',
              },
            ],
          },
          verificationStatus: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
                code: 'confirmed',
                display: 'Confirmed',
              },
            ],
          },
          category: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/condition-category',
                  code: 'problem-list-item',
                  display: 'Problem List Item',
                },
              ],
            },
          ],
          code: {
            coding: [{ system: SNOMED_SYSTEM, code: '44054006', display: 'Diabetes mellitus' }],
            text: 'Diabetes mellitus',
          },
          subject: { reference: `Patient/${patientId}` },
          onsetDateTime: new Date().toISOString(),
        } satisfies FhirResource,
      ]
    : [];
  bundle.entry = [
    ...generated.map((resource) => ({ resource })),
    ...(bundle.entry ?? []).filter(
      (entry) => !(entry.resource?.id && generatedIds.has(entry.resource.id)),
    ),
  ];
}

function applyMedicationOverlay(
  bundle: FhirBundle,
  patientId: string,
  medications: MedicationOverlay | undefined,
): void {
  const normalized = normalizeMedicationOverlay(medications);
  const generatedIds = new Set([medicationRequestId('metformin')]);
  const generated = normalized.metformin
    ? [
        {
          resourceType: 'MedicationRequest',
          id: medicationRequestId('metformin'),
          meta: { tag: [{ system: SANDBOX_TAG_SYSTEM, code: 'bundle-overlay' }] },
          status: 'active',
          intent: 'order',
          medicationCodeableConcept: {
            coding: [
              {
                system: RXNORM_SYSTEM,
                code: '860975',
                display: 'metformin hydrochloride 500 MG Oral Tablet',
              },
            ],
            text: 'Metformin 500 mg oral tablet',
          },
          subject: { reference: `Patient/${patientId}` },
          authoredOn: new Date().toISOString(),
          dosageInstruction: [{ text: '500 mg por via oral cada 12 horas' }],
        } satisfies FhirResource,
      ]
    : [];
  bundle.entry = [
    ...generated.map((resource) => ({ resource })),
    ...(bundle.entry ?? []).filter(
      (entry) => !(entry.resource?.id && generatedIds.has(entry.resource.id)),
    ),
  ];
}

function applyEncounterOverlay(
  bundle: FhirBundle,
  patientId: string,
  encounterType: DemoEncounterType | undefined,
): void {
  const normalized = normalizeEncounterType(encounterType);
  const generatedIds = new Set([encounterId('demo')]);
  const definition = normalized ? encounterDefinition(normalized) : null;
  const generated = definition
    ? [
        {
          resourceType: 'Encounter',
          id: encounterId('demo'),
          meta: { tag: [{ system: SANDBOX_TAG_SYSTEM, code: 'bundle-overlay' }] },
          status: 'finished',
          class: {
            system: ACT_CODE_SYSTEM,
            code: definition.classCode,
            display: definition.classDisplay,
          },
          type: [
            {
              coding: [
                {
                  system: SNOMED_SYSTEM,
                  code: definition.typeCode,
                  display: definition.typeDisplay,
                },
              ],
              text: definition.typeDisplay,
            },
          ],
          subject: { reference: `Patient/${patientId}` },
          period: { start: new Date().toISOString(), end: new Date().toISOString() },
        } satisfies FhirResource,
      ]
    : [];
  bundle.entry = [
    ...generated.map((resource) => ({ resource })),
    ...(bundle.entry ?? []).filter(
      (entry) => !(entry.resource?.id && generatedIds.has(entry.resource.id)),
    ),
  ];
}

function applyClinicalResourceOverlay(
  bundle: FhirBundle,
  patientId: string,
  resources: EditableClinicalResource[] | undefined,
): void {
  const normalized = normalizeClinicalResources(resources);
  const generated = normalized
    .map((resource) => buildClinicalResource(patientId, resource))
    .filter((resource): resource is FhirResource => Boolean(resource));
  bundle.entry = [
    ...generated.map((resource) => ({ resource })),
    ...(bundle.entry ?? []).filter((entry) => !isGeneratedClinicalResource(entry.resource)),
  ];
}

function buildClinicalResource(
  patientId: string,
  resource: EditableClinicalResource,
): FhirResource | null {
  const date = resource.date || today();
  const id = clinicalResourceId(resource);
  const meta = { tag: [{ system: SANDBOX_TAG_SYSTEM, code: 'bundle-overlay' }] };
  if (resource.type === 'observation') {
    const definition = OBSERVATION_RESOURCE_CATALOG[resource.code];
    if (!definition || !validNumber(resource.value)) {
      return null;
    }
    return quantityObservation({
      id,
      patientId,
      code: definition.code,
      display: definition.display,
      value: resource.value,
      unit: definition.unit,
      unitCode: definition.unitCode,
      category: definition.category,
      effectiveDate: date,
    });
  }
  if (resource.type === 'condition') {
    const definition = CONDITION_RESOURCE_CATALOG[resource.code];
    if (!definition) {
      return null;
    }
    const status = resource.status === 'resolved' ? 'resolved' : 'active';
    return {
      resourceType: 'Condition',
      id,
      meta,
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
            code: status,
            display: status === 'resolved' ? 'Resolved' : 'Active',
          },
        ],
      },
      verificationStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
            code: 'confirmed',
            display: 'Confirmed',
          },
        ],
      },
      category: [
        {
          coding: [
            {
              system: 'http://terminology.hl7.org/CodeSystem/condition-category',
              code: 'problem-list-item',
              display: 'Problem List Item',
            },
          ],
        },
      ],
      code: codedConcept(definition.system, definition.code, definition.display),
      subject: { reference: `Patient/${patientId}` },
      onsetDateTime: `${date}T00:00:00.000Z`,
    };
  }
  if (resource.type === 'medication') {
    const definition = MEDICATION_RESOURCE_CATALOG[resource.code];
    if (!definition) {
      return null;
    }
    return {
      resourceType: 'MedicationRequest',
      id,
      meta,
      status: normalizeResourceStatus(resource.type, resource.status),
      intent: 'order',
      medicationCodeableConcept: codedConcept(
        definition.system,
        definition.code,
        definition.display,
      ),
      subject: { reference: `Patient/${patientId}` },
      authoredOn: `${date}T00:00:00.000Z`,
      dosageInstruction: [{ text: definition.dosage }],
    };
  }
  if (resource.type === 'allergy') {
    const definition = ALLERGY_RESOURCE_CATALOG[resource.code];
    if (!definition) {
      return null;
    }
    const status = normalizeResourceStatus(resource.type, resource.status);
    return {
      resourceType: 'AllergyIntolerance',
      id,
      meta,
      clinicalStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
            code: status,
            display: status === 'inactive' ? 'Inactive' : 'Active',
          },
        ],
      },
      verificationStatus: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
            code: 'confirmed',
            display: 'Confirmed',
          },
        ],
      },
      type: 'allergy',
      category: [definition.category],
      criticality: definition.criticality,
      code: codedConcept(definition.system, definition.code, definition.display),
      patient: { reference: `Patient/${patientId}` },
      recordedDate: `${date}T00:00:00.000Z`,
    };
  }
  if (resource.type === 'encounter') {
    const definition = ENCOUNTER_RESOURCE_CATALOG[resource.code];
    if (!definition) {
      return null;
    }
    return {
      resourceType: 'Encounter',
      id,
      meta,
      status: normalizeResourceStatus(resource.type, resource.status),
      class: {
        system: ACT_CODE_SYSTEM,
        code: definition.classCode,
        display: definition.classDisplay,
      },
      type: [codedConcept(definition.system, definition.code, definition.display)],
      subject: { reference: `Patient/${patientId}` },
      period: { start: `${date}T00:00:00.000Z`, end: `${date}T00:30:00.000Z` },
    };
  }
  if (resource.type === 'procedure') {
    const definition = PROCEDURE_RESOURCE_CATALOG[resource.code];
    if (!definition) {
      return null;
    }
    return {
      resourceType: 'Procedure',
      id,
      meta,
      status: normalizeResourceStatus(resource.type, resource.status),
      code: codedConcept(definition.system, definition.code, definition.display),
      subject: { reference: `Patient/${patientId}` },
      performedDateTime: `${date}T00:00:00.000Z`,
    };
  }
  if (resource.type === 'immunization') {
    const definition = IMMUNIZATION_RESOURCE_CATALOG[resource.code];
    if (!definition) {
      return null;
    }
    return {
      resourceType: 'Immunization',
      id,
      meta,
      status: normalizeResourceStatus(resource.type, resource.status),
      vaccineCode: codedConcept(definition.system, definition.code, definition.display),
      patient: { reference: `Patient/${patientId}` },
      occurrenceDateTime: `${date}T00:00:00.000Z`,
    };
  }
  if (resource.type === 'serviceRequest') {
    const definition = SERVICE_REQUEST_RESOURCE_CATALOG[resource.code];
    if (!definition) {
      return null;
    }
    return {
      resourceType: 'ServiceRequest',
      id,
      meta,
      status: normalizeResourceStatus(resource.type, resource.status),
      intent: 'order',
      code: codedConcept(definition.system, definition.code, definition.display),
      subject: { reference: `Patient/${patientId}` },
      authoredOn: `${date}T00:00:00.000Z`,
    };
  }
  return null;
}

function codedConcept(system: string, code: string, display: string): FhirResource {
  return {
    coding: [{ system, code, display }],
    text: display,
  };
}

function objectField(resource: unknown, field: string): FhirResource {
  if (typeof resource !== 'object' || resource === null || !(field in resource)) {
    return {};
  }
  const value = (resource as Record<string, unknown>)[field];
  return typeof value === 'object' && value !== null ? (value as FhirResource) : {};
}

function stringField(resource: FhirResource, field: string): string {
  const value = resource[field];
  return typeof value === 'string' ? value : '';
}

function firstArrayItem(value: unknown): FhirResource {
  return Array.isArray(value) && typeof value[0] === 'object' && value[0] !== null
    ? (value[0] as FhirResource)
    : {};
}

function patientDisplay(patient: FhirResource): string {
  const names = patient.name;
  if (!Array.isArray(names)) {
    return `Patient/${patient.id ?? ''}`;
  }
  const name = firstArrayItem(names);
  if (typeof name.text === 'string') {
    return name.text;
  }
  const given = Array.isArray(name.given)
    ? name.given.filter((item) => typeof item === 'string').join(' ')
    : '';
  const family = typeof name.family === 'string' ? name.family : '';
  return `${given} ${family}`.trim() || `Patient/${patient.id ?? ''}`;
}

function patientIdentifier(patient: FhirResource): string {
  const identifiers = Array.isArray(patient.identifier) ? patient.identifier : [];
  const first = firstArrayItem(identifiers);
  return typeof first.value === 'string' ? first.value : String(patient.id ?? '');
}

function ensureClinicalSummary(
  index: Map<string, PatientClinicalSummary>,
  patientId: string,
): PatientClinicalSummary {
  const existing = index.get(patientId);
  if (existing) {
    return existing;
  }
  const next: PatientClinicalSummary = { activeConditions: [], lastEncounter: '' };
  index.set(patientId, next);
  return next;
}

function patientIdFromReference(reference: string): string {
  const patientMarker = 'Patient/';
  const index = reference.lastIndexOf(patientMarker);
  return index >= 0 ? (reference.slice(index + patientMarker.length).split('/')[0] ?? '') : '';
}

function ageFromBirthDate(birthDate: string): number {
  if (!birthDate) {
    return 0;
  }
  const todayDate = new Date();
  const born = new Date(`${birthDate}T00:00:00Z`);
  let age = todayDate.getUTCFullYear() - born.getUTCFullYear();
  const monthDelta = todayDate.getUTCMonth() - born.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && todayDate.getUTCDate() < born.getUTCDate())) {
    age -= 1;
  }
  return Math.max(age, 0);
}

function cohortForAge(age: number): string {
  if (age <= 11) {
    return 'niños';
  }
  if (age <= 17) {
    return 'adolescentes';
  }
  if (age <= 64) {
    return 'adultos';
  }
  return 'adultos mayores';
}

function genderLabel(gender: string): string {
  return (
    (
      { male: 'masculino', female: 'femenino', other: 'otro', unknown: 'desconocido' } as Record<
        string,
        string
      >
    )[gender] ?? gender
  );
}

function codeDisplay(resource: unknown): string {
  if (typeof resource !== 'object' || resource === null) {
    return '';
  }
  const fhirResource = resource as FhirResource;
  if (typeof fhirResource.text === 'string') {
    return fhirResource.text;
  }
  const coding = Array.isArray(fhirResource.coding)
    ? firstArrayItem(fhirResource.coding)
    : firstArrayItem(objectField(fhirResource, 'code').coding);
  return typeof coding.display === 'string'
    ? coding.display
    : typeof coding.code === 'string'
      ? coding.code
      : '';
}

function codingCode(resource: FhirResource): string {
  const coding = firstArrayItem(objectField(resource, 'code').coding);
  return typeof coding.code === 'string' ? coding.code : '';
}

function observationValue(observation: FhirResource): { value: string; unit: string } {
  const quantity = objectField(observation, 'valueQuantity');
  if (quantity.value !== undefined) {
    return {
      value: primitiveToString(quantity.value),
      unit: typeof quantity.unit === 'string' ? quantity.unit : '',
    };
  }
  const value = observation.valueString ?? observation.valueCodeableConcept;
  return {
    value: typeof value === 'string' ? value : codeDisplay(value) || 'Sin valor',
    unit: '',
  };
}

function dosageText(resource: FhirResource): string {
  const dosage = firstArrayItem(resource.dosageInstruction);
  return typeof dosage.text === 'string' ? dosage.text : '';
}

function dateLike(resource: FhirResource, field: string): string {
  const value = resource[field];
  return typeof value === 'string' ? value.slice(0, 10) : '';
}

function periodStart(resource: FhirResource): string {
  const period = objectField(resource, 'period');
  return typeof period.start === 'string' ? period.start.slice(0, 10) : '';
}

function hasTag(resource: FhirResource, system: string, code: string): boolean {
  return (resource.meta?.tag ?? []).some((tag) => tag.system === system && tag.code === code);
}

function hasSandboxTag(resource: FhirResource, sandboxId: string): boolean {
  return hasTag(resource, SANDBOX_TAG_SYSTEM, sandboxId);
}

function sandboxTags(sandboxId: string): Array<{ system: string; code: string }> {
  return [{ system: SANDBOX_TAG_SYSTEM, code: sandboxId }];
}

function extensionValueString(resource: FhirResource, suffix: string): string {
  const extensions = Array.isArray(resource.extension) ? resource.extension : [];
  const match = extensions.find(
    (extension) =>
      typeof extension === 'object' &&
      extension !== null &&
      (extension as { url?: string }).url === `${EXT_BASE}/${suffix}`,
  ) as Record<string, unknown> | undefined;
  const value = match?.valueString ?? match?.valueCode ?? match?.valueDate ?? match?.valueBoolean;
  return primitiveToString(value);
}

function primitiveToString(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return `${value}`;
  }
  return '';
}

function contentData(resource: FhirResource, contentType: string): string {
  const content = Array.isArray(resource.content) ? resource.content : [];
  const item = content.find(
    (candidate) =>
      typeof candidate === 'object' &&
      candidate !== null &&
      (candidate as { contentType?: string }).contentType === contentType,
  ) as Record<string, unknown> | undefined;
  return typeof item?.data === 'string' ? Buffer.from(item.data, 'base64').toString('utf8') : '';
}

function statusFromLifecycle(lifecycle: Lifecycle): string {
  if (lifecycle === 'published' || lifecycle === 'validated') {
    return 'active';
  }
  if (lifecycle === 'retired') {
    return 'retired';
  }
  return 'draft';
}

function lifecycleFromStatus(status: string, extensionLifecycle: string): Lifecycle {
  if (extensionLifecycle) {
    return extensionLifecycle as Lifecycle;
  }
  if (status === 'active') {
    return 'published';
  }
  if (status === 'retired') {
    return 'retired';
  }
  return 'draft';
}

function maxSeverity(cards: CdsCard[]): Severity | 'none' {
  if (cards.some((card) => card.severity === 'critical')) {
    return 'critical';
  }
  if (cards.some((card) => card.severity === 'warning')) {
    return 'warning';
  }
  if (cards.some((card) => card.severity === 'info')) {
    return 'info';
  }
  return 'none';
}

function sortCardsBySeverity(cards: CdsCard[]): void {
  const rank: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
  cards.sort((left, right) => rank[left.severity] - rank[right.severity]);
}

interface CodeDefinition {
  system: string;
  code: string;
  display: string;
}

interface ObservationDefinition extends CodeDefinition {
  unit: string;
  unitCode: string;
  category: 'vital-signs' | 'laboratory';
}

interface MedicationDefinition extends CodeDefinition {
  dosage: string;
}

interface AllergyDefinition extends CodeDefinition {
  category: 'food' | 'medication' | 'environment' | 'biologic';
  criticality: 'low' | 'high' | 'unable-to-assess';
}

interface EncounterDefinitionItem extends CodeDefinition {
  classCode: string;
  classDisplay: string;
}

const CONDITION_RESOURCE_CATALOG: Record<string, CodeDefinition> = {
  diabetes: { system: SNOMED_SYSTEM, code: '44054006', display: 'Diabetes mellitus' },
  hypertension: { system: SNOMED_SYSTEM, code: '38341003', display: 'Hypertensive disorder' },
  asthma: { system: SNOMED_SYSTEM, code: '195967001', display: 'Asthma' },
  kidneyDisease: { system: SNOMED_SYSTEM, code: '709044004', display: 'Chronic kidney disease' },
  pregnancy: { system: SNOMED_SYSTEM, code: '77386006', display: 'Pregnant' },
  depression: { system: SNOMED_SYSTEM, code: '35489007', display: 'Depressive disorder' },
};

const OBSERVATION_RESOURCE_CATALOG: Record<string, ObservationDefinition> = {
  systolicBloodPressure: {
    system: LOINC_SYSTEM,
    code: '8480-6',
    display: 'Systolic Blood Pressure',
    unit: 'mmHg',
    unitCode: 'mm[Hg]',
    category: 'vital-signs',
  },
  diastolicBloodPressure: {
    system: LOINC_SYSTEM,
    code: '8462-4',
    display: 'Diastolic Blood Pressure',
    unit: 'mmHg',
    unitCode: 'mm[Hg]',
    category: 'vital-signs',
  },
  hba1c: {
    system: LOINC_SYSTEM,
    code: '4548-4',
    display: 'Hemoglobin A1c/Hemoglobin.total in Blood',
    unit: '%',
    unitCode: '%',
    category: 'laboratory',
  },
  fastingGlucose: {
    system: LOINC_SYSTEM,
    code: '1558-6',
    display: 'Glucose [Mass/volume] in Serum or Plasma --fasting',
    unit: 'mg/dL',
    unitCode: 'mg/dL',
    category: 'laboratory',
  },
  ldlCholesterol: {
    system: LOINC_SYSTEM,
    code: '13457-7',
    display: 'Cholesterol in LDL [Mass/volume] in Serum or Plasma',
    unit: 'mg/dL',
    unitCode: 'mg/dL',
    category: 'laboratory',
  },
  creatinine: {
    system: LOINC_SYSTEM,
    code: '2160-0',
    display: 'Creatinine [Mass/volume] in Serum or Plasma',
    unit: 'mg/dL',
    unitCode: 'mg/dL',
    category: 'laboratory',
  },
  egfr: {
    system: LOINC_SYSTEM,
    code: '33914-3',
    display: 'Glomerular filtration rate/1.73 sq M.predicted',
    unit: 'mL/min/1.73m2',
    unitCode: 'mL/min/{1.73_m2}',
    category: 'laboratory',
  },
  oxygenSaturation: {
    system: LOINC_SYSTEM,
    code: '59408-5',
    display: 'Oxygen saturation in Arterial blood by Pulse oximetry',
    unit: '%',
    unitCode: '%',
    category: 'vital-signs',
  },
  heartRate: {
    system: LOINC_SYSTEM,
    code: '8867-4',
    display: 'Heart rate',
    unit: '/min',
    unitCode: '/min',
    category: 'vital-signs',
  },
};

const MEDICATION_RESOURCE_CATALOG: Record<string, MedicationDefinition> = {
  metformin: {
    system: RXNORM_SYSTEM,
    code: '860975',
    display: 'metformin hydrochloride 500 MG Oral Tablet',
    dosage: '500 mg por via oral cada 12 horas',
  },
  insulinGlargine: {
    system: RXNORM_SYSTEM,
    code: '274783',
    display: 'insulin glargine',
    dosage: '10 unidades subcutaneas nocturnas',
  },
  lisinopril: {
    system: RXNORM_SYSTEM,
    code: '314076',
    display: 'lisinopril 10 MG Oral Tablet',
    dosage: '10 mg por via oral al dia',
  },
  atorvastatin: {
    system: RXNORM_SYSTEM,
    code: '617314',
    display: 'atorvastatin 20 MG Oral Tablet',
    dosage: '20 mg por via oral al dia',
  },
  amoxicillin: {
    system: RXNORM_SYSTEM,
    code: '308182',
    display: 'amoxicillin 500 MG Oral Capsule',
    dosage: '500 mg por via oral cada 8 horas',
  },
};

const ALLERGY_RESOURCE_CATALOG: Record<string, AllergyDefinition> = {
  penicillin: {
    system: SNOMED_SYSTEM,
    code: '91936005',
    display: 'Allergy to penicillin',
    category: 'medication',
    criticality: 'high',
  },
  latex: {
    system: SNOMED_SYSTEM,
    code: '300916003',
    display: 'Latex allergy',
    category: 'environment',
    criticality: 'high',
  },
  peanut: {
    system: SNOMED_SYSTEM,
    code: '91935009',
    display: 'Allergy to peanut',
    category: 'food',
    criticality: 'high',
  },
};

const ENCOUNTER_RESOURCE_CATALOG: Record<string, EncounterDefinitionItem> = {
  ambulatory: {
    system: SNOMED_SYSTEM,
    code: '185349003',
    display: 'Encounter for check up',
    classCode: 'AMB',
    classDisplay: 'ambulatory',
  },
  emergency: {
    system: SNOMED_SYSTEM,
    code: '50849002',
    display: 'Emergency room admission',
    classCode: 'EMER',
    classDisplay: 'emergency',
  },
  inpatient: {
    system: SNOMED_SYSTEM,
    code: '32485007',
    display: 'Hospital admission',
    classCode: 'IMP',
    classDisplay: 'inpatient encounter',
  },
};

const PROCEDURE_RESOURCE_CATALOG: Record<string, CodeDefinition> = {
  appendectomy: { system: SNOMED_SYSTEM, code: '80146002', display: 'Appendectomy' },
  dialysis: { system: SNOMED_SYSTEM, code: '108241001', display: 'Hemodialysis' },
  colonoscopy: { system: SNOMED_SYSTEM, code: '73761001', display: 'Colonoscopy' },
  cesarean: { system: SNOMED_SYSTEM, code: '11466000', display: 'Cesarean section' },
};

const IMMUNIZATION_RESOURCE_CATALOG: Record<string, CodeDefinition> = {
  influenza: { system: 'http://hl7.org/fhir/sid/cvx', code: '141', display: 'Influenza vaccine' },
  covid19: { system: 'http://hl7.org/fhir/sid/cvx', code: '207', display: 'COVID-19 vaccine' },
  hepatitisB: { system: 'http://hl7.org/fhir/sid/cvx', code: '45', display: 'Hepatitis B vaccine' },
};

const SERVICE_REQUEST_RESOURCE_CATALOG: Record<string, CodeDefinition> = {
  completeBloodCount: {
    system: LOINC_SYSTEM,
    code: '58410-2',
    display: 'Complete blood count panel',
  },
  lipidPanel: { system: LOINC_SYSTEM, code: '57698-3', display: 'Lipid panel' },
  chestXray: { system: SNOMED_SYSTEM, code: '168731009', display: 'Chest X-ray' },
  cardiologyReferral: {
    system: SNOMED_SYSTEM,
    code: '306206005',
    display: 'Referral to cardiology service',
  },
};

function mergePatientOverlay(
  current: PatientOverlay,
  input: PatientClinicalUpdate,
): PatientOverlay {
  return {
    birthDate: input.birthDate ?? current.birthDate,
    gender: input.gender ?? current.gender,
    observations: normalizeObservationOverlay({
      ...current.observations,
      systolicBloodPressure:
        input.systolicBloodPressure ?? current.observations?.systolicBloodPressure,
      diastolicBloodPressure:
        input.diastolicBloodPressure ?? current.observations?.diastolicBloodPressure,
      hba1c: input.hba1c ?? current.observations?.hba1c,
      fastingGlucose: input.fastingGlucose ?? current.observations?.fastingGlucose,
      ldlCholesterol: input.ldlCholesterol ?? current.observations?.ldlCholesterol,
      bodyMassIndex: input.bodyMassIndex ?? current.observations?.bodyMassIndex,
      bodyWeight: input.bodyWeight ?? current.observations?.bodyWeight,
      bodyHeight: input.bodyHeight ?? current.observations?.bodyHeight,
    }),
    conditions: normalizeConditionOverlay({
      ...current.conditions,
      diabetes: input.diabetesCondition ?? current.conditions?.diabetes,
    }),
    medications: normalizeMedicationOverlay({
      ...current.medications,
      metformin: input.metforminMedication ?? current.medications?.metformin,
    }),
    encounterType: input.encounterType ?? current.encounterType,
    clinicalResources:
      input.clinicalResources === undefined
        ? current.clinicalResources
        : normalizeClinicalResources(input.clinicalResources),
  };
}

function hasPatientOverlay(overlay: PatientOverlay): boolean {
  return (
    Boolean(overlay.birthDate) ||
    Boolean(overlay.gender) ||
    hasObservationOverlay(overlay.observations) ||
    hasConditionOverlay(overlay.conditions) ||
    hasMedicationOverlay(overlay.medications) ||
    Boolean(normalizeEncounterType(overlay.encounterType)) ||
    hasClinicalResourceOverlay(overlay.clinicalResources)
  );
}

function observationOverlayFromJson(value: string): ObservationOverlay {
  if (!value) {
    return {};
  }
  try {
    const payload = JSON.parse(value) as Record<string, unknown>;
    return normalizeObservationOverlay({
      systolicBloodPressure: numberField(payload, 'systolicBloodPressure'),
      diastolicBloodPressure: numberField(payload, 'diastolicBloodPressure'),
      hba1c: numberField(payload, 'hba1c'),
      fastingGlucose: numberField(payload, 'fastingGlucose'),
      ldlCholesterol: numberField(payload, 'ldlCholesterol'),
      bodyMassIndex: numberField(payload, 'bodyMassIndex'),
      bodyWeight: numberField(payload, 'bodyWeight'),
      bodyHeight: numberField(payload, 'bodyHeight'),
    });
  } catch {
    return {};
  }
}

function normalizeObservationOverlay(
  observations: ObservationOverlay | undefined,
): ObservationOverlay {
  return {
    ...(validNumber(observations?.systolicBloodPressure)
      ? { systolicBloodPressure: observations.systolicBloodPressure }
      : {}),
    ...(validNumber(observations?.diastolicBloodPressure)
      ? { diastolicBloodPressure: observations.diastolicBloodPressure }
      : {}),
    ...(validNumber(observations?.hba1c) ? { hba1c: observations.hba1c } : {}),
    ...(validNumber(observations?.fastingGlucose)
      ? { fastingGlucose: observations.fastingGlucose }
      : {}),
    ...(validNumber(observations?.ldlCholesterol)
      ? { ldlCholesterol: observations.ldlCholesterol }
      : {}),
    ...(validNumber(observations?.bodyMassIndex)
      ? { bodyMassIndex: observations.bodyMassIndex }
      : {}),
    ...(validNumber(observations?.bodyWeight) ? { bodyWeight: observations.bodyWeight } : {}),
    ...(validNumber(observations?.bodyHeight) ? { bodyHeight: observations.bodyHeight } : {}),
  };
}

function hasObservationOverlay(observations: ObservationOverlay | undefined): boolean {
  return Object.keys(normalizeObservationOverlay(observations)).length > 0;
}

function conditionOverlayFromJson(value: string): ConditionOverlay {
  if (!value) {
    return {};
  }
  try {
    const payload = JSON.parse(value) as Record<string, unknown>;
    return normalizeConditionOverlay({ diabetes: booleanField(payload, 'diabetes') });
  } catch {
    return {};
  }
}

function normalizeConditionOverlay(conditions: ConditionOverlay | undefined): ConditionOverlay {
  return conditions?.diabetes ? { diabetes: true } : {};
}

function hasConditionOverlay(conditions: ConditionOverlay | undefined): boolean {
  return Object.keys(normalizeConditionOverlay(conditions)).length > 0;
}

function medicationOverlayFromJson(value: string): MedicationOverlay {
  if (!value) {
    return {};
  }
  try {
    const payload = JSON.parse(value) as Record<string, unknown>;
    return normalizeMedicationOverlay({ metformin: booleanField(payload, 'metformin') });
  } catch {
    return {};
  }
}

function normalizeMedicationOverlay(medications: MedicationOverlay | undefined): MedicationOverlay {
  return medications?.metformin ? { metformin: true } : {};
}

function hasMedicationOverlay(medications: MedicationOverlay | undefined): boolean {
  return Object.keys(normalizeMedicationOverlay(medications)).length > 0;
}

function normalizeGender(value: unknown): PatientGender | undefined {
  return ['male', 'female', 'other', 'unknown'].includes(String(value))
    ? (String(value) as PatientGender)
    : undefined;
}

function normalizeEncounterType(value: unknown): DemoEncounterType | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value || 'none';
  if (normalized === 'none') {
    return undefined;
  }
  return ['ambulatory', 'emergency', 'inpatient'].includes(normalized)
    ? (normalized as DemoEncounterType)
    : undefined;
}

function clinicalResourcesFromJson(value: string): EditableClinicalResource[] {
  if (!value) {
    return [];
  }
  try {
    return normalizeClinicalResources(JSON.parse(value));
  } catch {
    return [];
  }
}

function normalizeClinicalResources(value: unknown): EditableClinicalResource[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .slice(0, 60)
    .map((item) => normalizeClinicalResource(item))
    .filter((item): item is EditableClinicalResource => Boolean(item));
}

function normalizeClinicalResource(value: unknown): EditableClinicalResource | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  const id =
    typeof candidate.id === 'string' && /^[A-Za-z0-9_-]{1,48}$/.test(candidate.id)
      ? candidate.id
      : '';
  const type = normalizeClinicalResourceType(candidate.type);
  const code = typeof candidate.code === 'string' ? candidate.code : '';
  if (!id || !type || !clinicalResourceCatalogHas(type, code)) {
    return null;
  }
  const normalized: EditableClinicalResource = {
    id,
    type,
    code,
    status: normalizeResourceStatus(type, primitiveToString(candidate.status)),
    date: normalizeClinicalDate(candidate.date),
  };
  if (type === 'observation') {
    const valueNumber = Number(candidate.value);
    if (!Number.isFinite(valueNumber)) {
      return null;
    }
    normalized.value = valueNumber;
  }
  return normalized;
}

function normalizeClinicalResourceType(value: unknown): EditableClinicalResourceType | undefined {
  return [
    'condition',
    'observation',
    'medication',
    'allergy',
    'encounter',
    'procedure',
    'immunization',
    'serviceRequest',
  ].includes(String(value))
    ? (String(value) as EditableClinicalResourceType)
    : undefined;
}

function normalizeClinicalDate(value: unknown): string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : today();
}

function normalizeResourceStatus(
  type: EditableClinicalResourceType,
  status: string | undefined,
): string {
  const allowed: Record<EditableClinicalResourceType, string[]> = {
    condition: ['active', 'resolved'],
    observation: ['final', 'preliminary'],
    medication: ['active', 'completed', 'stopped'],
    allergy: ['active', 'inactive'],
    encounter: ['finished', 'in-progress', 'planned'],
    procedure: ['completed', 'in-progress', 'not-done'],
    immunization: ['completed', 'not-done'],
    serviceRequest: ['active', 'completed', 'draft'],
  };
  return allowed[type].includes(status ?? '') ? (status as string) : (allowed[type][0] ?? 'active');
}

function clinicalResourceCatalogHas(type: EditableClinicalResourceType, code: string): boolean {
  const catalogs: Record<EditableClinicalResourceType, Record<string, unknown>> = {
    condition: CONDITION_RESOURCE_CATALOG,
    observation: OBSERVATION_RESOURCE_CATALOG,
    medication: MEDICATION_RESOURCE_CATALOG,
    allergy: ALLERGY_RESOURCE_CATALOG,
    encounter: ENCOUNTER_RESOURCE_CATALOG,
    procedure: PROCEDURE_RESOURCE_CATALOG,
    immunization: IMMUNIZATION_RESOURCE_CATALOG,
    serviceRequest: SERVICE_REQUEST_RESOURCE_CATALOG,
  };
  return Boolean(catalogs[type][code]);
}

function hasClinicalResourceOverlay(resources: EditableClinicalResource[] | undefined): boolean {
  return normalizeClinicalResources(resources).length > 0;
}

function validNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function numberField(resource: Record<string, unknown>, field: string): number | undefined {
  const value = resource[field];
  return validNumber(value) ? value : undefined;
}

function booleanField(resource: Record<string, unknown>, field: string): boolean | undefined {
  const value = resource[field];
  return typeof value === 'boolean' ? value : undefined;
}

function observationNumberValue(
  bundle: FhirBundle,
  overlayKind: string,
  loincCode: string,
): number | undefined {
  const observations = resourcesOfType(bundle, 'Observation');
  const match =
    observations.find((observation) => observation.id === observationId(overlayKind)) ??
    observations.find((observation) => hasCoding(observation, LOINC_SYSTEM, loincCode));
  return quantityNumber(match);
}

function hasClinicalCoding(
  bundle: FhirBundle,
  resourceType: string,
  system: string,
  code: string,
): boolean {
  return resourcesOfType(bundle, resourceType).some((resource) =>
    resourceType === 'MedicationRequest'
      ? hasCodingInField(resource, 'medicationCodeableConcept', system, code)
      : hasCoding(resource, system, code),
  );
}

function hasCoding(resource: FhirResource, system: string, code: string): boolean {
  return hasCodingInField(resource, 'code', system, code);
}

function hasCodingInField(
  resource: FhirResource,
  field: string,
  system: string,
  code: string,
): boolean {
  const codingValue = objectField(resource, field).coding;
  const codings = Array.isArray(codingValue) ? codingValue : [];
  return codings.some(
    (coding) =>
      typeof coding === 'object' &&
      coding !== null &&
      (coding as { system?: string }).system === system &&
      (coding as { code?: string }).code === code,
  );
}

function quantityNumber(resource: FhirResource | undefined): number | undefined {
  const quantity = resource ? objectField(resource, 'valueQuantity') : {};
  const value = quantity.value;
  return validNumber(value) ? value : undefined;
}

function encounterTypeFromBundle(bundle: FhirBundle): DemoEncounterType {
  const overlay = resourcesOfType(bundle, 'Encounter').find(
    (encounter) => encounter.id === encounterId('demo'),
  );
  const classCode = stringField(objectField(overlay ?? {}, 'class'), 'code');
  if (classCode === 'EMER') {
    return 'emergency';
  }
  if (classCode === 'IMP') {
    return 'inpatient';
  }
  if (classCode === 'AMB') {
    return 'ambulatory';
  }
  return 'none';
}

function encounterDefinition(type: DemoEncounterType): {
  classCode: string;
  classDisplay: string;
  typeCode: string;
  typeDisplay: string;
} | null {
  const definitions: Record<
    Exclude<DemoEncounterType, 'none'>,
    {
      classCode: string;
      classDisplay: string;
      typeCode: string;
      typeDisplay: string;
    }
  > = {
    ambulatory: {
      classCode: 'AMB',
      classDisplay: 'ambulatory',
      typeCode: '185349003',
      typeDisplay: 'Encounter for check up',
    },
    emergency: {
      classCode: 'EMER',
      classDisplay: 'emergency',
      typeCode: '50849002',
      typeDisplay: 'Emergency room admission',
    },
    inpatient: {
      classCode: 'IMP',
      classDisplay: 'inpatient encounter',
      typeCode: '32485007',
      typeDisplay: 'Hospital admission',
    },
  };
  return type === 'none' ? null : definitions[type];
}

function observationId(kind: string): string {
  return `rce-demo-${kind}`;
}

function conditionId(kind: string): string {
  return `rce-demo-condition-${kind}`;
}

function medicationRequestId(kind: string): string {
  return `rce-demo-medication-${kind}`;
}

function encounterId(kind: string): string {
  return `rce-demo-encounter-${kind}`;
}

function clinicalResourceId(resource: EditableClinicalResource): string {
  return `rce-demo-resource-${hash(`${resource.type}:${resource.id}`).slice(0, 28)}`;
}

function isGeneratedClinicalResource(resource: FhirResource | undefined): boolean {
  return typeof resource?.id === 'string' && resource.id.startsWith('rce-demo-resource-');
}

function overlayId(patientId: string, sandboxId: string): string {
  return `rce-sbx-${hash(`${sandboxId}:${patientId}`).slice(0, 32)}`;
}

function activityToResource(entry: ActivityEntry, sandboxId?: string): FhirResource {
  return {
    resourceType: 'Basic',
    id: entry.id,
    meta: {
      tag: [
        { system: ACTIVITY_TAG_SYSTEM, code: ACTIVITY_TAG_CODE },
        ...(sandboxId ? sandboxTags(sandboxId) : []),
      ],
    },
    code: { coding: [{ system: OVERLAY_CODE_SYSTEM, code: 'cds-activity' }] },
    subject: { reference: `Patient/${entry.patientId}` },
    extension: [{ url: `${EXT_BASE}/activity-payload`, valueString: JSON.stringify(entry) }],
  };
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function metadataWithVersion(metadata: RuleMetadataInput, version: string): RuleMetadata {
  return {
    title: metadata.title,
    name: metadata.name,
    version,
    hook: metadata.hook,
    expression: metadata.expression,
    summary: metadata.summary,
    detail: metadata.detail,
    indicator: metadata.indicator,
  };
}

function normalizeRuleVersion(value?: string): string {
  if (!value || !RULE_VERSION_PATTERN.test(value)) {
    return INITIAL_RULE_VERSION;
  }
  const [core = INITIAL_RULE_VERSION] = value.split('-');
  const [major = '0', minor = '0', patch = '0'] = core.split('.');
  return `${Number(major)}.${Number(minor)}.${Number(patch)}`;
}

function nextPatchRuleVersion(value?: string): string {
  const parts = normalizeRuleVersion(value).split('.').map(Number);
  const major = parts[0] ?? 0;
  const minor = parts[1] ?? 0;
  const patch = parts[2] ?? 0;
  return `${major}.${minor}.${patch + 1}`;
}

function publishedRuleVersion(value?: string): string {
  const normalized = normalizeRuleVersion(value);
  return normalized === INITIAL_RULE_VERSION ? FIRST_PUBLISHED_RULE_VERSION : normalized;
}

function cqlWithLibraryVersion(cqlText: string, name: string, version: string): string {
  const header = `library ${name} version '${version}'`;
  if (!cqlText.trim()) {
    return `${header}\n`;
  }
  if (CQL_LIBRARY_DECLARATION_PATTERN.test(cqlText)) {
    return cqlText.replace(CQL_LIBRARY_DECLARATION_PATTERN, `$1${name} version '${version}'$2`);
  }
  return `${header}\n\n${cqlText}`;
}

function assertDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new UnprocessableEntityException('birthDate debe usar formato YYYY-MM-DD.');
  }
}

function hasAnySandboxTag(resource: FhirResource): boolean {
  return (resource.meta?.tag ?? []).some((tag) => tag.system === SANDBOX_TAG_SYSTEM);
}
