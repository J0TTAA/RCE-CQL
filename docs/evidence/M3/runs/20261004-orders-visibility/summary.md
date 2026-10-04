# M3: revision de visibilidad de ordenes

Fecha de revision: 2026-10-04. Alcance: TASK-5.8, WO-0003.
No se modificaron otros proyectos ni se ejecutaron peticiones contra sistemas
clinicos externos. Todos los datos de prueba son sinteticos.

## Cambios revisados

- La API devuelve `sandboxOrders` con recetas `MedicationRequest` y examenes o
  procedimientos `ServiceRequest` firmados y confirmados del sandbox actual.
- El resumen de visualizacion queda fuera del Bundle usado por el engine CQL.
- La ficha se actualiza al confirmar la firma. Las ordenes pendientes no se
  incluyen en el historial antes de la confirmacion explicita.
- Las solicitudes del sandbox no se duplican en el historial base; no se
  muestra una tabla de historial vacia despues de filtrarlas.
- El test de API verifica codigos, estado, intencion, fecha, lectura repetida,
  aislamiento por sandbox y que el Bundle base no se modifique.
- El script visual se actualizo para usar los nombres vigentes de los botones.

## Comandos ejecutados

Node usado: `24.19.0`, dentro del rango declarado del proyecto. Los comandos
npm se ejecutaron con este Node en PATH y el CLI local npm 10.5.0 sobre las
dependencias existentes. El proyecto declara npm >=11: esta verificacion no
incluye una instalacion limpia con esa version, ni sustituye CI/Docker. No se
reinstalaron dependencias ni se cambio el lockfile.

| Comando | Exit code | Resultado observado |
| --- | --- | --- |
| `powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1` | 0 | 103 requisitos, 101 tareas, una tarea IN_PROGRESS, cero errores. |
| `npm run lint` | 0 | ESLint API sin errores ni warnings. |
| `npm run format:check` | 0 | Todos los archivos API respetan Prettier. |
| `npm run typecheck` | 0 | Tipos de API y tests validos. |
| `npm run typecheck:web` | 0 | Tipos del frontend validos. |
| `npm test` | 0 | 35 tests, 11 suites; cero fallidos y cero omitidos. Se repitio tras ampliar las aserciones. |
| `npm run build` | 0 | API compilada con tsc. |
| `npm run build:web` | 0 | Typecheck y build Vite 7.3.6; 1824 modulos transformados. |
| `node node_modules/prettier/bin/prettier.cjs --check apps/api/src/modules/ui/application/ui.service.ts apps/api/src/modules/ui/application/ui.service.spec.ts apps/web/src/features/patients/PatientChartPage.tsx apps/web/src/types.ts scripts/order-hooks-ui-check.mjs` | 0 | Formato de todos los archivos de codigo afectados valido. |
| `node scripts/order-hooks-ui-check.mjs` | 0 | Dos flujos completos de UI, en 1440x1000 y 390x844, mediante Playwright 1.62.1 y Edge headless. |
| `git diff --check` | 0 | Sin errores de whitespace. Git advierte conversion LF/CRLF en el archivo TSX; no es un error de compilacion. |

Para repetir el test visual: iniciar Vite y definir `RCE_UI_URL` con su URL.
En esta ejecucion fue `http://127.0.0.1:5188`, usando
`PLAYWRIGHT_CHANNEL=msedge`, `PLAYWRIGHT_MODULE_PATH` con la instalacion de
Playwright del entorno y `RCE_UI_EVIDENCE` con este directorio.
El frontend no tiene un script de lint separado; se comprobaron TypeScript,
Prettier, build y el flujo de navegador.

## Alcance de la prueba visual

El navegador verifico seleccion `order-select`, UUID de respaldo, datos
obligatorios de receta, revision `order-sign`, invalidacion de la revision al
editar, recuperacion de un error HTTP 503, confirmacion explicita y refresco de
la ficha. Despues de confirmar una receta y un examen, cada uno aparece una
sola vez, el historial vacio no se renderiza y reabrir la ficha conserva ambos
sin volver a enviar la confirmacion. Tambien se verificaron las plantillas,
ausencia de errores JS y que los controles no salieran del viewport.

Las respuestas HTTP estan controladas por el script de prueba. Esta prueba
valida la UI y su contrato, no la traduccion CQL ni la persistencia real en HAPI.
Los tests de API usan el engine instalado para el contrato ELM, con un gateway
FHIR de prueba; tampoco cierran la integracion M0.

Artefactos:

- `ui-check.json`: resultados de ambos viewports.
- `orders-1440.png` y `orders-390.png`: revision previa a confirmar.
- `signed-orders-1440.png` y `signed-orders-390.png`: ordenes guardadas al
  reabrir la ficha; ambas capturas se inspeccionaron visualmente.
- `templates-1440.png` y `templates-390.png`: plantilla de ordenes en el editor.

## Resultados negativos y pendientes

- Comprobacion de Docker CLI: exit code 1, no disponible en este entorno.
  No se ejecutaron builds de contenedores ni Compose en esta revision.
- `GET http://127.0.0.1:8080/fhir/metadata`: HTTP 404; el puerto abierto no
  proporciona el endpoint HAPI esperado.
- `GET http://127.0.0.1:8081/`: conexion rechazada; traductor local ausente.
- `GET http://127.0.0.1:3000/api/v1/health/ready`: conexion rechazada; API RCE
  local ausente. El servidor Vite de la prueba no sustituye a NestJS.

WO-0003 y TASK-5.8 permanecen en `REVIEW`. Falta ejecutar el smoke con HAPI y
traductor reales, confirmar desde el Compose actualizado de Fedora y comprobar
la separacion entre dos navegadores reales. La validacion local de esta
correccion no declara todos los hooks ni el despliegue completamente validados.
