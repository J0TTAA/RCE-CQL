# WO-0006 - Crear reglas desde un modal del catalogo

## Estado

REVIEW

## Referencias

- TASK-6.8: catalogo de reglas y estados visuales.
- REQ-F-001, REQ-F-002, REQ-F-004, REQ-F-017, REQ-I-001.
- DESIGN.md, seccion 9.1.

## Objetivo

Al pulsar `Nueva regla`, elegir el punto de partida en un modal sobre el
catalogo y, al confirmar, pasar a la pantalla existente del editor.

## Alcance

- Opcion inicial `En blanco`, entregada por NestJS con CQL minimo sin criterio
  clinico, y conservacion de las plantillas actuales.
- Cancelacion sin escrituras, foco de teclado y manejo de carga y errores.
- Creacion explicita de un unico borrador inactivo y navegacion posterior.
- Conservar `/rules/new` como enlace directo al catalogo con el modal abierto.
- No modificar el flujo de ordenes ni el despliegue Docker.

## Aceptacion

- El catalogo sigue visible al abrir el modal en escritorio y movil.
- `En blanco` esta seleccionado al abrirlo y se puede cambiar por una plantilla.
- Cancelar, cerrar y Escape no crean una regla ni pierden los filtros del catalogo.
- Un fallo de carga permite reintentar la lectura; un fallo al crear conserva
  la seleccion y requiere otra confirmacion explicita.
- Durante la creacion no se puede cerrar ni enviar otra creacion.
- Tras crear, el editor completo muestra el borrador con CQL y hook correctos.
- Lint, formato, typecheck, tests, builds y validacion SDD tienen evidencia.
- Las pruebas de UI con HTTP controlado se distinguen de la integracion real
  con HAPI y el traductor. No declarar esta ultima sin ejecutarla.

## Evidencia

Registrar comandos, codigos de salida, resultados y capturas en
`docs/evidence/M2/runs/20261005-rule-creation-modal/`.

Se conserva TASK-8.11 como unica tarea `IN_PROGRESS`; esta solicitud acotada se
registra por separado y no cierra la validacion Docker pendiente.

Resultados locales y limites:
[summary.md](../evidence/M2/runs/20261005-rule-creation-modal/summary.md).
