# Spike M0: CQL a HAPI

## Objetivo

Verificar la compatibilidad real del camino clinico antes de desarrollar reglas y alertas.

## Servicios

| Servicio | URL local | Version |
|---|---|---|
| HAPI FHIR | `http://localhost:8080/fhir` | `v8.10.0-3` |
| CQL Translation Service | `http://localhost:8081` | `v2.9.0` |
| PostgreSQL | Solo red Docker | `18.4` |

## Prerrequisito

Docker Engine/Desktop con `docker compose`. En la inspeccion de 2026-07-26 Docker no estaba disponible en esta maquina.

## Ejecucion

Desde la raiz del repositorio, el mismo Compose principal puede levantar solo las
dependencias del spike:

```powershell
docker compose --env-file .env.example up -d postgres hapi cql-translator
docker compose --env-file .env.example ps
powershell -ExecutionPolicy Bypass -File .\scripts\m0-smoke.ps1
```

El smoke test consulta metadata, traduce CQL con opciones de diagnostico y carga dos pacientes sinteticos. Sus resultados se escriben en `docs/evidence/M0/runs/`.

Detener servicios conservando la base:

```powershell
docker compose --env-file .env.example down
```

Eliminar tambien el volumen sintetico:

```powershell
docker compose --env-file .env.example down --volumes
```

## Siguientes pasos M0

1. Incorporar FHIRHelpers R4 como dependencia versionada.
2. Crear Library con CQL y ELM de la misma fuente.
3. Crear PlanDefinition que referencia la Library.
4. Ejecutar `$apply` para adulto y menor.
5. Registrar la estrategia de prueba de drafts.

No se cierra M0 con la traduccion solamente.
