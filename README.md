# RCE educativo con CQL

Repositorio para construir un Registro Clinico Electronico educativo donde alumnos puedan editar CQL dentro de la aplicacion, traducirlo a ELM, publicarlo como artefactos FHIR y observar recomendaciones CDS Hooks al modificar pacientes sinteticos.

## Estado

El proyecto combina el hito `M0` de prueba clinica con una primera integracion
usable del RCE. El backend orquesta HAPI, CQL Translation Service y ejecucion ELM
con `cql-execution`:

```text
CQL -> ELM -> Library en HAPI -> bundle Patient/$everything -> cql-execution -> card
```

Versiones candidatas y estado de verificacion: [COMPATIBILITY_MATRIX.md](./docs/COMPATIBILITY_MATRIX.md).

## Documentos fuente

1. [REQUIREMENTS.md](./docs/REQUIREMENTS.md): que debe cumplir el sistema.
2. [DESIGN.md](./docs/DESIGN.md): como se construira.
3. [TASKS.md](./docs/TASKS.md): orden de implementacion y gates.
4. [WORKFLOW.md](./docs/WORKFLOW.md): como se ejecuta y verifica el trabajo.
5. [TRACEABILITY.md](./docs/TRACEABILITY.md): relacion entre aceptacion, diseno, tareas y evidencia.
6. [RISK_REGISTER.md](./docs/RISK_REGISTER.md): riesgos activos y mitigaciones.
7. [DEVELOPMENT.md](./docs/DEVELOPMENT.md): servicios, comandos y endpoints locales.
8. [SYNTHETIC_DATA.md](./docs/SYNTHETIC_DATA.md): generacion y carga reproducible de pacientes.
9. [Frontend README](./docs/frontend/README.md): SDD visual y prompt para la maqueta v0.
10. [AGE_RULE_DEMO.md](./docs/AGE_RULE_DEMO.md): prueba end-to-end de regla CQL por edad.

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

El servicio `cql-translator` transforma y valida CQL a ELM. NestJS ejecuta ELM
con `cql-execution` + `cql-exec-fhir` sobre bundles obtenidos desde HAPI; no
interpreta reglas clinicas con logica ad hoc.

Poblar el HAPI local con 30 pacientes Synthea:

```bash
docker compose --profile local-hapi --profile seed-data build synthea-seed
docker compose --profile local-hapi --profile seed-data run --rm synthea-seed
```

Probar el flujo completo con una regla CQL por edad:

```text
docs/AGE_RULE_DEMO.md
```

Para desplegar contra un HAPI institucional existente, usar
`.env.server.example`. Ese modo levanta la API y el traductor, pero no crea HAPI
ni PostgreSQL locales. Los detalles estan en
[DEVELOPMENT.md](./docs/DEVELOPMENT.md).

## Principios no negociables

- Solo pacientes sinteticos.
- En clase, una sola URL puede servir a varios alumnos mediante sandbox anonimo por navegador.
- El frontend nunca accede directamente a HAPI ni al traductor.
- NestJS no evalua CQL con reglas ad hoc en TypeScript.
- Una traduccion o evaluacion simulada nunca cuenta como evidencia de integracion.
- Ninguna sugerencia modifica FHIR sin confirmacion explicita.
- Una tarea solo termina con una verificacion ejecutada y evidencia identificable.
