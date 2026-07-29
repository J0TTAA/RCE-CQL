# RCE educativo con CQL, HAPI FHIR y CDS Hooks

Repositorio para construir un Registro Clinico Electronico educativo donde
alumnos puedan escribir reglas CQL dentro de la aplicacion, validarlas,
traducirlas a ELM, publicarlas como `Library` FHIR y observar recomendaciones
CDS Hooks al modificar pacientes sinteticos.

El objetivo principal es docente: mostrar como CQL usa datos HL7 FHIR para
producir cards de soporte a decisiones clinicas, sin que el alumno tenga que
salir del RCE.

## Estado del proyecto

El proyecto ya integra:

```text
RCE Web -> NestJS API -> HAPI FHIR R4
                  \-> CQL Translation Service

CQL -> ELM -> Library en HAPI -> Patient/$everything -> cql-execution -> CDS Card
```

Versiones candidatas y estado de verificacion:
[docs/COMPATIBILITY_MATRIX.md](./docs/COMPATIBILITY_MATRIX.md).

## Documentos principales

1. [docs/REQUIREMENTS.md](./docs/REQUIREMENTS.md): que debe cumplir el sistema.
2. [docs/DESIGN.md](./docs/DESIGN.md): arquitectura y decisiones tecnicas.
3. [docs/TASKS.md](./docs/TASKS.md): orden de implementacion y gates.
4. [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md): comandos de desarrollo local.
5. [docs/SYNTHETIC_DATA.md](./docs/SYNTHETIC_DATA.md): poblacion Synthea local.
6. [docs/AGE_RULE_DEMO.md](./docs/AGE_RULE_DEMO.md): demo de regla por edad.
7. [docs/CLINICAL_RULE_DEMO.md](./docs/CLINICAL_RULE_DEMO.md): demos clinicas.
8. [docs/CDS_HOOKS_STANDARD.md](./docs/CDS_HOOKS_STANDARD.md): API CDS Hooks.
9. [docs/manual-usuario-latex](./docs/manual-usuario-latex): manual de uso en LaTeX.

Validar coherencia SDD:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1
```

## Que servicios se levantan

| Servicio | Origen | Cuando se usa | Expone puerto por defecto |
| --- | --- | --- | --- |
| `web` | `apps/web` | Siempre | `127.0.0.1:5173` |
| `api` | `apps/api` | Siempre | `127.0.0.1:3000` |
| `cql-translator` | `cqframework/cql-translation-service:v2.9.0` | Si no hay traductor externo | `127.0.0.1:8081` |
| `hapi` | `hapiproject/hapi:v8.10.0-3` | Solo demo/local | `127.0.0.1:8080` |
| `postgres` | `postgres:18.4` | Solo HAPI local | No publico |
| `synthea-seed` | `infra/synthea` | Job opcional para poblar HAPI local | No publico |

El navegador solo debe entrar al RCE Web. HAPI, PostgreSQL y el traductor no
deben exponerse directamente a los alumnos en un despliegue normal.

## Modos de despliegue

| Caso | Archivo base | Perfiles Compose | Resultado |
| --- | --- | --- | --- |
| Notebook/demo completa | `.env.example` | `local-hapi,local-translator` | Levanta web, API, traductor, HAPI y PostgreSQL locales. |
| Clase con pacientes sinteticos en el mismo servidor | `.env.example` | `local-hapi,local-translator` | Igual que demo, pero se publica la URL del RCE mediante proxy o puerto web. |
| Servidor con HAPI institucional existente | `.env.server.example` | `local-translator` | Levanta web, API y traductor; usa el HAPI externo configurado. |
| HAPI externo y traductor externo | `.env.server.example` | vacio | Levanta solo web y API; ambos motores externos se configuran por URL. |

## Requisitos de maquina

- Docker Engine/Desktop con Docker Compose v2.20 o superior.
- Git para clonar o actualizar el repositorio.
- 4 GB de RAM libres como minimo para demo local; 8 GB recomendados si se levanta
  HAPI, PostgreSQL, traductor y frontend juntos.
- Acceso de red desde el contenedor `api` hacia el HAPI externo cuando se use un
  servidor institucional.
- Certificados TLS validos si las URLs son `https`.

No se requiere una distribucion Linux especifica. Los comandos cambian solo en
la forma de copiar archivos o consultar HTTP.

## Despliegue local completo

Este modo sirve para desarrollar, probar en notebook y hacer clases sin depender
del servidor institucional.

### 1. Preparar entorno

Bash, Linux o macOS:

```bash
cp .env.example .env
```

PowerShell, Windows:

```powershell
Copy-Item .env.example .env
```

Revisa `.env` antes de iniciar. Por defecto queda:

```text
COMPOSE_PROFILES=local-hapi,local-translator
HAPI_BASE_URL=http://hapi:8080/fhir
CQL_TRANSLATOR_BASE_URL=http://cql-translator:8080
ANONYMOUS_CLASSROOM_ENABLED=true
```

### 2. Levantar servicios

```bash
docker compose --env-file .env up -d --build
docker compose --env-file .env ps
```

En PowerShell es el mismo comando.

URLs locales:

| Uso | URL |
| --- | --- |
| RCE Web | `http://localhost:5173` |
| API via Web | `http://localhost:5173/api/v1` |
| API directa | `http://localhost:3000/api/v1` |
| Swagger | `http://localhost:3000/docs` |
| HAPI FHIR local | `http://localhost:8080/fhir` |
| CQL Translator local | `http://localhost:8081` |

### 3. Verificar salud

Bash:

```bash
curl -fsS http://localhost:5173/api/v1/health/live
curl -fsS http://localhost:5173/api/v1/health/ready
```

PowerShell:

```powershell
Invoke-RestMethod http://localhost:5173/api/v1/health/live
Invoke-RestMethod http://localhost:5173/api/v1/health/ready
```

`live` comprueba que NestJS esta vivo. `ready` comprueba HAPI, FHIR R4, `Library`
y una traduccion CQL real. Si `ready` responde 503, la API esta funcionando pero
alguna dependencia aun no esta lista o no es alcanzable.

### 4. Poblar HAPI local con pacientes sinteticos

El HAPI local no viene poblado con pacientes utiles para la demo. Se usa Synthea
para generar 30 pacientes ficticios: ninos, adolescentes, adultos y adultos
mayores.

```bash
docker compose --env-file .env --profile local-hapi --profile seed-data build synthea-seed
docker compose --env-file .env --profile local-hapi --profile seed-data run --rm synthea-seed
```

La primera construccion descarga el JAR oficial de Synthea y puede tardar varios
minutos. El job termina al cargar los datos.

Comprobar cantidad de pacientes:

```bash
curl -sG http://localhost:8080/fhir/Patient \
  --data-urlencode '_tag=https://rce-cql.local/fhir/tags/dataset|synthea-4.0.0-v1' \
  --data-urlencode '_summary=count'
```

El total esperado con la configuracion por defecto es `30`.

Mas detalle: [docs/SYNTHETIC_DATA.md](./docs/SYNTHETIC_DATA.md).

## Despliegue en servidor con HAPI externo

Este es el modo pensado para el servidor o VM del docente cuando ya existe un
HAPI con pacientes. El RCE no levanta HAPI ni PostgreSQL propios; NestJS se
conecta al FHIR endpoint existente.

```text
Alumno -> URL del RCE -> web container -> /api proxy -> api container
                                                   \-> HAPI institucional
                                                   \-> CQL Translator
```

### 1. Datos que hay que pedir del HAPI institucional

Antes de desplegar, conviene confirmar:

| Dato | Ejemplo | Por que importa |
| --- | --- | --- |
| URL base FHIR R4 | `https://hapi.institucion.cl/fhir` | Debe responder `/metadata`. |
| Si esta detras de proxy | Nginx, router, VM, VPN | La API Docker debe poder llegar a esa URL. |
| Autenticacion | Ninguna, Bearer token, proxy institucional | El backend hoy soporta Bearer token estatico. |
| Certificado TLS | Publico o CA interna | Node debe confiar en el certificado. |
| Permisos FHIR | leer pacientes, escribir `Library`, `Basic`, `Observation`, etc. | El RCE guarda reglas y overlays de sandbox en HAPI. |
| Tipo de pacientes | sinteticos, anonimizados o reales | El modo aula anonimo no debe usarse con pacientes reales sin auth externa. |

El endpoint configurado debe ser la raiz FHIR, no solo la portada web de HAPI.
Normalmente termina en `/fhir`.

### 2. Crear `.env` de servidor

Bash:

```bash
cp .env.server.example .env
```

PowerShell:

```powershell
Copy-Item .env.server.example .env
```

Editar al menos:

```text
COMPOSE_PROFILES=local-translator
HAPI_BASE_URL=https://hapi.institucion.cl/fhir
HAPI_AUTH_BEARER_TOKEN=
CORS_ORIGINS=https://rce.institucion.cl
ANONYMOUS_SESSION_SECRET=un-secreto-largo-y-unico-para-este-servidor
CLASSROOM_TEACHER_PASSCODE=clave-docente-real
ANONYMOUS_SESSION_COOKIE_SECURE=true
ANONYMOUS_SESSION_COOKIE_SAMESITE=Lax
```

Con `COMPOSE_PROFILES=local-translator`, Compose levanta el traductor CQL local,
pero no levanta HAPI ni PostgreSQL.

Si tambien existe un traductor CQL externo:

```text
COMPOSE_PROFILES=
CQL_TRANSLATOR_BASE_URL=https://traductor.institucion.cl
```

### 3. Levantar RCE contra HAPI externo

```bash
docker compose --env-file .env up -d --build
docker compose --env-file .env ps
```

Debe quedar arriba `web`, `api` y, si se usa el perfil local, `cql-translator`.
No deben aparecer `hapi` ni `postgres` en este modo.

### 4. Verificar conexion a HAPI

Desde el host:

```bash
curl -fsS https://hapi.institucion.cl/fhir/metadata
```

Desde el contenedor API:

```bash
docker compose --env-file .env run --rm --no-deps api node -e "fetch(process.env.HAPI_BASE_URL + '/metadata').then(async r => { console.log(r.status); if (!r.ok) process.exit(1); }).catch(e => { console.error(e.message); process.exit(1); })"
```

Luego verificar el RCE:

```bash
curl -fsS http://localhost:5173/api/v1/health/ready
```

Si hay reverse proxy y dominio publico:

```bash
curl -fsS https://rce.institucion.cl/api/v1/health/ready
```

### 5. Si HAPI esta en la misma VM o host

No uses `localhost` en `HAPI_BASE_URL` si HAPI corre en el host y la API corre
dentro de Docker. Dentro del contenedor, `localhost` significa el contenedor
`api`, no la VM.

Opciones validas:

```text
HAPI_BASE_URL=http://host.docker.internal:8080/fhir
HAPI_BASE_URL=http://IP-DE-LA-VM:8080/fhir
HAPI_BASE_URL=https://hapi.dominio-interno.cl/fhir
```

El compose ya define `host.docker.internal` para Linux mediante
`host-gateway`; en Docker Desktop para Windows/macOS normalmente tambien existe.
Si el Docker Engine es antiguo y no soporta `host-gateway`, usa la IP o DNS del
host.

### 6. Si HAPI esta detras de proxy, router o VPN

La regla es simple: quien debe llegar al HAPI es el contenedor `api`, no el
navegador del alumno.

Revisar:

- El proxy debe aceptar solicitudes desde la VM donde corre Docker.
- La URL debe conservar el path FHIR correcto, por ejemplo `/fhir`.
- Si el proxy exige headers especiales, hoy el backend solo inyecta
  `Authorization: Bearer <token>` mediante `HAPI_AUTH_BEARER_TOKEN`.
- Si el certificado es de CA interna, instalar esa CA en el entorno Docker o
  montar el certificado y usar `NODE_EXTRA_CA_CERTS`.
- Si hay firewall por IP, permitir la IP de salida del servidor Docker.

### 7. Permisos minimos en HAPI externo

Para que el RCE funcione completo, el usuario/token usado por NestJS debe poder:

- Leer `CapabilityStatement` con `GET /metadata`.
- Buscar y leer `Patient`.
- Ejecutar `Patient/{id}/$everything` o leer recursos relacionados equivalentes.
- Leer recursos clinicos FHIR R4 usados por la ficha: `Observation`,
  `Condition`, `MedicationRequest`, `AllergyIntolerance`, `Encounter`,
  `Procedure`, `Immunization` y `ServiceRequest`.
- Crear/actualizar `Library` para reglas CQL/ELM.
- Crear/actualizar recursos de sandbox como `Basic` y overlays clinicos
  controlados.

Si el HAPI institucional solo permite lectura de pacientes, el RCE podra mostrar
fichas pero no tendra el flujo completo de reglas publicadas, overlays de
sandbox y cards dinamicas. En ese caso conviene usar HAPI local sintetico o un
HAPI institucional separado para docencia.

## Publicar la URL a alumnos

### Opcion recomendada: reverse proxy

Mantener `.env` asi:

```text
WEB_BIND_ADDRESS=127.0.0.1
API_BIND_ADDRESS=127.0.0.1
```

El proxy publico apunta solo al frontend:

```text
https://rce.institucion.cl -> http://127.0.0.1:5173
```

El contenedor `web` sirve React y reenvia `/api/*` hacia `api`. Asi los alumnos
usan una sola URL y las cookies del sandbox quedan como first-party cookies.

Ejemplo Caddy:

```caddyfile
rce.institucion.cl {
  reverse_proxy 127.0.0.1:5173
}
```

Ejemplo Nginx:

```nginx
server {
  listen 443 ssl;
  server_name rce.institucion.cl;

  location / {
    proxy_pass http://127.0.0.1:5173;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

Con HTTPS:

```text
ANONYMOUS_SESSION_COOKIE_SECURE=true
ANONYMOUS_SESSION_COOKIE_SAMESITE=Lax
CORS_ORIGINS=https://rce.institucion.cl
```

### Opcion simple sin reverse proxy

Solo para demo o red controlada:

```text
WEB_BIND_ADDRESS=0.0.0.0
WEB_PORT=5173
API_BIND_ADDRESS=127.0.0.1
```

Los alumnos entran a:

```text
http://IP-DEL-SERVIDOR:5173
```

Si no hay HTTPS, usar:

```text
ANONYMOUS_SESSION_COOKIE_SECURE=false
ANONYMOUS_SESSION_COOKIE_SAMESITE=Lax
```

No publiques HAPI, PostgreSQL ni el traductor hacia Internet. Si necesitas abrir
algo, abre solo el puerto del RCE Web o el dominio del reverse proxy.

## Modo aula anonimo y sandboxes

El RCE esta pensado para que el docente entregue una sola URL. Cada navegador
recibe una cookie firmada `HttpOnly` y el backend crea un sandbox tecnico:

```text
Alumno A -> cookie A -> sandbox A -> reglas/cambios/cards A
Alumno B -> cookie B -> sandbox B -> reglas/cambios/cards B
```

No hay login visible para alumnos. El identificador corto de sandbox solo sirve
para soporte durante la clase.

Importante:

- Un alumno no debe mandar `sandboxId`; NestJS lo resuelve desde la cookie.
- Las reglas privadas, pruebas, overlays de paciente y actividad CDS se filtran
  por sandbox.
- El rol docente puede protegerse con `CLASSROOM_TEACHER_PASSCODE`.
- El modo anonimo no debe usarse con pacientes reales sin una capa externa de
  autenticacion/autorizacion institucional.

## Datos sinteticos

Synthea solo se usa para HAPI local:

```bash
docker compose --env-file .env --profile local-hapi --profile seed-data run --rm synthea-seed
```

No se debe usar este job para poblar el HAPI institucional del docente. Si se
requiere cargar datos en un servidor institucional, debe definirse una carga
controlada, autorizada y separada del entorno real.

## Operacion diaria

Ver contenedores:

```bash
docker compose --env-file .env ps
```

Ver logs de la API:

```bash
docker compose --env-file .env logs -f api
```

Ver logs del frontend:

```bash
docker compose --env-file .env logs -f web
```

Reiniciar un servicio:

```bash
docker compose --env-file .env restart api
```

Detener conservando datos:

```bash
docker compose --env-file .env down
```

Eliminar tambien la base local de HAPI:

```bash
docker compose --env-file .env down --volumes
```

Actualizar codigo en un servidor:

```bash
git pull
docker compose --env-file .env up -d --build
docker compose --env-file .env ps
```

## Diferencias Windows, Linux y macOS

| Tema | Linux/macOS Bash | Windows PowerShell |
| --- | --- | --- |
| Copiar `.env` | `cp .env.example .env` | `Copy-Item .env.example .env` |
| Consultar HTTP | `curl -fsS URL` | `Invoke-RestMethod URL` |
| Continuacion de linea | `\` | `` ` `` |
| HAPI en host desde Docker | `host.docker.internal` con `host-gateway` o IP | `host.docker.internal` en Docker Desktop |
| Publicar puerto | `WEB_BIND_ADDRESS=0.0.0.0` | Igual en `.env` |

Los comandos `docker compose` son iguales en ambos sistemas.

## Problemas comunes

### `ready` responde 503

Revisar logs:

```bash
docker compose --env-file .env logs --tail=100 api
docker compose --env-file .env logs --tail=100 cql-translator
```

Causas frecuentes:

- HAPI todavia esta iniciando.
- `HAPI_BASE_URL` apunta a `localhost` desde dentro del contenedor.
- El proxy de HAPI no conserva `/fhir`.
- Falta token o el token no tiene permisos.
- El traductor CQL no esta levantado o la URL es incorrecta.

### Los alumnos ven la pantalla pero no mantienen sesion

Revisar cookies:

- En HTTPS: `ANONYMOUS_SESSION_COOKIE_SECURE=true`.
- En HTTP local: `ANONYMOUS_SESSION_COOKIE_SECURE=false`.
- Si web y API estan en dominios distintos, usar `SameSite=None` y HTTPS.
- Preferir una sola URL publica hacia `web`, que reenvia `/api`.

### HAPI externo funciona en el navegador pero falla en Docker

El navegador no prueba lo mismo que la API. Validar desde el contenedor:

```bash
docker compose --env-file .env run --rm --no-deps api node -e "fetch(process.env.HAPI_BASE_URL + '/metadata').then(r => console.log(r.status)).catch(e => { console.error(e.message); process.exit(1); })"
```

Si falla, revisar DNS, VPN, firewall, certificado TLS o ruta del proxy.

### Los pacientes no aparecen

En HAPI local, poblar con Synthea. En HAPI externo, confirmar que el token puede
buscar `Patient` y que el servidor contiene pacientes sinteticos o anonimizados
aptos para docencia.

### No se publican reglas

El backend guarda reglas como `Library` FHIR con CQL y ELM. El HAPI configurado
debe permitir escritura de `Library`. Si el servidor externo es solo lectura, la
autoria CQL no podra completarse contra ese HAPI.

## Principios no negociables

- No usar pacientes reales en el modo aula anonimo sin seguridad institucional.
- El frontend nunca debe llamar directo a HAPI ni al traductor.
- NestJS no implementa parser, traductor ni motor CQL propio.
- No se simulan reglas clinicas con `if` ad hoc en TypeScript.
- HAPI se consume por API FHIR R4, nunca por sus tablas PostgreSQL.
- Ninguna sugerencia CDS modifica FHIR sin confirmacion explicita.
- Las imagenes Docker usan tags fijados, no tags flotantes.
