# WO-0004 - Regla CQL compuesta y pruebas por hecho

| Campo | Valor |
| --- | --- |
| Estado | REVIEW |
| Fecha | 2026-09-16 |
| Tarea | TASK-5.14 |

Verificar una regla `patient-view` con cuatro criterios independientes sobre
recursos HL7 FHIR R4: edad de Patient, diabetes activa en Condition, HbA1c en
Observation y metformina activa en MedicationRequest.

La prueba debe usar CQL Translation Service real para producir ELM y el motor
instalado `cql-execution` + `cql-exec-fhir`. Debe existir un caso positivo y un
caso negativo por cada criterio, incluidos datos opcionales ausentes. Dejar un
smoke reproducible de extremo a extremo para NestJS, HAPI y CDS Hooks, sin
simular decisiones clinicas en TypeScript.

## Resultado

La traduccion y ejecucion real detecto y permitio corregir dos errores de
sintaxis en plantillas existentes. La matriz del motor paso con un caso positivo
y seis negativos. Los endpoints HTTP `patient-view`, `order-select` y
`order-sign` produjeron cards con NestJS, traductor y motor reales sobre un
repositorio FHIR temporal. El smoke completo contra HAPI queda pendiente porque
la API local no estaba disponible. Evidencia:
`docs/evidence/M3/runs/20260916T054508Z/summary.md`.
