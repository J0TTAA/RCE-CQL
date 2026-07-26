# Matriz de compatibilidad

## Estado

| Campo | Valor |
|---|---|
| Hito | M0 - Prueba de arquitectura |
| Fecha de seleccion | 2026-07-26 |
| Estado global | Seleccionado, no verificado localmente |
| Bloqueo | Docker CLI no disponible en la maquina actual |

`Seleccionado` significa que existe una version oficial fijada. No significa que la interoperabilidad haya sido demostrada.

## Versiones candidatas

| Componente | Version/imagen fijada | Relacion | Estado |
|---|---|---|---|
| HAPI FHIR JPA Starter | `hapiproject/hapi:v8.10.0-3` | HAPI FHIR 8.10.0 | UNVERIFIED |
| HAPI Clinical Reasoning | `4.9.0` incluida por la imagen | Ejecuta artefactos CQL/ELM mediante operaciones FHIR | UNVERIFIED |
| CQL Translation Service | `cqframework/cql-translation-service:v2.9.0` | Expone CQL Tools 4.7.0 | UNVERIFIED |
| CQL Tools | `4.7.0` | Traductor y validacion semantica CQL a ELM | UNVERIFIED |
| FHIR | `R4 4.0.1` | Modelo base del MVP | SELECTED |
| CQL | `1.5.3` como baseline normativa R4 | Lenguaje de reglas | SELECTED |
| PostgreSQL | `postgres:18.4` | Persistencia interna de HAPI | UNVERIFIED |

## Decision sobre cql-engine

El repositorio separado `cqframework/cql-engine` queda `EXCLUDED`:

- Fue archivado el 21 de diciembre de 2022.
- Su codigo fue incorporado a `cqframework/clinical_quality_language`.
- El backend NestJS no necesita embeber un runtime Java.
- La primera opcion de ejecucion es HAPI Clinical Reasoning, protegida por `RuleExecutorPort` para poder reemplazarla si M0 falla.

## Compatibilidad que debe demostrarse

| ID | Verificacion | Evidencia esperada | Estado |
|---|---|---|---|
| COMP-001 | HAPI inicia con PostgreSQL y responde `/fhir/metadata`. | CapabilityStatement y logs de inicio. | PENDING |
| COMP-002 | Clinical Reasoning esta habilitado y anuncia operaciones relevantes. | CapabilityStatement inspeccionado. | PENDING |
| COMP-003 | El traductor acepta CQL FHIR R4 y retorna ELM JSON con locators y tipos. | Request CQL, response ELM y exit code. | PENDING |
| COMP-004 | HAPI almacena Patient, Library y PlanDefinition R4 validos. | Recursos leidos desde la API FHIR. | PENDING |
| COMP-005 | El ELM de Translation Service es consumible por Clinical Reasoning 4.9.0. | Resultado real de `$apply` o incompatibilidad reproducible. | PENDING |
| COMP-006 | Un paciente adulto aplica y un menor no aplica. | Dos resultados de evaluacion asociados a fixtures. | PENDING |
| COMP-007 | Se define el camino para probar un draft sin publicarlo. | Resultado de `$apply` sobre draft o fallback documentado. | PENDING |

## Fuentes oficiales

- [CQL Translation Service](https://github.com/cqframework/cql-translation-service)
- [CQL Translation Service v2.9.0 en Docker Hub](https://hub.docker.com/r/cqframework/cql-translation-service/tags)
- [Clinical Quality Language tooling](https://github.com/cqframework/clinical_quality_language)
- [cql-engine archivado](https://github.com/cqframework/cql-engine)
- [HAPI FHIR v8.10.0](https://github.com/hapifhir/hapi-fhir/releases/tag/v8.10.0)
- [HAPI JPA Starter releases](https://github.com/hapifhir/hapi-fhir-jpaserver-starter/releases)
- [HAPI Clinical Reasoning](https://hapifhir.io/hapi-fhir/docs/clinical_reasoning/overview.html)
- [PostgreSQL 18.4](https://www.postgresql.org/docs/release/18.4/)
- [CQL 1.5.3](https://cql.hl7.org/)
