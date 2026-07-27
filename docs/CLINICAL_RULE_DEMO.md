# Demo: reglas CQL con signos vitales y laboratorio

Esta guia extiende la demo de edad. Usa el mismo flujo:

```text
Editar paciente en RCE -> overlay de sandbox -> Observation FHIR efectiva -> CQL -> card CDS
```

El paciente base Synthea no se modifica para otros alumnos. Nest guarda los
valores editados en un `Basic` privado del sandbox y, al evaluar, materializa
Observations FHIR R4 con codigos LOINC.

## Datos editables

En la ficha del paciente, `Editar dato` permite cambiar:

| Campo               | Recurso efectivo            | Codigo         |
| ------------------- | --------------------------- | -------------- |
| Fecha de nacimiento | `Patient.birthDate`         | N/A            |
| Presion sistolica   | `Observation.valueQuantity` | LOINC `8480-6` |
| Presion diastolica  | `Observation.valueQuantity` | LOINC `8462-4` |
| HbA1c               | `Observation.valueQuantity` | LOINC `4548-4` |

## Escenario 1 - Hipertension educativa

1. Abrir un paciente adulto.
2. Ir a `Editar dato`.
3. Dejar presion normal:

```text
Sistolica: 120
Diastolica: 80
HbA1c: puede quedar vacio
```

4. Crear una regla en `Reglas CQL -> Nueva regla`.
5. Metadata recomendada:

```text
Titulo: Sospecha de hipertension
Nombre CQL: RceHypertensionScreening
Version: 0.1.0
Hook: patient-view
Expresion booleana: Aplica
Summary: Presion arterial elevada
Detail: El paciente adulto tiene presion sistolica o diastolica en rango elevado para la demo.
Indicator: warning
```

6. CQL:

```cql
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
```

7. `Guardar`, `Validar`, probar con el paciente y publicar como docente.
8. Volver al paciente y presionar `Reevaluar`: con 120/80 no deberia aparecer card.
9. Abrir `Editar dato` y cambiar:

```text
Sistolica: 150
Diastolica: 95
```

10. Guardar cambios. Debe aparecer la card `Presion arterial elevada`.

## Escenario 2 - Sospecha educativa de diabetes por HbA1c

Esta regla es para docencia. La card representa una alerta educativa por
resultado de laboratorio compatible con sospecha de diabetes, no un diagnostico
clinico definitivo.

1. Con el mismo paciente adulto, dejar HbA1c en valor normal:

```text
HbA1c: 5.6
```

2. Crear otra regla con metadata:

```text
Titulo: Sospecha de diabetes por HbA1c
Nombre CQL: RceDiabetesRiskHba1c
Version: 0.1.0
Hook: patient-view
Expresion booleana: Aplica
Summary: Sospecha de diabetes por HbA1c
Detail: El paciente adulto tiene HbA1c mayor o igual a 6.5% en el laboratorio sintetico del sandbox.
Indicator: critical
```

3. CQL:

```cql
library RceDiabetesRiskHba1c version '0.1.0'

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
```

4. Validar, probar y publicar.
5. Volver al paciente, editar HbA1c:

```text
HbA1c: 7.2
```

6. Guardar. Debe aparecer la card `Sospecha de diabetes por HbA1c`.

## Resultado docente esperado

La clase puede demostrar:

- una regla por edad;
- una regla compuesta por edad y signos vitales;
- una regla educativa de diabetes por laboratorio HbA1c;
- reevaluacion automatica al guardar cambios;
- aislamiento por sandbox cuando varios alumnos usan el mismo paciente.
