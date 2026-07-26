# Flujo de desarrollo verificable

## Proposito

Este flujo conserva de la fabrica anterior los Work Orders, gates, trazabilidad, ejecuciones aisladas y evidencia, pero elimina agentes ficticios, tools simuladas y reportes autorrellenados.

## Ciclo

| Fase | Entrada | Salida | Gate |
|---|---|---|---|
| Intake | Solicitud y documentos fuente | Work Order con alcance y restricciones | Objetivo verificable |
| Specify | Work Order | Cambio requerido en `REQUIREMENTS.md` | Requisitos identificables |
| Design | Requisitos | Cambio en `DESIGN.md` o ADR | Interfaces y riesgos definidos |
| Plan | Diseno | Tareas y dependencias en `TASKS.md` | Una tarea activa |
| Implement | Tarea activa | Codigo, configuracion o fixture | Alcance respetado |
| Verify | Entregable | Exit codes, respuestas y reportes reales | Criterio satisfecho |
| Close | Evidencia | Trazabilidad y estado actualizados | Sin claims no respaldados |

No todas las solicitudes requieren cambiar los tres documentos, pero cualquier cambio de comportamiento debe conservar la secuencia Requirements -> Design -> Tasks.

## Work Order

Un Work Order debe declarar:

- Objetivo y criterios observables.
- Alcance incluido y excluido.
- Entradas autorizadas.
- Restricciones y riesgos.
- Side effects esperados.
- Tareas y gates afectados.
- Evidencia de cierre.

Los Work Orders se guardan en `docs/work-orders/` y no reemplazan a `TASKS.md`.

## Estados

| Estado | Regla |
|---|---|
| `TODO` | No iniciado. |
| `IN_PROGRESS` | Trabajo activo; solo puede existir uno. |
| `BLOCKED` | Existe un impedimento concreto registrado. |
| `REVIEW` | Implementado, pero aun no satisface toda la verificacion. |
| `DONE` | Criterio satisfecho con evidencia ejecutada. |

## Gates del proyecto

| Gate | Condicion de salida |
|---|---|
| M0 | CQL -> ELM -> FHIR -> `$apply` demostrado o decision alternativa aprobada. |
| M1 | Nest consulta HAPI y traduce CQL mediante adapters probados. |
| M2 | Una regla se crea, valida, versiona y publica atomicamente. |
| M3 | `patient-view` produce CDS Cards desde CQL ejecutado. |
| M4 | Cambiar un paciente desde la UI cambia las cards visibles. |
| M5 | Criterios AC-001 a AC-010 pasan desde un entorno limpio. |

Un gate no se cierra por tener todos los archivos esperados. Se cierra al ejecutar su escenario y registrar el resultado.

## Evidencia

Cada ejecucion usa un directorio inmutable:

```text
docs/evidence/<milestone>/runs/<UTC timestamp>/
```

Debe contener como minimo un resumen, comandos o endpoints ejecutados, exit status y artefactos crudos relevantes. Los errores se conservan y se enlazan desde el registro de riesgos o la matriz de compatibilidad.

## Aprobaciones

Requieren confirmacion humana:

- Incorporar datos no sinteticos.
- Exponer HAPI o traductor fuera del equipo local.
- Agregar un servicio o base de datos propios.
- Cambiar el motor de ejecucion CQL.
- Aplicar una sugerencia sobre FHIR.
- Publicar, desplegar o aumentar costos externos.
