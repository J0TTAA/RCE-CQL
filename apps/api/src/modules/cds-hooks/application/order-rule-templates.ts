// Ejercicios de interoperabilidad, no protocolos ni recomendaciones terapeuticas.
export const ORDER_RULE_TEMPLATES = [
  {
    id: 'blank',
    label: 'En blanco',
    hook: 'patient-view',
    summary: 'Regla personalizada',
    detail: 'Resultado de la regla CQL definida en este sandbox.',
    cql: `library RceNuevaRegla version '0.1.0'
using FHIR version '4.0.1'
context Patient

define "Aplica":
  false
`,
  },
  {
    id: 'age',
    label: 'Edad al abrir la ficha',
    hook: 'patient-view',
    summary: 'Ejercicio: paciente adulto',
    detail: 'La edad cumple la condicion escrita en CQL.',
    cql: `library RceEdad version '0.1.0'
using FHIR version '4.0.1'
context Patient
define "Aplica": AgeInYears() >= 18
`,
  },
  {
    id: 'complex-diabetes-four-facts',
    label: 'Diabetes: cuatro hechos clinicos',
    hook: 'patient-view',
    summary: 'Ejercicio: se cumplen cuatro criterios clinicos',
    detail:
      'El paciente es adulto, tiene diabetes activa, HbA1c elevada y metformina activa en recursos FHIR separados.',
    cql: [
      "library RceComplexDiabetesFourFacts version '0.1.0'",
      "using FHIR version '4.0.1'",
      'context Patient',
      '',
      'define "EsAdulto":',
      '  Coalesce(AgeInYears() >= 18, false)',
      '',
      'define "DiabetesActiva":',
      '  exists ([Condition] C',
      '    where exists (C.code.coding CodingEntry',
      "      where CodingEntry.system.value = 'http://snomed.info/sct'",
      "        and CodingEntry.code.value = '44054006')",
      '      and exists (C.clinicalStatus.coding ClinicalStatus',
      "        where ClinicalStatus.code.value = 'active'))",
      '',
      'define "HbA1cElevada":',
      '  exists ([Observation] O',
      '    where exists (O.code.coding CodingEntry',
      "      where CodingEntry.system.value = 'http://loinc.org'",
      "        and CodingEntry.code.value = '4548-4')",
      "      and O.status.value = 'final'",
      '      and (O.value as FHIR.Quantity).value.value >= 6.5)',
      '',
      'define "MetforminaActiva":',
      '  exists ([MedicationRequest] M',
      '    let MedicationCode: M.medication as FHIR.CodeableConcept',
      '    where exists (MedicationCode.coding CodingEntry',
      "      where CodingEntry.system.value = 'http://www.nlm.nih.gov/research/umls/rxnorm'",
      "        and CodingEntry.code.value = '860975')",
      "      and M.status.value = 'active')",
      '',
      'define "Aplica":',
      '  "EsAdulto" and "DiabetesActiva" and "HbA1cElevada" and "MetforminaActiva"',
      '',
    ].join('\n'),
  },
  {
    id: 'allergy-order',
    label: 'Amoxicilina y alergia al seleccionar',
    hook: 'order-select',
    summary: 'Ejercicio: revisar alergia registrada',
    detail:
      'Se selecciono amoxicilina y existe una alergia activa a penicilina en este sandbox. Revisa el caso con el docente.',
    cql: `library RceAlergiaOrden version '0.1.0'
using FHIR version '4.0.1'
parameter Selections List<String>
context Patient

define "AmoxicilinaSeleccionada":
  exists ([MedicationRequest] M
    let MedicationCode: M.medication as FHIR.CodeableConcept
    where ('MedicationRequest/' + M.id.value) in Selections
      and exists (MedicationCode.coding C
        where C.system.value = 'http://www.nlm.nih.gov/research/umls/rxnorm'
          and C.code.value = '308182'))

define "AlergiaActiva":
  exists ([AllergyIntolerance] A
    where exists (A.code.coding C
      where C.system.value = 'http://snomed.info/sct'
        and C.code.value = '91936005')
    and exists (A.clinicalStatus.coding S where S.code.value = 'active'))

define "Aplica": "AmoxicilinaSeleccionada" and "AlergiaActiva"
`,
  },
  {
    id: 'diabetes-order',
    label: 'HbA1c y diabetes antes de firmar',
    hook: 'order-sign',
    summary: 'Ejercicio: solicitud de HbA1c con diabetes registrada',
    detail:
      'La solicitud pendiente de HbA1c coincide con la condicion de diabetes activa del paciente. Esta card demuestra la evaluacion previa a la firma.',
    cql: `library RceDiabetesOrden version '0.1.0'
using FHIR version '4.0.1'
parameter DraftOrders List<String>
context Patient

define "SolicitudHbA1c":
  exists ([ServiceRequest] O
    where ('ServiceRequest/' + O.id.value) in DraftOrders
      and exists (O.code.coding C
        where C.system.value = 'http://loinc.org' and C.code.value = '4548-4'))

define "DiabetesActiva":
  exists ([Condition] C
    where exists (C.code.coding CodingEntry
      where CodingEntry.system.value = 'http://snomed.info/sct'
        and CodingEntry.code.value = '44054006')
    and exists (C.clinicalStatus.coding S where S.code.value = 'active'))

define "Aplica": "SolicitudHbA1c" and "DiabetesActiva"
`,
  },
];
