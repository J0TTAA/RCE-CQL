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

### Correccion de visibilidad en la ficha

Al confirmar una orden, el detalle del paciente ahora incluye una lista separada
de las ordenes de este sandbox, tanto `MedicationRequest` como `ServiceRequest`.
La pestaña de ordenes las muestra sin duplicarlas en el historial base. Las
selecciones siguen siendo pendientes hasta la confirmacion explicita de firma;
no se agregan al historial antes de esa accion. El resumen se construye fuera
del Bundle FHIR usado por CQL, sin alterar los recursos que evalua el motor.

La prueba automatizada comprueba ambos tipos de orden y que otro sandbox no los
reciba. Resultado local: `docs/evidence/M3/runs/20261001T112034Z/summary.md`.
Falta repetir la comprobacion manual sobre el Compose de Fedora con el codigo
actualizado, por lo que el Work Order permanece en `REVIEW`.

### Revision antes de publicar: 2026-10-04

Se repitieron las validaciones de API y web con Node 24.19.0. La prueba visual
ahora usa los nombres actuales de los botones y verifica una receta y un examen
confirmados, su actualizacion inmediata, ausencia de duplicados y visibilidad
al reabrir la ficha. El historial se filtra antes de decidir si mostrar su
tabla, para no dejar una seccion vacia cuando solo hay ordenes del sandbox.

Evidencia: `docs/evidence/M3/runs/20261004-orders-visibility/summary.md`.
Las respuestas HTTP del test visual son dobles de prueba; no se consideran
integracion clinica. Docker no esta disponible en el entorno Windows y los
endpoints locales de RCE, HAPI y traductor no estan operativos. Se mantiene
`REVIEW` hasta ejecutar `scripts/order-hooks-smoke.mjs` con servicios reales
y repetir el flujo en el Compose de Fedora.
