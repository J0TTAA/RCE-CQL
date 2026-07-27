library RceHypertensionScreening version '0.1.0'

using FHIR version '4.0.1'

codesystem "LOINC": 'http://loinc.org'

code "Systolic Blood Pressure": '8480-6' from "LOINC" display 'Systolic Blood Pressure'
code "Diastolic Blood Pressure": '8462-4' from "LOINC" display 'Diastolic Blood Pressure'

context Patient

define "Aplica":
  AgeInYears() >= 18
    and (
      exists (
        [Observation: "Systolic Blood Pressure"] O
          where O.status.value = 'final'
            and (O.value as FHIR.Quantity).value.value >= 140
      )
      or exists (
        [Observation: "Diastolic Blood Pressure"] O
          where O.status.value = 'final'
            and (O.value as FHIR.Quantity).value.value >= 90
      )
    )
