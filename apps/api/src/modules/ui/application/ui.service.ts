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

export type Severity = 'info' | 'warning' | 'critical';
export type Lifecycle = 'draft' | 'validated' | 'published' | 'disabled' | 'retired';
export type RuleHook = 'patient-view' | 'order-select' | 'order-sign';
export type RuleScope = 'sandbox' | 'shared';

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
}

interface PatientClinicalSummary {
  activeConditions: string[];
  lastEncounter: string;
}

interface CachedValue<T> {
  expiresAt: number;
  value: T;
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
    const cards = await this.evaluateActiveRules(patientId, sandboxId, 'patient-view', false);
    return this.patientBundleToDetail(patient, bundle, cards.cards, Boolean(overlay.birthDate));
  }

  async updatePatientBirthDate(
    patientId: string,
    sandboxId: string,
    birthDate: string,
  ): Promise<{
    patient: PatientDetail;
    cards: CdsCard[];
    activity: ActivityEntry;
  }> {
    assertDate(birthDate);
    const patient = await this.fhir.read('Patient', patientId);
    if (!patient) {
      throw new NotFoundException('Paciente no encontrado en HAPI.');
    }
    await this.savePatientOverlay(patientId, sandboxId, { birthDate });
    const evaluation = await this.evaluateActiveRules(patientId, sandboxId, 'patient-view', true);
    const detail = await this.getPatient(patientId, sandboxId);
    return { patient: detail, cards: evaluation.cards, activity: evaluation.activity };
  }

  async getPatientCards(patientId: string, sandboxId: string): Promise<CdsCard[]> {
    return (await this.evaluateActiveRules(patientId, sandboxId, 'patient-view', false)).cards;
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
    metadata: RuleMetadata,
    cqlText: string,
  ): Promise<ClinicalRule> {
    const id = `rce-rule-${hash(`${sandboxId}:${metadata.name}:${Date.now()}`).slice(0, 24)}`;
    const library = this.ruleToLibrary(
      {
        id,
        title: metadata.title,
        cqlName: metadata.name,
        version: metadata.version,
        lifecycle: 'draft',
        hook: metadata.hook,
        activation: false,
        modified: today(),
        scope: 'sandbox',
        cql: cqlText,
        metadata,
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
    metadata: RuleMetadata,
  ): Promise<ClinicalRule> {
    const current = await this.getRule(id, sandboxId);
    const next = {
      ...current,
      cql: cqlText,
      metadata,
      title: metadata.title,
      cqlName: metadata.name,
      version: metadata.version,
      hook: metadata.hook,
      lifecycle: 'draft' as Lifecycle,
      modified: today(),
    };
    const saved = await this.fhir.update('Library', id, this.ruleToLibrary(next, sandboxId));
    return this.libraryToRule(saved, sandboxId) ?? next;
  }

  async validateRule(
    id: string,
    sandboxId: string,
    cqlText: string,
  ): Promise<{ valid: boolean; diagnostics: unknown[]; elm?: string }> {
    const current = await this.getRule(id, sandboxId);
    const translation = await this.translator.translate({
      cql: cqlText,
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
      cql: cqlText,
      lifecycle: 'validated' as Lifecycle,
      modified: today(),
    };
    const resource = this.ruleToLibrary(next, sandboxId, elm);
    await this.fhir.update('Library', id, resource);
    return { valid: true, diagnostics: [], elm };
  }

  async publishRule(id: string, sandboxId: string): Promise<ClinicalRule> {
    const current = await this.getRule(id, sandboxId);
    const next = {
      ...current,
      lifecycle: 'published' as Lifecycle,
      activation: true,
      scope: 'shared' as RuleScope,
      modified: today(),
    };
    const saved = await this.fhir.update('Library', id, this.ruleToLibrary(next, sandboxId));
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
    const merged = overlay.birthDate ? { ...patient, birthDate: overlay.birthDate } : patient;
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
      sandboxTouched: Boolean(overlay.birthDate),
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
    };
  }

  private async savePatientOverlay(
    patientId: string,
    sandboxId: string,
    overlay: PatientOverlay,
  ): Promise<void> {
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
      ],
    });
  }

  private patientBundleToDetail(
    patient: FhirResource,
    bundle: FhirBundle,
    cards: CdsCard[],
    sandboxTouched: boolean,
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
      conditions,
      observations,
      medications,
      encounters,
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
      version: stringField(resource, 'version') || '0.1.0',
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
      name: rule.metadata.name,
      title: rule.metadata.title,
      version: rule.metadata.version,
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

  private async evaluateActiveRules(
    patientId: string,
    sandboxId: string,
    hook: RuleHook,
    persistActivity: boolean,
  ): Promise<{ cards: CdsCard[]; activity: ActivityEntry }> {
    const startedAt = performance.now();
    const [rules, bundle] = await Promise.all([
      this.listRules(sandboxId, { hook, activation: 'active' }),
      this.patientBundleWithOverlay(patientId, sandboxId),
    ]);
    const patient = firstResourceOfType(bundle, 'Patient');
    const cards: CdsCard[] = [];
    const warnings: string[] = [];
    const consideredResources = [`Patient/${patientId}`];
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
    const activity = await this.saveActivity(
      {
        patientId,
        patientName: patient ? patientDisplay(patient) : patientId,
        hook,
        rules: rules.map((rule) => `${rule.cqlName} ${rule.version}`),
        cards,
        durationMs: Math.round(performance.now() - startedAt),
        correlationId: `corr-${hash(`${sandboxId}:${patientId}:${Date.now()}`).slice(0, 10)}`,
        consideredResources: [...new Set(consideredResources)],
        warnings,
        scope: 'sandbox',
      },
      sandboxId,
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

function codeDisplay(resource: FhirResource): string {
  if (typeof resource.text === 'string') {
    return resource.text;
  }
  const coding = Array.isArray(resource.coding)
    ? firstArrayItem(resource.coding)
    : firstArrayItem(objectField(resource, 'code').coding);
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
    value: typeof value === 'string' ? value : codeDisplay(value as FhirResource),
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

function assertDate(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new UnprocessableEntityException('birthDate debe usar formato YYYY-MM-DD.');
  }
}

function hasAnySandboxTag(resource: FhirResource): boolean {
  return (resource.meta?.tag ?? []).some((tag) => tag.system === SANDBOX_TAG_SYSTEM);
}
