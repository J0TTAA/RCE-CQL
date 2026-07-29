# Evidence - CDS Hooks standard facade

| Campo | Valor |
| --- | --- |
| Fecha UTC | 2026-07-29T08:09:14Z |
| Alcance | Discovery CDS Hooks, servicios estandar y sandbox libre de reglas CQL |

## Cambios verificados

- Se agrego `CdsHooksModule` con discovery `GET /cds-services`.
- Se agregaron servicios `POST /cds-services/rce-patient-view`,
  `POST /cds-services/rce-order-select` y `POST /cds-services/rce-order-sign`.
- Las respuestas de evaluacion se mapean a CDS Hooks cards con `summary`,
  `indicator` y `source.label`.
- La invocacion usa el sandbox de la cookie anonima y delega al evaluador CQL/FHIR
  existente.
- Recursos FHIR recibidos en `prefetch` se agregan al bundle efectivo solo durante
  la invocacion.
- Se documento el contrato operativo y el modo de reglas CQL libres.

## Comandos ejecutados

| Comando | Exit code | Resultado |
| --- | ---: | --- |
| `npm run lint --workspace @rce-cql/api` | 0 | Sin errores |
| `npm run typecheck --workspace @rce-cql/api` | 0 | Sin errores |
| `npm test --workspace @rce-cql/api` | 0 | 19 tests pasan |
| `npm run build --workspace @rce-cql/api` | 0 | Build API OK |
| `powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1` | 0 | SDD validation passed |
| `npm run format:check --workspace @rce-cql/api` | 0 | Prettier OK |
| `git -c safe.directory=D:/universidad/RCE-CQL diff --check` | 0 | Sin errores de whitespace |

## Notas

- No se ejecuto smoke HTTP contra Docker/HAPI desde esta maquina.
- `fhirServer` recibido por CDS Hooks se trata como no confiable en el MVP y no
  reemplaza el HAPI configurado por backend.
