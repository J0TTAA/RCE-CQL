# Creacion de reglas desde modal - 2026-10-05

## Alcance

WO-0006 / revision parcial de TASK-6.8. Solo RCE-CQL: catalogo, base CQL en blanco,
creacion de borrador y apertura del editor existente. No se modifica Constancias,
el flujo de persistencia de ordenes ni Docker.

## Entorno

- Windows, Node 24.19.0 del runtime local de Codex.
- npm 10.5.0 disponible localmente; el proyecto exige npm >=11. Se ejecutaron
  scripts con dependencias ya instaladas, sin `npm ci` ni cambios del lockfile.
  Esto no verifica una instalacion limpia con npm 11 ni un build Docker.
- Vite local en `http://127.0.0.1:5188`.
- Playwright 1.62.1, Microsoft Edge headless.
- API y dependencias HTTP controladas en el contexto de navegador para tests UI.
  Las pruebas de unidad usan el gateway FHIR de prueba, no un servidor HAPI.

## Comandos Ejecutados

Los comandos npm se invocaron con Node 24.19.0, el CLI npm local y ese Node
antepuesto al PATH. Los siguientes resultados corresponden a ejecuciones reales:

| Comando | Exit code | Resultado |
| --- | --- | --- |
| `npm run lint` | 0 | ESLint API sin warnings. |
| `npm run format:check` | 0 | Prettier API correcto. |
| `prettier --check` sobre RulesPage.tsx, rule-templates.css y rule-creation-ui-check.mjs | 0 | Formato web y script correcto. |
| `npm run typecheck` | 0 | API correcto tras corregir el test. |
| `npm run typecheck:web` | 0 | Web correcto. |
| `npm run test` | 0 | 36 tests, 12 suites; 36 pasan, 0 fallan. |
| `npm run build` | 0 | API compilada; incluye la nueva plantilla. |
| `npm run build:web` | 0 | TypeScript + Vite 7.3.6; build de produccion correcto. |
| `node scripts/rule-creation-ui-check.mjs` | 0 | Dos viewports, flujo del modal y editor. |
| `node scripts/order-hooks-ui-check.mjs` | 0 | Dos viewports, regresion UI de ordenes y plantillas. |
| `powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1` | 0 | Sin errores; solo una tarea IN_PROGRESS. |

Variables usadas en los tests de navegador:

```text
PLAYWRIGHT_MODULE_PATH=C:\Users\kona\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright
PLAYWRIGHT_CHANNEL=msedge
RCE_UI_URL=http://127.0.0.1:5188
RCE_UI_EVIDENCE=docs/evidence/M2/runs/20261005-rule-creation-modal
```

## Casos Verificados

- Catalogo visible detras del modal y filtros conservados al cancelar.
- `En blanco` por defecto al abrir y reabrir; cinco bases entregadas por API,
  incluidas las cuatro plantillas previas.
- Carga y error de lectura con reintento explicito.
- Cancelar, cerrar y Escape sin POST de creacion; foco restaurado al disparador.
- Navegacion de teclado contenida en el modal.
- Doble click genera una sola escritura; cierre bloqueado durante esa peticion.
- Fallo al crear conserva la seleccion, sin reintentos automaticos de escritura.
- Enlace directo `/rules/new` abre el mismo modal sobre el catalogo.
- Creacion en blanco abre el editor completo; escritura manual de CQL deja
  cambios sin guardar. La base contiene `Aplica: false`, sin criterios clinicos.
- Plantilla `diabetes-order` conserva CQL y hook `order-sign` al abrir el editor.
- Sin errores JavaScript de pagina ni rutas HTTP inesperadas en el test final.
- Modal contenido en 1440x1000 y 390x844, sin overflow horizontal. Se inspeccionaron
  visualmente las capturas del modal de escritorio/movil y del editor desktop.
- Unit test: el borrador se guarda como Library, sandbox, inactivo, solo con
  contenido `text/cql`; la creacion no invoca al traductor.

## Artefactos

- `rule-creation-ui-check.json`: resultados del flujo nuevo.
- `modal-blank-*.png`, `modal-error-*.png`, `editor-blank-*.png`: seis capturas.
- `ui-check.json`, `orders-*.png`, `signed-orders-*.png`, `templates-*.png`:
  regresion de interfaz de ordenes y plantillas.
- `failure.png`: captura del intento inicial cuyo selector de test `Hook`
  era demasiado estricto; no corresponde a la ejecucion final aprobada.

## Resultados Negativos y Limites

El primer typecheck de API fallo (exit 1): el test consultaba `rule.elm`, que no
existe en ClinicalRule. Se corrigio para inspeccionar el contenido del Library.
Los primeros intentos UI fallaron (exit 1) por lectura del catalogo sin esperar,
la doble lectura de StrictMode sobre un fallo simulado de una sola respuesta,
y el selector exacto `Hook`, cuyo nombre incluye el texto de las opciones.
Se corrigieron esas condiciones del test; la ejecucion final paso en ambos
viewports y verifico la escritura manual dentro de Monaco real.

No se ejecuta `test:cql-templates` ni integracion contra HAPI real: no hay Docker
CLI en este entorno y la consulta a `127.0.0.1:8081/cql/translator` dio conexion
rechazada. Los tests UI no demuestran persistencia real ni generacion de cards.
Mantener el trabajo en REVIEW hasta verificar el entorno integrado.
