# Visibilidad de ordenes y lecturas concurrentes

Fecha: 2026-10-13. Entorno: Windows local, Node 24.19.0 para los tests y el
build web. HAPI y traductor reales no estaban disponibles en este equipo.

## Comprobaciones

- `npm run typecheck --workspace @rce-cql/api`: exit code 0.
- `npm run typecheck --workspace @rce-cql/web`: exit code 0.
- `tsc -p apps/api/tsconfig.json` y `node --test` sobre los specs compilados:
  exit code 0, 38 tests pasados, 0 fallidos. Incluye confirmacion idempotente,
  aislamiento por sandbox, una sola lectura FHIR de la ficha y consultas base
  compartidas entre diez sandboxes concurrentes.
- `npm run lint --workspace @rce-cql/api`: exit code 0.
- `npm run format:check --workspace @rce-cql/api`: exit code 0.
- `npm run build --workspace @rce-cql/web`: exit code 0 con Node 24.19.0 fuera
  del sandbox, despues de un `EPERM` de `fs.realpath` dentro de este.
- `node scripts/order-hooks-ui-check.mjs` con Chrome y HTTP simulado: exit code
  0 en 1440x1000 y 390x844. La orden aparece antes de liberar la lectura
  atrasada del paciente, sigue visible despues de recibirla y al reabrir la
  ficha. La apertura normal ya no pide `/cards` por separado.
- Capturas: `signed-orders-1440.png`, `signed-orders-390.png`, ademas de las
  capturas del formulario y `ui-check.json`.

## Pendiente

El test visual usa dobles HTTP, no HAPI. Falta ejecutar
`scripts/order-hooks-smoke.mjs` contra el Compose real en Fedora y medir la
latencia/errores con 10 navegadores antes de afirmar capacidad de aula.
