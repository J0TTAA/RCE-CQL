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
    id: 'patient-view-adult',
    label: 'Simple · patient-view: paciente adulto',
    hook: 'patient-view',
    summary: 'Ejercicio: paciente adulto',
    detail:
      'El paciente tiene al menos 18 anos. Cambia su fecha de nacimiento para comparar el resultado.',
    cql: `library RceDemoAdulto version '0.1.0'
using FHIR version '4.0.1'
context Patient

define "Aplica":
  AgeInYears() >= 18
`,
  },
  {
    id: 'order-select-amoxicillin',
    label: 'Simple · order-select: amoxicilina',
    hook: 'order-select',
    summary: 'Ejercicio: amoxicilina seleccionada',
    detail:
      'La seleccion actual incluye amoxicilina. Esta regla demuestra order-select sin requerir una alergia.',
    cql: `library RceDemoSeleccion version '0.1.0'
using FHIR version '4.0.1'
parameter Selections List<String>
context Patient

define "Aplica":
  exists ([MedicationRequest] M
    let MedicationCode: M.medication as FHIR.CodeableConcept
    where ('MedicationRequest/' + M.id.value) in Selections
      and exists (MedicationCode.coding C
        where C.system.value = 'http://www.nlm.nih.gov/research/umls/rxnorm'
          and C.code.value = '308182'))
`,
  },
  {
    id: 'order-sign-hba1c',
    label: 'Simple · order-sign: solicitud de HbA1c',
    hook: 'order-sign',
    summary: 'Ejercicio: HbA1c pendiente de firma',
    detail:
      'Las ordenes pendientes incluyen una solicitud de HbA1c. Esta regla demuestra order-sign sin requerir diabetes.',
    cql: `library RceDemoFirma version '0.1.0'
using FHIR version '4.0.1'
parameter DraftOrders List<String>
context Patient

define "Aplica":
  exists ([ServiceRequest] O
    where ('ServiceRequest/' + O.id.value) in DraftOrders
      and exists (O.code.coding C
        where C.system.value = 'http://loinc.org' and C.code.value = '4548-4'))
`,
  },
  {
    id: 'patient-view-diabetes-four-facts',
    label: 'Completa · patient-view: diabetes, HbA1c y metformina',
    hook: 'patient-view',
    summary: 'Ejercicio: cuatro hechos clinicos coinciden',
    detail:
      'El paciente es adulto, tiene diabetes activa, una HbA1c final de al menos 6.5 y una solicitud activa de metformina. Ejercicio con HbA1c en porcentaje.',
    cql: `library RceDemoCompleta version '0.1.0'
using FHIR version '4.0.1'
context Patient

define "EsAdulto":
  Coalesce(AgeInYears() >= 18, false)

define "DiabetesActiva":
  exists ([Condition] C
    where exists (C.code.coding CodingEntry
      where CodingEntry.system.value = 'http://snomed.info/sct'
        and CodingEntry.code.value = '44054006')
      and exists (C.clinicalStatus.coding ClinicalStatus
        where ClinicalStatus.code.value = 'active'))

define "HbA1cElevada":
  exists ([Observation] O
    where exists (O.code.coding CodingEntry
      where CodingEntry.system.value = 'http://loinc.org'
        and CodingEntry.code.value = '4548-4')
      and O.status.value = 'final'
      and (O.value as FHIR.Quantity).value.value >= 6.5)

define "MetforminaActiva":
  exists ([MedicationRequest] M
    let MedicationCode: M.medication as FHIR.CodeableConcept
    where exists (MedicationCode.coding CodingEntry
      where CodingEntry.system.value = 'http://www.nlm.nih.gov/research/umls/rxnorm'
        and CodingEntry.code.value = '860975')
      and M.status.value = 'active')

define "Aplica":
  "EsAdulto" and "DiabetesActiva" and "HbA1cElevada" and "MetforminaActiva"
`,
  },
];
