library RceHba1cScreening version '0.1.0'

using FHIR version '4.0.1'

codesystem "LOINC": 'http://loinc.org'

code "Hemoglobin A1c": '4548-4' from "LOINC" display 'Hemoglobin A1c/Hemoglobin.total in Blood'

context Patient

define "Aplica":
  AgeInYears() >= 18
    and exists (
      [Observation: "Hemoglobin A1c"] O
        where O.status.value = 'final'
          and (O.value as FHIR.Quantity).value.value >= 6.5
    )
