# WO-0003 - Ordenes y CDS Hooks en la ficha

| Campo | Valor |
| --- | --- |
| Estado | REVIEW |
| Fecha | 2026-09-14 |
| Tarea | TASK-5.8 |

Completar los hooks de ordenes previstos en REQ-F-033 usando el engine
existente, contratos CDS Hooks y recursos HL7 FHIR R4. El flujo incluye
seleccionar medicamentos/examenes/procedimientos, evaluar antes de firmar,
confirmar en sandbox y observar cards y actividad.

Validar formatos controlados, ordenes de otro paciente, seleccion inexistente,
aislamiento entre sandboxes, confirmacion repetida y resultado CQL real.
Ejecutar lint/typecheck/tests API, typecheck/build web y validate-sdd.
La integracion clinica requiere HAPI y traductor reales; registrar cualquier
limitacion del entorno. No cerrar M0 ni afirmar interoperabilidad completa.

## Resultado

Se implementaron `order-select` y `order-sign` con contexto FHIR R4, parametros
al motor CQL existente, plantillas docentes, formulario guiado, revision previa,
confirmacion explicita e aislamiento por sandbox. En la ficha, agregar una orden
dispara `order-select`; iniciar la firma dispara `order-sign`; las cards aparecen
en cada momento y el usuario decide si firma y guarda. No se exponen botones de
prueba manual para esos hooks. Las pruebas locales y visuales
estan registradas en `docs/evidence/M3/runs/20260915T190015Z/summary.md`.

El smoke real queda pendiente porque en el entorno de verificacion no habia API,
HAPI ni traductor disponibles. Por esa razon la tarea queda en `REVIEW`.
