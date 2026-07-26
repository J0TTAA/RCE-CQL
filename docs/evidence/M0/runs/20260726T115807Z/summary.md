# Evidencia parcial M0 - servicios base

| Campo | Valor |
|---|---|
| Fecha | 2026-07-26 |
| Entorno | Fedora, Docker Compose |
| Alcance | Inicio de servicios, readiness y traduccion CQL a ELM |
| Resultado | PASS parcial |

## Servicios observados

`docker ps` mostro activos:

- `rce-cql-api-1`, healthy, puerto local 3000.
- `rce-cql-hapi-1`, healthy, HAPI 8.10.0, puerto local 8080.
- `rce-cql-postgres-1`, healthy, PostgreSQL 18.4 privado.
- `rce-cql-cql-translator-1`, CQL Translation Service 2.9.0, puerto local 8081.

## Readiness

`GET /api/v1/health/ready` respondio `status: up`. La comprobacion de HAPI
reporto FHIR `4.0.1`, software `8.10.0`, disponibilidad de `Library` y
`PlanDefinition`, y operacion `$apply` anunciada. La comprobacion del traductor
compilo la libreria de readiness.

## Traduccion

El fixture `spikes/m0/fixtures/cql/RceAdultPatient.cql` se envio a
`POST /api/v1/cql/translate`. El ELM retornado identifico la libreria:

```json
{
  "id": "RceAdultPatient",
  "version": "0.1.0"
}
```

## Pendiente

- Instalar y resolver FHIRHelpers R4.
- Persistir Library y PlanDefinition reales.
- Ejecutar `$apply` contra adulto y menor.
- Ejecutar el job Synthea y registrar conteos por cohorte.
