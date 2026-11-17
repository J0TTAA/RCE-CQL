# Guia informativa FHIR dentro del RCE

Fecha: 2026-11-16. Work order: [WO-0009](../../../../work-orders/WO-0009-FHIR-INFORMATION-GUIDE.md).

## Verificaciones

| Comando | Codigo | Resultado |
| --- | ---: | --- |
| `npm run typecheck:web` | 0 | TypeScript del frontend correcto. |
| `npm run build:web` | 0 | Build Vite completo; 1827 modulos transformados. |
| `npm exec prettier -- --check apps/web/src/app/router.tsx apps/web/src/components/layout/AppShell.tsx apps/web/src/features/education/FhirGuidePage.tsx apps/web/src/features/education/fhir-guide.css` | 0 | Archivos frontend con formato correcto. |
| `powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1` | 0 | 105 requisitos, 103 tareas, una tarea en progreso y cero errores. |
| `git diff --check` | 0 | Sin errores de whitespace. Git reporto solo conversion normal de LF/CRLF en dos archivos TSX. |
| `node scripts/fhir-guide-ui-check.mjs` con Chrome y API simulada | 0 | `/guide` carga directamente; contenido, enlaces y navegación desde Pacientes pasan en 1440x900 y 390x844, sin desborde horizontal ni errores de página. |

No se llamo a HAPI ni al traductor: la guia es contenido estatico de orientacion.
Capturas revisadas visualmente: `guide-1440.png` y `guide-390.png`. `TASK-6.18` queda en `DONE`.
