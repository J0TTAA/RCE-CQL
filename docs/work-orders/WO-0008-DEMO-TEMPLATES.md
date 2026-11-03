# WO-0008 - Cuatro reglas docentes y punto de partida vacio

## Estado

REVIEW

## Alcance

Solicitud del usuario: reemplazar las plantillas del selector por tres reglas
simples (una por hook) y una completa, conservando `En blanco`.
El selector tendra cinco opciones, de las cuales cuatro son reglas de ejemplo.

- Mantener CQL ejecutado por el motor existente y parametros de contexto.
- Reemplazar las plantillas de alergia y diabetes al ordenar por ejemplos que
  solo requieren una seleccion de medicamento o una solicitud de examen.
- Conservar como ejemplo completo la conjuncion de cuatro hechos clinicos.
- Actualizar el libreto, la guia de hooks y las pruebas que consumen el catalogo.
- No borrar reglas ya persistidas en HAPI ni cambiar los flujos de confirmacion.

Referencias: REQ-F-001, REQ-F-002, REQ-F-004, REQ-F-033; TASK-6.8, TASK-5.8.
Se mantiene TASK-8.11 como unica tarea IN_PROGRESS.

## Aceptacion

- Selector: En blanco, tres ejemplos simples y uno completo; sin opciones antiguas.
- Cada ejemplo crea un borrador con CQL, mensaje y hook correspondientes.
- La seleccion de amoxicilina y la solicitud pendiente de HbA1c no dependen
  de alergia o diabetes; otras ordenes no activan esas reglas.
- Las referencias de Selections/DraftOrders excluyen ordenes historicas.
- Lint, typecheck, tests y build de API, comprobacion UI y SDD documentados.
- Traduccion y evaluacion real se distinguen de pruebas con dobles HTTP.

## Evidencia

Registrar resultados en `docs/evidence/M2/runs/20261103-demo-templates/`.

Resultados: [resumen de verificacion](../evidence/M2/runs/20261103-demo-templates/summary.md).
Lint, tipos, tests, builds y UI pasan; traduccion/ejecucion de las plantillas
contra el servicio real pendiente por traductor local no disponible.
