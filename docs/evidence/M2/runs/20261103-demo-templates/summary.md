# Cuatro reglas docentes y opcion En blanco

Fecha: 2026-11-03. Work order: [WO-0008](../../../../work-orders/WO-0008-DEMO-TEMPLATES.md).

## Cambios

- Catalogo NestJS: En blanco; adulto/patient-view; amoxicilina/order-select;
  solicitud HbA1c/order-sign; cuatro hechos/patient-view.
- Las reglas simples de ordenes ya no requieren alergia ni diabetes.
- Se retiraron las opciones antiguas del selector; no se modificaron Library
  persistidas en HAPI.
- Scripts de UI/integracion actualizados a los nuevos identificadores.
- El smoke del traductor ahora ejecuta 14 casos con el engine instalado,
  incluidos datos historicos que no deben confundirse con ordenes pendientes.
- Libreto y guia de hooks actualizados. Las guias previas se identifican como
  material de estudio de ejemplos anteriores.

## Comandos ejecutados

Node usado: runtime local v24.22.1 (el Node del PATH inicial era v21.7.1).
Se antepuso su directorio al PATH de los comandos npm; no se modifico el PATH global.

| Comando | Exit code | Resultado |
| --- | --- | --- |
| `npm run build` | 0 | API compilada. |
| `npm run lint` | 0 | Sin errores; [log](./lint.log). |
| `npm run typecheck` | 0 | API correcta; [log](./typecheck.log). |
| `npm test` | 0 | 39 tests, 12 suites, 0 fallos; [log](./tests.log). |
| `npm run format:check` | 0 | Formato API correcto. |
| `npm run typecheck:web` | 0 | Frontend correcto. |
| `npm run build:web` | 0 | Build Vite completo. |
| `node scripts/rule-creation-ui-check.mjs` | 0 | Edge headless, 1440x1000 y 390x844; [evidencia UI](./ui/rule-creation-ui-check.json). |
| `node --check scripts/cql-templates-smoke.mjs` | 0 | Sintaxis JavaScript correcta. |
| `node --check scripts/order-hooks-smoke.mjs` | 0 | Sintaxis JavaScript correcta. |
| Prettier check de los cuatro scripts editados | 0 | Tras aplicar formato al script UI. |
| `powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1` | 0 | Cero errores. |
| `git diff --check` | 0 | Sin errores de whitespace. |

La prueba UI exige exactamente los cinco identificadores esperados en el selector,
verifica el punto de partida vacio y crea una regla order-sign con su CQL/hook.
Utiliza HTTP controlado: no valida traduccion, persistencia HAPI ni decisiones clinicas.

## Resultados negativos y limites

- El primer intento UI dentro de la restriccion de procesos fallo al lanzar Edge.
  Al ejecutarlo fuera de esa restriccion, Vite tambien tuvo que iniciarse fuera
  para permitir la conexion loopback. La repeticion paso en ambos tamanos.
- `node scripts/cql-templates-smoke.mjs` fallo inicialmente con EACCES de red.
  La repeticion autorizada con `--translator http://127.0.0.1:8081` termino con
  exit code 1, ECONNREFUSED: no hay traductor local escuchando.
- Por tanto los 14 casos de traduccion/ejecucion de plantillas estan preparados,
  pero no se ejecutaron satisfactoriamente. Las 39 pruebas existentes no los sustituyen.
- No se ejecuto `order-hooks-smoke.mjs` contra HAPI real ni se desplego el cambio.
- Se mantiene REVIEW y no se cierra la tarea de despliegue pendiente.
