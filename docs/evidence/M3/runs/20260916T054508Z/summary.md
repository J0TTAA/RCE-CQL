# Evidencia M3 - regla CQL compuesta

Fecha UTC: 2026-09-16T05:45:08Z

## Objetivo

Comprobar una regla `patient-view` con cuatro hechos HL7 FHIR R4:

1. Patient adulto.
2. Condition de diabetes activa (SNOMED CT `44054006`).
3. Observation HbA1c final >= 6.5 % (LOINC `4548-4`).
4. MedicationRequest de metformina activa (RxNorm `860975`).

## Hallazgos corregidos

- El alias CQL `Code` usado por la plantilla `diabetes-order` colisionaba con
  el lenguaje y CQL Tools 4.7.0 rechazaba la traduccion.
- El acceso directo
  `(M.medication as FHIR.CodeableConcept).coding` usado por
  `allergy-order` no era una fuente valida de query. Se corrigio usando
  `let MedicationCode: M.medication as FHIR.CodeableConcept`.
- Los tests unitarios anteriores no detectaban estos defectos porque el
  traductor HTTP estaba simulado. Se agrego un smoke contra el traductor real
  para todas las plantillas.

## Resultados

| Verificacion | Resultado |
| --- | --- |
| Build CQL Translation Service v2.9.0, commit `ee91fb30d14676b9924f1363f20db8dec69f6ec4` | Exit 0 |
| Traduccion de las 4 plantillas con CQL Tools 4.7.0 | Exit 0 |
| Regla compuesta, cuatro hechos verdaderos | `CARD` |
| Edad menor a 18 | `SIN CARD` |
| Diabetes no activa | `SIN CARD` |
| HbA1c 5.6 % | `SIN CARD` |
| Metformina completada | `SIN CARD` |
| Observation HbA1c ausente | `SIN CARD` |
| Patient.birthDate ausente | `SIN CARD` |
| Tests NestJS | 35/35, exit 0 |
| Lint, typecheck, build y formato API | Exit 0 |
| Sintaxis de los cuatro scripts Node | Exit 0 |
| Validacion SDD con una tarea activa | 0 errores |

## Verificacion HTTP de CDS Hooks

Se levanto una aplicacion NestJS temporal con los controladores reales de
sesion, UI y CDS Hooks. La traduccion y evaluacion usaron CQL Translation
Service v2.9.0, ELM real, `cql-execution` y `cql-exec-fhir`. Para poder
ejecutarlo sin Docker en Windows se sustituyo solamente HAPI por un repositorio
FHIR R4 en memoria.

| Endpoint/flujo | Resultado |
| --- | --- |
| `POST /cds-services/rce-patient-view` con cuatro hechos verdaderos | 1 card |
| `patient-view` al romper por separado edad, diabetes, HbA1c o metformina | 0 cards |
| `POST /cds-services/rce-order-select` con amoxicilina y alergia activa | 1 card |
| `POST /cds-services/rce-order-sign` con solicitud HbA1c y diabetes activa | 1 card |
| `order-select` con medicamento que no coincide | 0 cards |
| `order-sign` sin diabetes activa | 0 cards |
| Confirmacion repetida de orden | Idempotente |
| Acceso desde un segundo sandbox | Regla y revision aisladas |

Esta prueba confirma que los tres hooks implementados producen cards por la
ruta HTTP estandar. No reemplaza la repeticion final con HAPI real.

La matriz se ejecuto con CQL Translation Service real, ELM generado en esa
ejecucion y las dependencias instaladas `cql-execution` 3.3.2 y
`cql-exec-fhir` 2.1.6. No contiene una condicion clinica simulada en
TypeScript.

## Comandos reproducibles

```bash
npm run build --workspace @rce-cql/api
node scripts/cql-templates-smoke.mjs --translator http://localhost:8081
node scripts/complex-cql-engine-smoke.mjs --translator http://localhost:8081
node scripts/complex-patient-view-smoke.mjs --synthetic-patient-id ID
```

## Limite del entorno

El smoke completo contra HAPI se intento inicialmente y termino con
`ECONNREFUSED localhost:3000`: este equipo Windows no tiene API ni HAPI
levantados. La ruta HTTP fue verificada despues con NestJS real y almacenamiento
FHIR temporal en memoria. El script queda listo para repetirse en Fedora con el
Compose y un paciente sintetico. Por esta razon `TASK-5.14` queda en
`REVIEW`, no en `DONE`.
