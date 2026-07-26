# Frontend Work Breakdown Structure

## RCE educativo CQL

| Campo       | Valor                                          |
| ----------- | ---------------------------------------------- |
| Estado      | Planificado                                    |
| Version     | 0.2.0                                          |
| Fecha       | 2026-07-26                                     |
| Gate actual | Frontend integrado con Nest/HAPI/CQL en Docker |

## 1. Estados

| Estado      | Significado                                       |
| ----------- | ------------------------------------------------- |
| `PLANNED`   | Aun no iniciado.                                  |
| `PROTOTYPE` | En iteracion dentro de v0, fuera del repositorio. |
| `REVIEW`    | Listo para revision visual o tecnica.             |
| `BLOCKED`   | Espera un gate o contrato.                        |
| `DONE`      | Criterios y evidencia completos.                  |

## 2. Gate FE-P0 - Maqueta v0

| ID          | Entregable                                                | Dependencias | Requisitos                  | Estado  |
| ----------- | --------------------------------------------------------- | ------------ | --------------------------- | ------- |
| FE-TASK-0.1 | Crear proyecto v0 independiente y aplicar prompt maestro. | Ninguna      | FE-REQ-001 a 057            | PLANNED |
| FE-TASK-0.2 | Revisar shell, tokens, densidad y navegacion.             | 0.1          | FE-REQ-001 a 007, 036 a 045 | PLANNED |
| FE-TASK-0.3 | Revisar catalogo y ficha de pacientes.                    | 0.1          | FE-REQ-008 a 016            | PLANNED |
| FE-TASK-0.4 | Revisar catalogo y workspace de reglas.                   | 0.1          | FE-REQ-017 a 029            | PLANNED |
| FE-TASK-0.5 | Revisar cards, sugerencias y actividad CDS.               | 0.1          | FE-REQ-030 a 035            | PLANNED |
| FE-TASK-0.6 | Ejecutar iteracion responsive y accesible en v0.          | 0.2 a 0.5    | FE-REQ-037 a 046            | PLANNED |
| FE-TASK-0.7 | Exportar arbol de archivos y registrar dependencias.      | 0.6          | FE-REQ-047 a 052            | PLANNED |
| FE-TASK-0.8 | Aprobar FE-AC-001 a FE-AC-012 con capturas.               | 0.7          | FE-AC-001 a 012             | PLANNED |
| FE-TASK-0.9 | Revisar modo aula anonimo, sandbox visible y reinicio.    | 0.1          | FE-REQ-053 a 057, FE-AC-013 | PLANNED |

Salida del gate:

- Link privado o capturas de v0 en los cuatro viewports.
- Codigo exportable o branch v0 identificable.
- Lista de dependencias y componentes generados.
- Hallazgos visuales pendientes para la implementacion real.

## 3. Gate FE-P1 - Fundacion real

Estas tareas avanzan como implementacion real de frontend sobre el contrato
`/api/v1/ui/*`. El frontend no contiene fixtures clinicos ni llama directo a
HAPI o al traductor.

| ID          | Entregable                                                  | Dependencias | Requisitos                          | Estado  |
| ----------- | ----------------------------------------------------------- | ------------ | ----------------------------------- | ------- |
| FE-TASK-1.1 | Crear workspace React/Vite/TypeScript y scripts de calidad. | 0.8          | FE-REQ-047, 048                     | PLANNED |
| FE-TASK-1.2 | Fijar primitives, Lucide y Monaco.                          | 1.1          | FE-ADR-003 a 005                    | PLANNED |
| FE-TASK-1.3 | Implementar tokens, globals y primitives revisadas.         | 1.2          | FE-REQ-041 a 045, 051               | PLANNED |
| FE-TASK-1.4 | Implementar router, providers y AppShell.                   | 1.3          | FE-REQ-001 a 007                    | PLANNED |
| FE-TASK-1.5 | Definir `RceUiApi`, tipos y cliente HTTP.                   | 1.1          | FE-REQ-016, 029, 049, 050, 054, 056 | REVIEW  |
| FE-TASK-1.6 | Agregar lint, typecheck, unit tests y build.                | 1.2          | FE-REQ-038 a 046                    | PLANNED |
| FE-TASK-1.7 | Implementar SessionProvider y menu de sandbox anonimo.      | 1.4, 1.5     | FE-REQ-003, 053 a 057               | PLANNED |

## 4. Gate FE-P2 - Features

| ID           | Entregable                                                 | Dependencias  | Requisitos           | Estado |
| ------------ | ---------------------------------------------------------- | ------------- | -------------------- | ------ |
| FE-TASK-2.1  | Implementar PatientsTable y filtros.                       | 1.4, 1.5, 1.7 | FE-REQ-008 a 010     | REVIEW |
| FE-TASK-2.2  | Implementar PatientHeader, tabs y timeline.                | 2.1           | FE-REQ-011, 012      | REVIEW |
| FE-TASK-2.3  | Implementar ClinicalResourceDrawer y estados de escritura. | 2.2           | FE-REQ-013 a 016     | REVIEW |
| FE-TASK-2.4  | Implementar RulesTable y estados visuales.                 | 1.4, 1.5, 1.7 | FE-REQ-017 a 019     | REVIEW |
| FE-TASK-2.5  | Implementar RuleWorkspace, Monaco y dirty state.           | 2.4           | FE-REQ-020 a 025     | REVIEW |
| FE-TASK-2.6  | Implementar DiagnosticsPanel y ElmViewer.                  | 2.5           | FE-REQ-023, 024, 026 | REVIEW |
| FE-TASK-2.7  | Implementar RuleTestPanel.                                 | 2.5, 1.5      | FE-REQ-027, 029      | REVIEW |
| FE-TASK-2.8  | Implementar permisos visuales y dialogs de publicacion.    | 2.4, 2.5      | FE-REQ-005, 028      | REVIEW |
| FE-TASK-2.9  | Implementar CdsCardList y ApplySuggestionDialog.           | 2.2, 1.5      | FE-REQ-030 a 034     | REVIEW |
| FE-TASK-2.10 | Implementar CdsActivityTable y detalle.                    | 1.4, 1.5      | FE-REQ-035           | REVIEW |

## 5. Gate FE-P3 - Integracion Nest

| ID          | Entregable                                              | Dependencias        | Requisitos                      | Estado  |
| ----------- | ------------------------------------------------------- | ------------------- | ------------------------------- | ------- |
| FE-TASK-3.1 | Generar cliente tipado desde OpenAPI estable.           | Backend routes, 1.5 | FE-REQ-050                      | BLOCKED |
| FE-TASK-3.2 | Implementar adapter HTTP de pacientes.                  | 3.1, 2.1 a 2.3      | REQ-F-025 a 031                 | REVIEW  |
| FE-TASK-3.3 | Implementar adapter HTTP de reglas y traduccion.        | 3.1, 2.4 a 2.8      | REQ-F-001 a 024                 | REVIEW  |
| FE-TASK-3.4 | Implementar adapter HTTP de cards/sugerencias.          | 3.1, 2.9, 2.10      | REQ-F-034 a 041                 | REVIEW  |
| FE-TASK-3.5 | Sustituir fixtures por cliente HTTP sin cambiar UI.     | 3.2 a 3.4           | FE-REQ-049, 050                 | REVIEW  |
| FE-TASK-3.6 | Propagar error comun y correlationId a la UI.           | 3.1 a 3.5           | REQ-I-006                       | REVIEW  |
| FE-TASK-3.7 | Integrar endpoints reales de sesion y reset de sandbox. | 3.1, 1.7            | REQ-F-051, REQ-F-054, REQ-I-007 | REVIEW  |

## 6. Gate FE-P4 - Verificacion visual

| ID          | Entregable                                                  | Dependencias | Requisitos        | Estado  |
| ----------- | ----------------------------------------------------------- | ------------ | ----------------- | ------- |
| FE-TASK-4.1 | Capturar rutas en 1440x900 y 1280x800.                      | P2           | FE-REQ-037 a 046  | BLOCKED |
| FE-TASK-4.2 | Capturar rutas en 768x1024 y 390x844.                       | P2           | FE-REQ-037 a 046  | BLOCKED |
| FE-TASK-4.3 | Verificar Monaco no blanco, markers y navegacion.           | 2.5, 2.6     | FE-AC-004, 005    | BLOCKED |
| FE-TASK-4.4 | Verificar teclado, foco, contraste y reduced motion.        | P2           | FE-AC-009, 010    | BLOCKED |
| FE-TASK-4.5 | Verificar ausencia de overflow, solapes y layout shift.     | 4.1, 4.2     | FE-AC-011         | BLOCKED |
| FE-TASK-4.6 | Ejecutar E2E pacientes-reglas-cards contra Nest/HAPI.       | P3           | AC-001 a AC-009   | BLOCKED |
| FE-TASK-4.7 | Verificar dos sesiones anonimas sin mezcla visual de datos. | 3.7, P3      | FE-AC-013, AC-011 | BLOCKED |

## 7. Definition of Done frontend

- No hay llamadas directas a HAPI o traductor.
- No hay logica TypeScript que interprete CQL o condiciones clinicas.
- Los cuatro viewports obligatorios tienen evidencia visual.
- Loading y contenido dinamico no cambian dimensiones de controles.
- Lint, format, typecheck, unit tests y build terminan en codigo 0.
- Flujos principales funcionan con teclado y foco visible.
- Los textos en UI estan en espanol correcto.
- No se incluyen datos reales, secretos ni identificadores institucionales.
- Los componentes no dependen de Next.js y pueden ejecutarse en Vite.
- La UI no muestra login y obtiene el sandbox activo desde `SessionProvider`.
