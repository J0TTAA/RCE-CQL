# Desarrollo local

## Que se construye y que se trae

| Pieza                   | Origen                                              | Funcion                                                           |
| ----------------------- | --------------------------------------------------- | ----------------------------------------------------------------- |
| NestJS API              | `apps/api` de este repositorio                      | Orquesta casos de uso, sandbox, CQL, FHIR y CDS Hooks educativos. |
| HAPI FHIR               | Imagen `hapiproject/hapi:v8.10.0-3`                 | Repositorio FHIR R4 de pacientes, Library, overlays y actividad.  |
| CQL Translation Service | Imagen `cqframework/cql-translation-service:v2.9.0` | Valida y traduce CQL a ELM JSON.                                  |
| PostgreSQL              | Imagen `postgres:18.4`                              | Persistencia privada de HAPI.                                     |
| Synthea                 | Imagen construida desde `infra/synthea`             | Genera y carga pacientes FHIR R4 exclusivamente en HAPI local.    |
| Frontend                | `apps/web` de este repositorio                      | Monaco, pacientes, reglas y cards educativas.                     |

Nest no interpreta CQL con logica propia. La traduccion CQL -> ELM se hace con
CQL Translation Service y la evaluacion ELM contra bundles FHIR se hace con
`cql-execution` + `cql-exec-fhir`. HAPI queda como BDD FHIR para pacientes,
`Library`, overlays de sandbox y actividad CDS.

Synthea tampoco es un servicio permanente. Es un job opcional que termina
despues de generar y cargar la poblacion por la API FHIR.

## Despliegue con HAPI institucional

En el servidor no se debe levantar otro HAPI ni otro PostgreSQL. Se copia la
plantilla especifica y se configura la URL real:

```powershell
Copy-Item .env.server.example .env
# Editar HAPI_BASE_URL, CORS_ORIGINS y, si corresponde, el token.
docker compose up -d --build
```

La variable `COMPOSE_PROFILES=local-translator` hace que solo se levanten la
API, frontend y traductor. Los servicios `hapi` y `postgres` pertenecen al perfil
`local-hapi` y quedan deshabilitados.

```text
RCE Web -> RCE Nest en Docker -> HAPI institucional -> PostgreSQL institucional
                             -> Traductor CQL en Docker
```

`HAPI_AUTH_BEARER_TOKEN` permite un bearer token estatico sin guardarlo en el
repositorio. Si el servidor usa OAuth2 con client credentials, se agregara el
flujo de renovacion cuando se conozca el mecanismo institucional.

## Plataforma completa

Prerequisito: Docker Engine/Desktop con Compose `2.20.0` o superior. La version
minima permite declarar dependencias opcionales cuando se usa el HAPI
institucional.

La plantilla `.env.example` habilita `local-hapi` y `local-translator`, por lo
que este modo crea toda la plataforma sintetica.

```powershell
Copy-Item .env.example .env
docker compose up -d --build
docker compose ps
```

Servicios publicados solo en localhost:

| Servicio      | URL                            |
| ------------- | ------------------------------ |
| API           | `http://localhost:3000/api/v1` |
| Swagger       | `http://localhost:3000/docs`   |
| HAPI FHIR     | `http://localhost:8080/fhir`   |
| Traductor CQL | `http://localhost:8081`        |

Comprobar la plataforma:

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/health/live
Invoke-RestMethod http://localhost:3000/api/v1/health/ready
```

`live` solo comprueba el proceso Nest. `ready` comprueba FHIR R4, Library y una
traduccion CQL real. Por eso `ready` devuelve HTTP 503 si HAPI o el traductor no
estan listos.

Detener conservando pacientes y reglas:

```powershell
docker compose down
```

Eliminar tambien la base sintetica:

```powershell
docker compose down --volumes
```

## Poblar HAPI con pacientes realistas

La poblacion de demostracion se genera con Synthea 4.0.0 y semillas fijas. No
contiene datos de personas reales. Incluye ninos, adolescentes, adultos y
adultos mayores con recursos clinicos longitudinales FHIR R4.

```bash
docker compose --profile local-hapi --profile seed-data build synthea-seed
docker compose --profile local-hapi --profile seed-data run --rm synthea-seed
```

El comando es idempotente despues de una carga completa. La composicion,
consultas de verificacion, limitaciones demograficas y recuperacion ante una
carga interrumpida estan en
[SYNTHETIC_DATA.md](./SYNTHETIC_DATA.md).

## Solo backend

Prerequisito: Node `24.18.0` y npm 11. HAPI y el traductor pueden estar en
Docker o en URLs externas configuradas.

```powershell
npm ci
$env:HAPI_BASE_URL='http://localhost:8080/fhir'
$env:CQL_TRANSLATOR_BASE_URL='http://localhost:8081'
npm run dev:api
```

Comandos de calidad:

```powershell
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

## Endpoints iniciales

| Metodo | Ruta                    | Uso                                  |
| ------ | ----------------------- | ------------------------------------ |
| GET    | `/api/v1/health/live`   | Liveness de Nest.                    |
| GET    | `/api/v1/health/ready`  | Readiness de HAPI y traductor.       |
| POST   | `/api/v1/cql/translate` | CQL a ELM mediante el servicio real. |
| GET    | `/docs/openapi.json`    | Contrato OpenAPI.                    |

No existe fallback simulado de traduccion. Si el traductor falla, la API
responde con error estable y `correlationId`.
