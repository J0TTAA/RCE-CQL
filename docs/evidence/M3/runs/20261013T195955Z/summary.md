# Lectura inmediata de reglas y ordenes firmadas

Fecha: 2026-10-13 UTC. Entorno: Windows, sin Docker ni HAPI local disponible.

## Resultado

- La busqueda de Library, actividad y ordenes firmadas solicita `Cache-Control: no-cache` al adapter HAPI. Las demas busquedas conservan su comportamiento anterior.
- El panel de ordenes distingue `0 reglas evaluadas` de una regla evaluada sin card.
- `tsc -p apps/api/tsconfig.json --noEmit` y `tsc -p apps/web/tsconfig.json --noEmit`: exit code 0 en ambos.
- `tsc -p apps/api/tsconfig.json` y luego `node --test` con los archivos `apps/api/dist/**/*.spec.js`: exit code 0; 37 tests, 37 passed, 0 failed. Incluye adapter, evaluacion de hooks y materializacion de ordenes firmadas con gateway simulado.
- `eslint` sobre el paquete API desde `apps/api`: exit code 0.
- `prettier --check` sobre los archivos de codigo afectados: exit code 0.
- `npm run build --workspace @rce-cql/web`: exit code 0; 1824 modulos transformados. Se ejecuto fuera del sandbox tras un `EPERM` de `fs.realpath` dentro de este.
- `powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1`: exit code 0; 0 errores, 1 tarea `IN_PROGRESS`.
- `git diff --check`: exit code 0.

## Pendiente

No se ejecuto `scripts/order-hooks-smoke.mjs` contra HAPI real en este equipo porque Docker no esta instalado aqui. El script ya comprueba lectura inmediata de la orden firmada y aislamiento por sandbox. Ejecutarlo en Fedora despues de actualizar imagenes y guardar su salida antes de declarar cerrado el flujo.
