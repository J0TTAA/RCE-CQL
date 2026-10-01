# WO-0005 - Recuperar build Docker tras SIGSEGV de npm

## Estado

IN_PROGRESS

## Problema

En el host Fedora, varias instalaciones `npm ci` simultaneas con Node 24.18.0
terminan con `SIGSEGV` (139). Hay un reporte upstream de Node/V8 Maglev que
reproduce este fallo con CPU contention en Linux, incluso en glibc; por lo tanto
no depende de `--omit=dev` ni de Alpine. BuildKit lanza en paralelo las etapas
de dependencias de API, dependencias de produccion y web.

## Objetivo

Producir imagenes nuevas de API y web con un build limpio, sin cambiar versiones
de Node ni el comportamiento del runtime.

## Cambio aprobado

Fijar Node `24.21.0` y pasar `NODE_OPTIONS=--jitless` solo en las etapas de
build que ejecutan npm. La opcion evita Maglev durante instalaciones y
compilacion; no se copia a las etapas runtime. Mantener Alpine, no cambiar el
lockfile y no reemplazar npm.

## Aceptacion

- `npm ci` de API y web termina correctamente desde un build sin cache.
- Los builds de API y web concluyen y Compose recrea ambos servicios.
- Validacion SDD pasa.
- La nueva version muestra el flujo de ordenes CDS en la ficha del paciente.

Referencia primaria del fallo: https://github.com/nodejs/node/issues/64841

## Evidencia

Registrar comandos, codigos de salida y salida resumida en
`docs/evidence/M5/runs/<timestamp>/summary.md` antes de marcar `DONE`.
