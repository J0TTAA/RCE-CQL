# WO-0005 - Recuperar build Docker tras SIGSEGV de npm

## Estado

IN_PROGRESS

## Problema

En el host Fedora, las etapas `npm ci` de la imagen `node:24.18.0-alpine`
terminan con codigo 139. La imagen de API no se actualiza y la etapa web se
cancela cuando Compose detiene el build paralelo.

## Objetivo

Producir imagenes nuevas de API y web con un build limpio, sin cambiar versiones
de Node ni el comportamiento del runtime.

## Cambio aprobado

Usar `node:24.18.0-bookworm-slim` en las etapas de build y runtime de ambos
Dockerfiles. No se cambia el lockfile ni se reemplaza npm.

## Aceptacion

- `npm ci` de API y web termina correctamente desde un build sin cache.
- Los builds de API y web concluyen y Compose recrea ambos servicios.
- Validacion SDD pasa.
- La nueva version muestra el flujo de ordenes CDS en la ficha del paciente.

## Evidencia

Registrar comandos, codigos de salida y salida resumida en
`docs/evidence/M5/runs/<timestamp>/summary.md` antes de marcar `DONE`.
