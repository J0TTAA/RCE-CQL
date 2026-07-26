import type {
  ActivityEntry,
  CdsCard,
  ClinicalRule,
  Diagnostic,
  PatientDetail,
  RuleTestResult,
  ValidationResult,
} from '../types';

export const adultRiskCql = `library AdultRiskAssessment version '0.1.0'

using FHIR version '4.0.1'

include FHIRHelpers version '4.0.1'

context Patient

define "Es Adulto":
  AgeInYears() >= 18

define "Presion Sistolica Alta":
  exists (
    [Observation: code in "Presion Arterial Sistolica"] O
      where O.value > 140 'mm[Hg]'
  )

define "HbA1c Elevada":
  exists (
    [Observation: code in "Hemoglobina Glicosilada"] O
      where O.value >= 7.0 '%'
  )

define "Riesgo Elevado":
  "Es Adulto" and "Presion Sistolica Alta" and "HbA1c Elevada"
`;

export const invalidCql = `library DraftInvalidRule version '0.0.1'

using FHIR version '4.0.1'

context Patient

define "Condicion Incompleta":
  exists (
    [Condition: code in "Diabetes"] C
      where C.clinicalStatus =

define "Sin Retorno"
  AgeInYears() >
`;

export const patientsFixture: PatientDetail[] = [
  {
    id: 'pat-adult-risk',
    synId: 'SYN-4821',
    name: 'Paciente Sintético A',
    age: 58,
    cohort: 'adultos',
    sex: 'masculino',
    birthDate: '1967-03-14',
    activeConditions: ['Hipertensión esencial', 'Diabetes mellitus tipo 2'],
    lastEncounter: '2026-07-12',
    cdsStatus: 'warning',
    cdsCount: 2,
    conditions: [
      {
        id: 'c1',
        code: 'I10',
        display: 'Hipertensión esencial',
        clinicalStatus: 'activa',
        onsetDate: '2019-05-02',
      },
      {
        id: 'c2',
        code: 'E11',
        display: 'Diabetes mellitus tipo 2',
        clinicalStatus: 'activa',
        onsetDate: '2021-11-20',
      },
    ],
    observations: [
      {
        id: 'o1',
        code: '85354-9',
        display: 'Presión arterial sistólica',
        value: '156',
        unit: 'mmHg',
        effectiveDate: '2026-07-12',
        interpretation: 'alto',
      },
      {
        id: 'o2',
        code: '4548-4',
        display: 'Hemoglobina glicosilada',
        value: '8.4',
        unit: '%',
        effectiveDate: '2026-06-30',
        interpretation: 'alto',
      },
      {
        id: 'o3',
        code: '2093-3',
        display: 'Colesterol total',
        value: '212',
        unit: 'mg/dL',
        effectiveDate: '2026-06-30',
        interpretation: 'alto',
      },
    ],
    medications: [
      {
        id: 'm1',
        display: 'Enalapril',
        dose: '10 mg',
        route: 'oral',
        status: 'activa',
        startDate: '2019-05-10',
      },
      {
        id: 'm2',
        display: 'Metformina',
        dose: '850 mg',
        route: 'oral',
        status: 'activa',
        startDate: '2021-12-01',
      },
    ],
    encounters: [
      {
        id: 'e1',
        type: 'Control ambulatorio',
        reason: 'Seguimiento de riesgo cardiovascular',
        date: '2026-07-12',
        clinician: 'Dra. Sintética',
        status: 'finalizado',
      },
      {
        id: 'e2',
        type: 'Laboratorio',
        reason: 'Perfil metabólico',
        date: '2026-06-30',
        clinician: 'Laboratorio central',
        status: 'finalizado',
      },
    ],
    timeline: [
      { id: 't1', date: '2026-07-12', kind: 'encuentro', label: 'Control ambulatorio' },
      { id: 't2', date: '2026-06-30', kind: 'observación', label: 'HbA1c 8.4 %' },
      { id: 't3', date: '2021-11-20', kind: 'condición', label: 'Diagnóstico DM2' },
    ],
  },
  {
    id: 'pat-low-risk',
    synId: 'SYN-1902',
    name: 'Paciente Sintético B',
    age: 34,
    cohort: 'adultos',
    sex: 'femenino',
    birthDate: '1991-09-01',
    activeConditions: ['Rinitis alérgica'],
    lastEncounter: '2026-05-18',
    cdsStatus: 'none',
    cdsCount: 0,
    conditions: [
      {
        id: 'c1',
        code: 'J30.1',
        display: 'Rinitis alérgica',
        clinicalStatus: 'activa',
        onsetDate: '2015-04-10',
      },
    ],
    observations: [
      {
        id: 'o1',
        code: '85354-9',
        display: 'Presión arterial sistólica',
        value: '118',
        unit: 'mmHg',
        effectiveDate: '2026-05-18',
        interpretation: 'normal',
      },
      {
        id: 'o2',
        code: '4548-4',
        display: 'Hemoglobina glicosilada',
        value: '5.1',
        unit: '%',
        effectiveDate: '2026-05-18',
        interpretation: 'normal',
      },
    ],
    medications: [
      {
        id: 'm1',
        display: 'Loratadina',
        dose: '10 mg',
        route: 'oral',
        status: 'activa',
        startDate: '2024-03-01',
      },
    ],
    encounters: [
      {
        id: 'e1',
        type: 'Control ambulatorio',
        reason: 'Chequeo general',
        date: '2026-05-18',
        clinician: 'Dr. Sintético',
        status: 'finalizado',
      },
    ],
    timeline: [
      { id: 't1', date: '2026-05-18', kind: 'encuentro', label: 'Chequeo general' },
      { id: 't2', date: '2015-04-10', kind: 'condición', label: 'Rinitis alérgica' },
    ],
  },
  {
    id: 'pat-child',
    synId: 'SYN-2277',
    name: 'Paciente Sintético C',
    age: 7,
    cohort: 'niños',
    sex: 'masculino',
    birthDate: '2018-12-05',
    activeConditions: ['Asma leve'],
    lastEncounter: '2026-07-01',
    cdsStatus: 'info',
    cdsCount: 1,
    conditions: [
      {
        id: 'c1',
        code: 'J45.0',
        display: 'Asma leve intermitente',
        clinicalStatus: 'activa',
        onsetDate: '2023-08-15',
      },
    ],
    observations: [
      {
        id: 'o1',
        code: '8302-2',
        display: 'Talla',
        value: '122',
        unit: 'cm',
        effectiveDate: '2026-07-01',
        interpretation: 'normal',
      },
      {
        id: 'o2',
        code: '29463-7',
        display: 'Peso',
        value: '24',
        unit: 'kg',
        effectiveDate: '2026-07-01',
        interpretation: 'normal',
      },
    ],
    medications: [
      {
        id: 'm1',
        display: 'Salbutamol inhalador',
        dose: '100 mcg',
        route: 'inhalatoria',
        status: 'activa',
        startDate: '2023-08-20',
      },
    ],
    encounters: [
      {
        id: 'e1',
        type: 'Control pediátrico',
        reason: 'Control de crecimiento',
        date: '2026-07-01',
        clinician: 'Dra. Sintética',
        status: 'finalizado',
      },
    ],
    timeline: [
      { id: 't1', date: '2026-07-01', kind: 'encuentro', label: 'Control pediátrico' },
      { id: 't2', date: '2023-08-15', kind: 'condición', label: 'Asma leve' },
    ],
  },
  {
    id: 'pat-teen',
    synId: 'SYN-3390',
    name: 'Paciente Sintético D',
    age: 15,
    cohort: 'adolescentes',
    sex: 'femenino',
    birthDate: '2010-10-22',
    activeConditions: ['Obesidad'],
    lastEncounter: '2026-06-11',
    cdsStatus: 'warning',
    cdsCount: 1,
    conditions: [
      {
        id: 'c1',
        code: 'E66.9',
        display: 'Obesidad',
        clinicalStatus: 'activa',
        onsetDate: '2024-02-01',
      },
    ],
    observations: [
      {
        id: 'o1',
        code: '39156-5',
        display: 'Índice de masa corporal',
        value: '31.2',
        unit: 'kg/m2',
        effectiveDate: '2026-06-11',
        interpretation: 'alto',
      },
      {
        id: 'o2',
        code: '85354-9',
        display: 'Presión arterial sistólica',
        value: '128',
        unit: 'mmHg',
        effectiveDate: '2026-06-11',
        interpretation: 'normal',
      },
    ],
    medications: [],
    encounters: [
      {
        id: 'e1',
        type: 'Control adolescente',
        reason: 'Seguimiento nutricional',
        date: '2026-06-11',
        clinician: 'Dr. Sintético',
        status: 'finalizado',
      },
    ],
    timeline: [
      { id: 't1', date: '2026-06-11', kind: 'observación', label: 'IMC 31.2' },
      { id: 't2', date: '2024-02-01', kind: 'condición', label: 'Obesidad' },
    ],
  },
  {
    id: 'pat-elder',
    synId: 'SYN-5510',
    name: 'Paciente Sintético E',
    age: 79,
    cohort: 'adultos mayores',
    sex: 'femenino',
    birthDate: '1946-01-30',
    activeConditions: ['Insuficiencia cardíaca', 'Fibrilación auricular'],
    lastEncounter: '2026-07-20',
    cdsStatus: 'critical',
    cdsCount: 3,
    conditions: [
      {
        id: 'c1',
        code: 'I50.9',
        display: 'Insuficiencia cardíaca',
        clinicalStatus: 'activa',
        onsetDate: '2022-03-11',
      },
      {
        id: 'c2',
        code: 'I48',
        display: 'Fibrilación auricular',
        clinicalStatus: 'activa',
        onsetDate: '2023-09-05',
      },
    ],
    observations: [
      {
        id: 'o1',
        code: '2160-0',
        display: 'Creatinina sérica',
        value: '1.9',
        unit: 'mg/dL',
        effectiveDate: '2026-07-20',
        interpretation: 'alto',
      },
      {
        id: 'o2',
        code: '85354-9',
        display: 'Presión arterial sistólica',
        value: '162',
        unit: 'mmHg',
        effectiveDate: '2026-07-20',
        interpretation: 'crítico',
      },
    ],
    medications: [
      {
        id: 'm1',
        display: 'Warfarina',
        dose: '5 mg',
        route: 'oral',
        status: 'activa',
        startDate: '2023-09-10',
      },
      {
        id: 'm2',
        display: 'Furosemida',
        dose: '40 mg',
        route: 'oral',
        status: 'activa',
        startDate: '2022-03-15',
      },
    ],
    encounters: [
      {
        id: 'e1',
        type: 'Control ambulatorio',
        reason: 'Descompensación leve',
        date: '2026-07-20',
        clinician: 'Dra. Sintética',
        status: 'finalizado',
      },
    ],
    timeline: [
      { id: 't1', date: '2026-07-20', kind: 'observación', label: 'PAS 162 mmHg' },
      { id: 't2', date: '2023-09-05', kind: 'condición', label: 'Fibrilación auricular' },
    ],
  },
  {
    id: 'pat-adult-clean',
    synId: 'SYN-6041',
    name: 'Paciente Sintético F',
    age: 45,
    cohort: 'adultos',
    sex: 'masculino',
    birthDate: '1980-07-19',
    activeConditions: [],
    lastEncounter: '2026-04-02',
    cdsStatus: 'none',
    cdsCount: 0,
    conditions: [],
    observations: [
      {
        id: 'o1',
        code: '85354-9',
        display: 'Presión arterial sistólica',
        value: '122',
        unit: 'mmHg',
        effectiveDate: '2026-04-02',
        interpretation: 'normal',
      },
    ],
    medications: [],
    encounters: [
      {
        id: 'e1',
        type: 'Chequeo laboral',
        reason: 'Examen preventivo',
        date: '2026-04-02',
        clinician: 'Dr. Sintético',
        status: 'finalizado',
      },
    ],
    timeline: [{ id: 't1', date: '2026-04-02', kind: 'encuentro', label: 'Examen preventivo' }],
  },
  {
    id: 'pat-teen-2',
    synId: 'SYN-7188',
    name: 'Paciente Sintético G',
    age: 17,
    cohort: 'adolescentes',
    sex: 'masculino',
    birthDate: '2009-02-14',
    activeConditions: ['Epilepsia'],
    lastEncounter: '2026-06-28',
    cdsStatus: 'info',
    cdsCount: 1,
    conditions: [
      {
        id: 'c1',
        code: 'G40.9',
        display: 'Epilepsia',
        clinicalStatus: 'activa',
        onsetDate: '2020-01-12',
      },
    ],
    observations: [
      {
        id: 'o1',
        code: '3948-5',
        display: 'Nivel de ácido valproico',
        value: '62',
        unit: 'ug/mL',
        effectiveDate: '2026-06-28',
        interpretation: 'normal',
      },
    ],
    medications: [
      {
        id: 'm1',
        display: 'Ácido valproico',
        dose: '500 mg',
        route: 'oral',
        status: 'activa',
        startDate: '2020-01-20',
      },
    ],
    encounters: [
      {
        id: 'e1',
        type: 'Control neurológico',
        reason: 'Seguimiento de niveles',
        date: '2026-06-28',
        clinician: 'Dra. Sintética',
        status: 'finalizado',
      },
    ],
    timeline: [
      { id: 't1', date: '2026-06-28', kind: 'observación', label: 'Valproico 62 ug/mL' },
      { id: 't2', date: '2020-01-12', kind: 'condición', label: 'Epilepsia' },
    ],
  },
  {
    id: 'pat-elder-2',
    synId: 'SYN-8830',
    name: 'Paciente Sintético H',
    age: 68,
    cohort: 'adultos mayores',
    sex: 'masculino',
    birthDate: '1957-11-08',
    activeConditions: ['EPOC', 'Hipertensión esencial'],
    lastEncounter: '2026-07-05',
    cdsStatus: 'warning',
    cdsCount: 2,
    conditions: [
      {
        id: 'c1',
        code: 'J44.9',
        display: 'EPOC',
        clinicalStatus: 'activa',
        onsetDate: '2018-06-01',
      },
      {
        id: 'c2',
        code: 'I10',
        display: 'Hipertensión esencial',
        clinicalStatus: 'activa',
        onsetDate: '2016-02-14',
      },
    ],
    observations: [
      {
        id: 'o1',
        code: '2708-6',
        display: 'Saturación de oxígeno',
        value: '91',
        unit: '%',
        effectiveDate: '2026-07-05',
        interpretation: 'bajo',
      },
      {
        id: 'o2',
        code: '85354-9',
        display: 'Presión arterial sistólica',
        value: '148',
        unit: 'mmHg',
        effectiveDate: '2026-07-05',
        interpretation: 'alto',
      },
    ],
    medications: [
      {
        id: 'm1',
        display: 'Tiotropio inhalador',
        dose: '18 mcg',
        route: 'inhalatoria',
        status: 'activa',
        startDate: '2018-06-10',
      },
    ],
    encounters: [
      {
        id: 'e1',
        type: 'Control ambulatorio',
        reason: 'Control respiratorio',
        date: '2026-07-05',
        clinician: 'Dr. Sintético',
        status: 'finalizado',
      },
    ],
    timeline: [
      { id: 't1', date: '2026-07-05', kind: 'observación', label: 'SatO2 91 %' },
      { id: 't2', date: '2018-06-01', kind: 'condición', label: 'EPOC' },
    ],
  },
];

export const patientCardsFixture: Record<string, CdsCard[]> = {
  'pat-adult-risk': [
    {
      id: 'pc1',
      severity: 'warning',
      summary: 'Riesgo cardiovascular elevado',
      detail: 'Presión sistólica alta y HbA1c elevada en paciente adulto.',
      source: 'AdultRiskAssessment 0.1.0',
      ruleName: 'AdultRiskAssessment',
      ruleVersion: '0.1.0',
      suggestion: {
        action: 'create',
        resourceType: 'ServiceRequest',
        description: 'Solicitar interconsulta a cardiología.',
      },
    },
    {
      id: 'pc2',
      severity: 'info',
      summary: 'Control de HbA1c recomendado',
      detail: 'Han pasado más de 3 meses desde el último control de HbA1c.',
      source: 'DiabetesFollowUp 0.2.0',
      ruleName: 'DiabetesFollowUp',
      ruleVersion: '0.2.0',
    },
  ],
  'pat-elder': [
    {
      id: 'pc1',
      severity: 'critical',
      summary: 'Presión arterial crítica',
      detail: 'Presión sistólica en rango crítico en adulto mayor con insuficiencia cardíaca.',
      source: 'AdultRiskAssessment 0.1.0',
      ruleName: 'AdultRiskAssessment',
      ruleVersion: '0.1.0',
      suggestion: {
        action: 'update',
        resourceType: 'MedicationRequest',
        description: 'Revisar y ajustar antihipertensivos.',
      },
    },
    {
      id: 'pc2',
      severity: 'warning',
      summary: 'Función renal disminuida',
      detail: 'Creatinina elevada; ajustar dosis de fármacos de eliminación renal.',
      source: 'RenalDoseCheck 0.3.0',
      ruleName: 'RenalDoseCheck',
      ruleVersion: '0.3.0',
    },
    {
      id: 'pc3',
      severity: 'info',
      summary: 'Control de anticoagulación',
      detail: 'Verificar INR reciente en paciente con warfarina.',
      source: 'AnticoagMonitor 0.1.0',
      ruleName: 'AnticoagMonitor',
      ruleVersion: '0.1.0',
    },
  ],
  'pat-child': [
    {
      id: 'pc1',
      severity: 'info',
      summary: 'Recordatorio de vacunación',
      detail: 'Verificar esquema de vacunación acorde a edad.',
      source: 'PediatricImmunization 0.1.0',
      ruleName: 'PediatricImmunization',
      ruleVersion: '0.1.0',
    },
  ],
  'pat-teen': [
    {
      id: 'pc1',
      severity: 'warning',
      summary: 'IMC en rango de obesidad',
      detail: 'Considerar intervención nutricional y actividad física estructurada.',
      source: 'AdolescentBmi 0.1.0',
      ruleName: 'AdolescentBmi',
      ruleVersion: '0.1.0',
    },
  ],
  'pat-teen-2': [
    {
      id: 'pc1',
      severity: 'info',
      summary: 'Niveles de fármaco en rango',
      detail: 'Ácido valproico dentro del rango terapéutico esperado.',
      source: 'AnticonvulsantLevels 0.1.0',
      ruleName: 'AnticonvulsantLevels',
      ruleVersion: '0.1.0',
    },
  ],
  'pat-elder-2': [
    {
      id: 'pc1',
      severity: 'warning',
      summary: 'Saturación de oxígeno baja',
      detail: 'SatO2 por debajo del objetivo; reforzar terapia respiratoria.',
      source: 'CopdMonitor 0.1.0',
      ruleName: 'CopdMonitor',
      ruleVersion: '0.1.0',
    },
    {
      id: 'pc2',
      severity: 'info',
      summary: 'Presión arterial elevada',
      detail: 'Reforzar adherencia al tratamiento antihipertensivo.',
      source: 'AdultRiskAssessment 0.1.0',
      ruleName: 'AdultRiskAssessment',
      ruleVersion: '0.1.0',
    },
  ],
};

export const postUpdateCardsFixture: Record<string, CdsCard[]> = {
  'pat-low-risk': [
    {
      id: 'post1',
      severity: 'warning',
      summary: 'Cambio clínico relevante',
      detail: 'La reevaluación mock devolvió una nueva recomendación para este sandbox.',
      source: 'AdultRiskAssessment 0.1.0',
      ruleName: 'AdultRiskAssessment',
      ruleVersion: '0.1.0',
      suggestion: {
        action: 'update',
        resourceType: 'Observation',
        description: 'Revisar observación recién modificada.',
      },
    },
  ],
};

export const ruleFixtures: ClinicalRule[] = [
  {
    id: 'rule-adult-risk',
    title: 'Evaluación de riesgo en adultos',
    cqlName: 'AdultRiskAssessment',
    version: '0.1.0',
    lifecycle: 'validated',
    hook: 'patient-view',
    activation: true,
    modified: '2026-07-18',
    scope: 'sandbox',
    cql: adultRiskCql,
    metadata: {
      title: 'Evaluación de riesgo en adultos',
      name: 'AdultRiskAssessment',
      version: '0.1.0',
      hook: 'patient-view',
      expression: 'Riesgo Elevado',
      summary: 'Riesgo cardiovascular elevado',
      detail: 'El paciente adulto presenta presión arterial sistólica alta y HbA1c elevada.',
      indicator: 'warning',
    },
  },
  {
    id: 'rule-draft-invalid',
    title: 'Borrador con errores',
    cqlName: 'DraftInvalidRule',
    version: '0.0.1',
    lifecycle: 'draft',
    hook: 'patient-view',
    activation: false,
    modified: '2026-07-22',
    scope: 'sandbox',
    cql: invalidCql,
    metadata: {
      title: 'Borrador con errores',
      name: 'DraftInvalidRule',
      version: '0.0.1',
      hook: 'patient-view',
      expression: 'Condicion Incompleta',
      summary: 'Borrador de regla',
      detail: 'Regla en construcción con sintaxis incompleta.',
      indicator: 'info',
    },
  },
  {
    id: 'rule-diabetes',
    title: 'Seguimiento de diabetes',
    cqlName: 'DiabetesFollowUp',
    version: '0.2.0',
    lifecycle: 'published',
    hook: 'patient-view',
    activation: true,
    modified: '2026-06-30',
    scope: 'shared',
    cql: `library DiabetesFollowUp version '0.2.0'\n\nusing FHIR version '4.0.1'\n\ncontext Patient\n\ndefine "Requiere Control":\n  true\n`,
    metadata: {
      title: 'Seguimiento de diabetes',
      name: 'DiabetesFollowUp',
      version: '0.2.0',
      hook: 'patient-view',
      expression: 'Requiere Control',
      summary: 'Control de HbA1c recomendado',
      detail: 'Han pasado más de 3 meses desde el último control de HbA1c.',
      indicator: 'info',
    },
  },
  {
    id: 'rule-renal',
    title: 'Ajuste de dosis renal',
    cqlName: 'RenalDoseCheck',
    version: '0.3.0',
    lifecycle: 'published',
    hook: 'order-sign',
    activation: true,
    modified: '2026-05-14',
    scope: 'shared',
    cql: `library RenalDoseCheck version '0.3.0'\n\nusing FHIR version '4.0.1'\n\ncontext Patient\n\ndefine "Funcion Renal Disminuida":\n  true\n`,
    metadata: {
      title: 'Ajuste de dosis renal',
      name: 'RenalDoseCheck',
      version: '0.3.0',
      hook: 'order-sign',
      expression: 'Funcion Renal Disminuida',
      summary: 'Función renal disminuida',
      detail: 'Ajustar dosis de fármacos de eliminación renal.',
      indicator: 'warning',
    },
  },
  {
    id: 'rule-anticoag',
    title: 'Monitor de anticoagulación',
    cqlName: 'AnticoagMonitor',
    version: '0.1.0',
    lifecycle: 'disabled',
    hook: 'patient-view',
    activation: false,
    modified: '2026-04-09',
    scope: 'shared',
    cql: `library AnticoagMonitor version '0.1.0'\n\nusing FHIR version '4.0.1'\n\ncontext Patient\n\ndefine "Requiere INR":\n  true\n`,
    metadata: {
      title: 'Monitor de anticoagulación',
      name: 'AnticoagMonitor',
      version: '0.1.0',
      hook: 'patient-view',
      expression: 'Requiere INR',
      summary: 'Control de anticoagulación',
      detail: 'Verificar INR reciente en paciente con warfarina.',
      indicator: 'info',
    },
  },
  {
    id: 'rule-legacy',
    title: 'Tamizaje antiguo',
    cqlName: 'LegacyScreening',
    version: '0.9.0',
    lifecycle: 'retired',
    hook: 'order-select',
    activation: false,
    modified: '2025-12-01',
    scope: 'shared',
    cql: `library LegacyScreening version '0.9.0'\n\nusing FHIR version '4.0.1'\n\ncontext Patient\n\ndefine "Tamizaje":\n  false\n`,
    metadata: {
      title: 'Tamizaje antiguo',
      name: 'LegacyScreening',
      version: '0.9.0',
      hook: 'order-select',
      expression: 'Tamizaje',
      summary: 'Tamizaje retirado',
      detail: 'Regla retirada; conservada como referencia.',
      indicator: 'info',
    },
  },
];

export const validDiagnostics: Diagnostic[] = [
  {
    id: 'd-info-1',
    severity: 'info',
    message: 'Librería compilada correctamente contra FHIR 4.0.1.',
    line: 1,
    column: 1,
  },
  {
    id: 'd-warn-1',
    severity: 'warning',
    message: 'La expresión "Presion Sistolica Alta" asume unidad mm[Hg]; verifica el value set.',
    line: 13,
    column: 7,
  },
];

export const invalidDiagnostics: Diagnostic[] = [
  {
    id: 'd-err-1',
    severity: 'error',
    message: "Se esperaba una expresión después de '='.",
    line: 10,
    column: 30,
  },
  {
    id: 'd-err-2',
    severity: 'error',
    message: "Falta ':' en la definición 'Sin Retorno'.",
    line: 12,
    column: 20,
  },
  {
    id: 'd-warn-1',
    severity: 'warning',
    message: "El value set 'Diabetes' no está declarado.",
    line: 9,
    column: 21,
  },
];

export const validValidationResult: ValidationResult = {
  valid: true,
  diagnostics: validDiagnostics,
};

export const invalidValidationResult: ValidationResult = {
  valid: false,
  diagnostics: invalidDiagnostics,
};

export const adultRiskElm = JSON.stringify(
  {
    library: {
      identifier: { id: 'AdultRiskAssessment', version: '0.1.0' },
      schemaIdentifier: { id: 'urn:hl7-org:elm', version: 'r1' },
      usings: {
        def: [
          { localIdentifier: 'System', uri: 'urn:hl7-org:elm-types:r1' },
          { localIdentifier: 'FHIR', uri: 'http://hl7.org/fhir', version: '4.0.1' },
        ],
      },
      statements: {
        def: [
          {
            name: 'Riesgo Elevado',
            context: 'Patient',
            expression: {
              type: 'And',
              operand: [
                { type: 'ExpressionRef', name: 'Es Adulto' },
                { type: 'ExpressionRef', name: 'Presion Sistolica Alta' },
                { type: 'ExpressionRef', name: 'HbA1c Elevada' },
              ],
            },
          },
        ],
      },
    },
  },
  null,
  2,
);

export const testResultFixtures: Record<string, Record<string, RuleTestResult>> = {
  'rule-adult-risk': {
    'pat-adult-risk': {
      applies: true,
      cards: [patientCardsFixture['pat-adult-risk'][0]],
      consideredResources: ['Patient/SYN-4821', 'Observation/85354-9', 'Observation/4548-4'],
      warnings: ['Value set "Hemoglobina Glicosilada" resuelto por fixture.'],
      correlationId: 'corr-8f21a3',
    },
    'pat-low-risk': {
      applies: false,
      cards: [],
      consideredResources: ['Patient/SYN-1902', 'Observation/85354-9', 'Observation/4548-4'],
      warnings: [],
      correlationId: 'corr-2b90c1',
    },
    'pat-elder': {
      applies: true,
      cards: [patientCardsFixture['pat-elder'][0]],
      consideredResources: ['Patient/SYN-5510', 'Observation/85354-9'],
      warnings: [],
      correlationId: 'corr-55d0e7',
    },
  },
};

export const activityFixtures: ActivityEntry[] = [
  {
    id: 'act-1',
    date: '2026-07-20 09:42',
    patientId: 'pat-elder',
    patientName: 'Paciente Sintético E · SYN-5510',
    hook: 'patient-view',
    rules: ['AdultRiskAssessment 0.1.0', 'RenalDoseCheck 0.3.0'],
    cardsCount: 2,
    durationMs: 184,
    result: 'success',
    correlationId: 'corr-55d0e7',
    maxSeverity: 'critical',
    cards: [patientCardsFixture['pat-elder'][0], patientCardsFixture['pat-elder'][1]],
    consideredResources: ['Patient/SYN-5510', 'Observation/85354-9', 'Observation/2160-0'],
    warnings: [],
    scope: 'shared',
  },
  {
    id: 'act-2',
    date: '2026-07-18 14:10',
    patientId: 'pat-adult-risk',
    patientName: 'Paciente Sintético A · SYN-4821',
    hook: 'patient-view',
    rules: ['AdultRiskAssessment 0.1.0'],
    cardsCount: 1,
    durationMs: 121,
    result: 'success',
    correlationId: 'corr-8f21a3',
    maxSeverity: 'warning',
    cards: [patientCardsFixture['pat-adult-risk'][0]],
    consideredResources: ['Patient/SYN-4821', 'Observation/85354-9', 'Observation/4548-4'],
    warnings: ['Value set "Hemoglobina Glicosilada" resuelto por fixture.'],
    scope: 'sandbox',
  },
  {
    id: 'act-3',
    date: '2026-07-15 11:05',
    patientId: 'pat-low-risk',
    patientName: 'Paciente Sintético B · SYN-1902',
    hook: 'patient-view',
    rules: ['AdultRiskAssessment 0.1.0'],
    cardsCount: 0,
    durationMs: 98,
    result: 'no-aplica',
    correlationId: 'corr-2b90c1',
    maxSeverity: 'none',
    cards: [],
    consideredResources: ['Patient/SYN-1902', 'Observation/85354-9'],
    warnings: [],
    scope: 'sandbox',
  },
];
