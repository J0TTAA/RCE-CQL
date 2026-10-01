# Evidencia TASK-5.8 - order-select y order-sign

Fecha: 2026-09-15 y cierre documental 2026-09-16.

## Alcance

- `order-select` con `context.selections` y `context.draftOrders`.
- `order-sign` con `context.draftOrders` antes de confirmar.
- `MedicationRequest` y `ServiceRequest` FHIR R4 construidos desde catalogo.
- Parametros `Selections` y `DraftOrders` entregados al motor CQL instalado.
- Revision temporal, confirmacion explicita, repeticion idempotente y sandbox.
- Formulario responsivo y plantillas educativas para alergia y diabetes.

## Resultados ejecutados

| Verificacion | Resultado |
| --- | --- |
| API lint | Exit 0 |
| API typecheck | Exit 0 |
| API build | Exit 0 |
| API tests | Exit 0, 35/35 |
| API format check | Exit 0 |
| Web typecheck + Vite build | Exit 0, 1824 modulos |
| `node --check scripts/order-hooks-smoke.mjs` | Exit 0 |
| `node --check scripts/order-hooks-ui-check.mjs` | Exit 0 |
| UI desktop 1440x1000 | Exit 0 |
| UI movil 390x844 | Exit 0 |
| SDD validator final | Exit 0, 0 errores, 0 tareas IN_PROGRESS |

La suite de API uso `cql-execution` y `cql-exec-fhir` instalados para comprobar
que una orden pendiente y los parametros CQL producen resultado positivo y
negativo, sin mutar el bundle base. Tambien comprobo que una revision pendiente
no aparece como orden confirmada, que otro sandbox no puede confirmarla y que
repetir la confirmacion no duplica recursos.

La prueba Playwright usa Chrome instalado y respuestas HTTP controladas. Verifica
seleccion, UUID, campos obligatorios, firma, invalidacion al editar, recuperacion
tras error API, confirmacion, actualizacion de ficha, plantillas y ausencia de
overflow. Es evidencia de UI solamente, no de interoperabilidad clinica.

Artefactos:

- `ui-check.json`
- `orders-1440.png`
- `orders-390.png`
- `templates-1440.png`
- `templates-390.png`
- `vite.log` y `vite-errors.log`

## Resultado negativo valido

El comando:

```text
node scripts/order-hooks-smoke.mjs --synthetic-patient-id ui-patient
```

termino con exit 1 y `ECONNREFUSED` en `localhost:3000`. No habia API, HAPI ni
traductor reales levantados en este equipo. Por tanto no se afirma que las
plantillas de esta tarea hayan recorrido aun CQL -> traductor -> ELM -> Library
en HAPI -> motor -> card. El script queda listo para ejecutarse en Fedora con
los servicios reales y un identificador de paciente sintetico.

## Limitaciones conservadas

- El catalogo es docente y limitado; no implementa prescripcion institucional.
- Confirmar materializa ordenes solo en el bundle efectivo del sandbox; no envia
  recetas a farmacias ni modifica el paciente base.
- `encounter-start`, `problem-list-item-create` y `allergyintolerance-create`
  quedan documentados como evolucion por su menor madurez en la biblioteca.
- No se cierra M0 ni TASK-5.8 como DONE hasta ejecutar la integracion real.
