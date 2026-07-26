# WO-0002 - Fundacion backend y Compose principal

| Campo | Valor |
|---|---|
| Estado | REVIEW |
| Fecha | 2026-07-26 |
| Objetivo | Iniciar NestJS y dejar la plataforma completa conectada por un Compose raiz. |
| Bloqueo residual | Docker CLI no disponible para ejecutar servicios reales. |

## Alcance

- Workspace npm y API NestJS con TypeScript strict.
- Configuracion tipada, errores, correlationId, logs JSON y redaccion.
- Puertos y adaptadores HTTP iniciales para HAPI y CQL Translation Service.
- Liveness, readiness, endpoint de traduccion y OpenAPI.
- Dockerfile de API y Compose raiz con PostgreSQL, HAPI y traductor.
- Pruebas unitarias y smoke HTTP local.

## Fuera de alcance

- CRUD y lifecycle de reglas.
- Persistencia de Library/PlanDefinition.
- Evaluacion `$apply` y CDS Hooks.
- Frontend y Monaco.
- Cierre del spike clinico M0.

## Criterios observables

1. `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` terminan con codigo 0.
2. `/health/live` responde 200 con Nest aislado.
3. `/health/ready` responde 503 cuando las dependencias obligatorias estan ausentes.
4. OpenAPI contiene las rutas iniciales.
5. Un solo `compose.yaml` define API, HAPI, traductor y PostgreSQL con versiones fijadas.

## Evidencia

- `docs/evidence/M1/runs/20260726T094853Z/summary.md`
- El cierre Docker queda pendiente de instalar o habilitar un runtime Compose.
