# Especificacion frontend

## Estado

Este paquete define la SPA frontend del RCE y el contrato visual usado por
`apps/web`. La implementacion actual consume NestJS por `/api/v1/ui/*`; no usa
fixtures clinicos hardcodeados ni llama directo a HAPI o al traductor.

La interfaz representa el modo aula anonimo elegido para el proyecto: todos
entran por la misma URL, no existe login visible y cada navegador trabaja en su
propio sandbox.

## Documentos

1. [REQUIREMENTS.md](./REQUIREMENTS.md): comportamiento y criterios visuales.
2. [DESIGN.md](./DESIGN.md): arquitectura de componentes, pantallas y estilos.
3. [TASKS.md](./TASKS.md): orden para revisar e integrar el frontend.
4. [V0_PROMPT.md](./V0_PROMPT.md): referencia historica del prototipo v0.

## Jerarquia

Este paquete deriva de los documentos principales:

- [Requisitos del sistema](../REQUIREMENTS.md).
- [Diseno del sistema](../DESIGN.md).
- [WBS del sistema](../TASKS.md).

Ante una contradiccion, prevalecen los documentos principales. El prototipo de
v0 es una referencia visual historica; el contrato activo esta en `RceUiApi` y
en los endpoints NestJS.

## Uso recomendado

1. Levantar Docker con HAPI, traductor, API y web.
2. Poblar HAPI con Synthea.
3. Revisar pacientes, reglas, ELM, cards y actividad con los criterios `FE-AC-*`.
4. Mantener componentes desacoplados del cliente HTTP para poder generar OpenAPI
   mas adelante.
