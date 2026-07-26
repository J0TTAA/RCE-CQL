# WO-0001 - Prueba de arquitectura CQL/FHIR

| Campo | Valor |
|---|---|
| Estado | IN_PROGRESS |
| Hito | M0 |
| Tareas | TASK-0.1 a TASK-0.9 |
| Riesgo | Alto |
| Bloqueo | Faltan FHIRHelpers, Library/PlanDefinition y `$apply` real |

## Objetivo

Demostrar con versiones fijadas que CQL valido puede traducirse a ELM, empaquetarse como Library/PlanDefinition y evaluarse contra dos pacientes sinteticos mediante HAPI Clinical Reasoning.

## Incluido

- Seleccion de versiones oficiales.
- Docker Compose local para PostgreSQL, HAPI y CQL Translation Service.
- CQL minimo y pacientes sinteticos.
- Traduccion con locators, tipos y errores detallados.
- Persistencia de artefactos FHIR R4.
- Ejecucion `$apply` y comparacion adulto/menor.
- Evidencia cruda, matriz de compatibilidad y decision go/no-go.

## Excluido

- Backend NestJS y frontend React.
- Monaco Editor.
- API CDS Hooks propia.
- Autenticacion multiusuario.
- Pacientes reales.
- Despliegue externo.
- Implementacion propia de CQL o ELM.

## Entradas autorizadas

- `docs/REQUIREMENTS.md`
- `docs/DESIGN.md`
- `docs/TASKS.md`
- Repositorios y documentacion oficial de HL7, CQFramework, HAPI y PostgreSQL.
- Fixtures bajo `spikes/m0/fixtures/`.

## Restricciones

- Servicios solo en localhost durante M0.
- Imagenes con version fija.
- Datos exclusivamente sinteticos.
- No declarar compatibilidad antes de ejecutar `$apply`.
- Conservar respuestas negativas y OperationOutcome.

## Criterios de cierre

1. COMP-001 a COMP-007 tienen evidencia y estado final.
2. Se conoce la forma real de Library, PlanDefinition y respuesta `$apply`.
3. Se decide si HAPI Clinical Reasoning implementa `RuleExecutorPort`.
4. `docs/COMPATIBILITY_MATRIX.md`, `docs/TRACEABILITY.md` y `docs/RISK_REGISTER.md` quedan actualizados.
5. TASK-0.9 registra una decision go/no-go antes de iniciar WBS 1.

## Side effects

- Descarga de imagenes Docker al aprobar la ejecucion.
- Creacion de volumen PostgreSQL local.
- Escritura de recursos FHIR sinteticos en HAPI local.
- Creacion de evidencia bajo `docs/evidence/M0/runs/`.
