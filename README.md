# RCE educativo con CQL

Repositorio para construir un Registro Clinico Electronico educativo donde alumnos puedan editar CQL dentro de la aplicacion, traducirlo a ELM, publicarlo como artefactos FHIR y observar recomendaciones CDS Hooks al modificar pacientes sinteticos.

## Estado

El proyecto combina el hito `M0` de prueba clinica con la fundacion del backend
NestJS. El backend ya orquesta HAPI y CQL Translation Service; la cadena clinica
completa todavia debe demostrarse con servicios reales:

```text
CQL -> ELM -> Library/PlanDefinition -> HAPI Clinical Reasoning -> resultado
```

Versiones candidatas y estado de verificacion: [COMPATIBILITY_MATRIX.md](./docs/COMPATIBILITY_MATRIX.md).

Bloqueo local actual: Docker CLI no esta instalado o no esta disponible en `PATH`.

## Documentos fuente

1. [REQUIREMENTS.md](./docs/REQUIREMENTS.md): que debe cumplir el sistema.
2. [DESIGN.md](./docs/DESIGN.md): como se construira.
3. [TASKS.md](./docs/TASKS.md): orden de implementacion y gates.
4. [WORKFLOW.md](./docs/WORKFLOW.md): como se ejecuta y verifica el trabajo.
5. [TRACEABILITY.md](./docs/TRACEABILITY.md): relacion entre aceptacion, diseno, tareas y evidencia.
6. [RISK_REGISTER.md](./docs/RISK_REGISTER.md): riesgos activos y mitigaciones.
7. [DEVELOPMENT.md](./docs/DEVELOPMENT.md): servicios, comandos y endpoints locales.

## Trabajo actual

El spike clinico esta en
[WO-0001](./docs/work-orders/WO-0001-M0-ARCHITECTURE-SPIKE.md). La fundacion
del backend y el Compose principal se registran en
[WO-0002](./docs/work-orders/WO-0002-BACKEND-FOUNDATION.md).

Validar la coherencia documental:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1
```

Cuando Docker este disponible, levantar toda la plataforma desde la raiz:

```powershell
docker compose --env-file .env.example up -d --build
docker compose --env-file .env.example ps
```

La API queda en `http://localhost:3000/api/v1`, Swagger en
`http://localhost:3000/docs`, HAPI en `http://localhost:8080/fhir` y el
traductor en `http://localhost:8081`.

Para ejecutar solo el spike M0:

```powershell
docker compose --env-file .env.example up -d postgres hapi cql-translator
powershell -ExecutionPolicy Bypass -File .\scripts\m0-smoke.ps1
```

El servicio `cql-translator` solo transforma y valida CQL a ELM. El motor de
evaluacion clinica esta incluido en HAPI mediante Clinical Reasoning. NestJS no
reimplementa ninguno de los dos: coordina llamadas, aplica permisos y expone la
API del RCE.

Para desplegar contra un HAPI institucional existente, usar
`.env.server.example`. Ese modo levanta la API y el traductor, pero no crea HAPI
ni PostgreSQL locales. Los detalles estan en
[DEVELOPMENT.md](./docs/DEVELOPMENT.md).

## Principios no negociables

- Solo pacientes sinteticos.
- El frontend nunca accede directamente a HAPI ni al traductor.
- NestJS no evalua CQL con reglas ad hoc en TypeScript.
- Una traduccion o evaluacion simulada nunca cuenta como evidencia de integracion.
- Ninguna sugerencia modifica FHIR sin confirmacion explicita.
- Una tarea solo termina con una verificacion ejecutada y evidencia identificable.
