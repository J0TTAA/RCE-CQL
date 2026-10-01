library RceComplexDiabetesFourFacts version '0.1.0'

using FHIR version '4.0.1'

context Patient

define "EsAdulto":
  Coalesce(AgeInYears() >= 18, false)

define "DiabetesActiva":
  exists (
    [Condition] C
      where exists (C.code.coding CodingEntry
        where CodingEntry.system.value = 'http://snomed.info/sct'
          and CodingEntry.code.value = '44054006')
        and exists (C.clinicalStatus.coding ClinicalStatus
          where ClinicalStatus.code.value = 'active')
  )

define "HbA1cElevada":
  exists (
    [Observation] O
      where exists (O.code.coding CodingEntry
        where CodingEntry.system.value = 'http://loinc.org'
          and CodingEntry.code.value = '4548-4')
        and O.status.value = 'final'
        and (O.value as FHIR.Quantity).value.value >= 6.5
  )

define "MetforminaActiva":
  exists (
    [MedicationRequest] M
      let MedicationCode: M.medication as FHIR.CodeableConcept
      where exists (MedicationCode.coding CodingEntry
        where CodingEntry.system.value = 'http://www.nlm.nih.gov/research/umls/rxnorm'
          and CodingEntry.code.value = '860975')
        and M.status.value = 'active'
  )

define "Aplica":
  "EsAdulto"
    and "DiabetesActiva"
    and "HbA1cElevada"
    and "MetforminaActiva"
