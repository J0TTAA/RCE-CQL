# Trazabilidad viva

## Regla

`PENDING` no es un fallo: indica que la evidencia aun no existe. Un criterio solo cambia a `VERIFIED` cuando el comando y resultado real quedan registrados en `docs/evidence/`.

## Criterios de aceptacion

| Criterio | Requisitos                                              | Diseno                 | Tareas principales                                   | Evidencia       | Estado  |
| -------- | ------------------------------------------------------- | ---------------------- | ---------------------------------------------------- | --------------- | ------- |
| AC-001   | REQ-F-005, REQ-F-006, REQ-NF-018                        | 9.5, 10.1, 12.1        | TASK-2.6, TASK-2.8, TASK-4.2, TASK-6.9               | Pendiente M2/M4 | PENDING |
| AC-002   | REQ-F-005, REQ-F-007                                    | 9.5, 12.1              | TASK-4.2, TASK-4.4, TASK-6.10                        | Pendiente M2/M4 | PENDING |
| AC-003   | REQ-F-010 a REQ-F-013                                   | 9.6, 11.1 a 11.5, 12.2 | TASK-4.6 a TASK-4.9                                  | Pendiente M2    | PENDING |
| AC-004   | REQ-F-018 a REQ-F-023                                   | 9.8, 12.3              | TASK-5.1 a TASK-5.7                                  | Pendiente M3    | PENDING |
| AC-005   | REQ-F-027 a REQ-F-031                                   | 9.7, 12.4              | TASK-6.3 a TASK-6.5, TASK-6.11                       | Pendiente M4    | PENDING |
| AC-006   | REQ-F-014, REQ-F-015, REQ-F-023                         | 9.4, 11.5              | TASK-3.10, TASK-5.4                                  | Pendiente M3    | PENDING |
| AC-007   | REQ-F-032 a REQ-F-036                                   | 9.9, 10.4, 12.5        | TASK-5.5 a TASK-5.7                                  | Pendiente M3    | PENDING |
| AC-008   | REQ-F-039, REQ-F-040, REQ-F-044                         | 12.6, 13.3             | TASK-6.6, TASK-7.5                                   | Pendiente M4/M5 | PENDING |
| AC-009   | REQ-F-045, REQ-F-046                                    | 9.3, 13.2              | TASK-7.1, TASK-7.2                                   | Pendiente M5    | PENDING |
| AC-010   | REQ-NF-002, REQ-NF-024, REQ-NF-025                      | 15.1                   | TASK-0.1, TASK-0.2, TASK-8.7, TASK-8.9               | Pendiente M0/M5 | PENDING |
| AC-011   | REQ-F-051 a REQ-F-054, REQ-D-010, REQ-D-011, REQ-NF-027 | 9.3, 11.8, 12.0, 12.7  | TASK-7.1, TASK-2.11, TASK-3.12, TASK-6.14, TASK-8.10 | Pendiente M5    | PENDING |

## Gate M0

| Evidencia                                  | Requisito              | Tarea    | Estado           |
| ------------------------------------------ | ---------------------- | -------- | ---------------- |
| Matriz de versiones candidatas             | REQ-NF-002             | TASK-0.1 | VERIFIED-DOC     |
| Compose fijado                             | REQ-NF-024, REQ-NF-025 | TASK-0.2 | VERIFIED         |
| CapabilityStatement con Clinical Reasoning | REQ-F-049, REQ-NF-003  | TASK-0.3 | VERIFIED         |
| FHIRHelpers y pacientes sinteticos         | REQ-F-008, REQ-D-007   | TASK-0.4 | PENDING          |
| CQL traducido a ELM real                   | REQ-F-005, REQ-NF-003  | TASK-0.5 | VERIFIED-PARTIAL |
| Poblacion Synthea reproducible             | REQ-D-007, REQ-D-009   | TASK-1.9 | PENDING-RUN      |
| Library y PlanDefinition reales            | REQ-D-001 a REQ-D-005  | TASK-0.6 | PENDING          |
| Resultado `$apply` real                    | REQ-F-020, REQ-NF-003  | TASK-0.7 | PENDING          |
| Estrategia de draft probada                | REQ-F-019              | TASK-0.8 | PENDING          |
| Decision go/no-go                          | REQ-NF-002, REQ-NF-003 | TASK-0.9 | PENDING          |
