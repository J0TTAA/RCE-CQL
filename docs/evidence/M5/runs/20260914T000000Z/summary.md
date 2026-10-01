# Evidence - Preparacion de despliegue y CI/CD

## Objetivo

Dejar el repositorio preparado para desplegar el RCE en una VM o plataforma cloud,
con HAPI FHIR externo, traductor CQL local o externo, y una ruta CI/CD para
validar y publicar imagenes versionadas.

## Cambios verificados

- Se agrego `compose.deploy.yaml` para desplegar `api` y `web` desde imagenes
  preconstruidas, sin levantar HAPI ni PostgreSQL locales.
- Se agrego `.github/workflows/ci.yml` para validar SDD, dependencias, lint,
  format check, typecheck, tests, builds y builds Docker.
- Se agrego `.github/workflows/publish-containers.yml` para publicar imagenes
  `api` y `web` en GHCR con tags `sha-<commit>` y tags de release.
- Se actualizo `.env.server.example` con `RCE_API_IMAGE`, `RCE_WEB_IMAGE` y
  `NODE_EXTRA_CA_CERTS` opcional.
- Se actualizo `compose.yaml` para propagar `NODE_EXTRA_CA_CERTS` al contenedor
  `api` tambien en despliegues con build local.
- Se actualizo `README.md` con despliegue por build local o imagenes CI/CD,
  diferencias VM/nube y conexion a HAPI externo.
- Se actualizo `docs/DESIGN.md` con ADR-022, ADR-023, variables reales, vista de`n  CI/CD y HAPI administrado.
- Se actualizo `docs/TASKS.md` dejando `TASK-8.7` en `REVIEW`.

## Comandos ejecutados

| Comando | Exit code | Resultado |
| --- | ---: | --- |
| `docker --version` | 1 | Docker no esta instalado/disponible en esta maquina Windows. |
| `node --version` | 0 | Version local `v21.7.1`, no cumple `.nvmrc`/engines del repo. |
| `npm --version` | 0 | Version local `10.5.0`, menor que el engine npm esperado por el repo. |
| `npm run lint` | 0 | ESLint API sin errores. |
| `npm run format:check` | 0 | Prettier API sin errores. |
| `npm run typecheck` | 0 | TypeScript API sin errores. |
| `npm run typecheck:web` | 0 | TypeScript web sin errores. |
| `npm test` | 0 | 22 tests API pasaron. |
| `npm run build` | 0 | Build API correcto. |
| `npm run build:web` | 0 | Build Vite correcto; aviso local por Node `21.7.1`. |
| `powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1` | 0 | SDD validation passed, `errors: 0`. |
| `git -c safe.directory=D:/universidad/RCE-CQL diff --check` | 0 | Sin errores de whitespace; solo warnings CRLF/LF de Windows. |
| `docker compose --env-file .env.server.example -f compose.hapi.yaml config` | 1 | No ejecutado por falta de Docker en esta sesion Windows. |
| `docker compose --env-file .env.server.example -f compose.deploy.yaml -f compose.hapi.yaml config` | 1 | No ejecutado por falta de Docker en esta sesion Windows. |

## Pendiente de validar en Fedora o CI

| Comando | Proposito |
| --- | --- |
| `docker compose --env-file .env.example config` | Validar Compose local. |
| `docker compose --env-file .env.server.example -f compose.deploy.yaml config` | Validar Compose de despliegue contra HAPI externo. |`n| `docker compose --env-file .env.server.example -f compose.hapi.yaml config` | Validar Compose standalone de HAPI/PostgreSQL administrado. |`n| `docker compose --env-file .env.server.example -f compose.deploy.yaml -f compose.hapi.yaml config` | Validar Compose combinado RCE + HAPI propio en la misma VM. |
| `docker build -f apps/api/Dockerfile .` | Validar imagen API fuera de GitHub Actions. |
| `docker build -f apps/web/Dockerfile .` | Validar imagen web fuera de GitHub Actions. |
| `docker compose --env-file .env -f compose.deploy.yaml up -d` | Smoke test de despliegue con imagenes publicadas. |

## Limitacion

La validacion Docker no se ejecuto localmente porque `docker` no esta disponible
en esta sesion. Los workflows agregados ejecutan esa validacion en GitHub Actions
cuando el codigo se suba al repositorio remoto.
