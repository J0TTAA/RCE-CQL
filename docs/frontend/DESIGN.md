# Frontend Design Description

## RCE educativo CQL

| Campo                   | Valor                        |
| ----------------------- | ---------------------------- |
| Estado                  | Propuesto para maqueta       |
| Version                 | 0.2.0                        |
| Fecha                   | 2026-07-26                   |
| Implementacion objetivo | React + Vite + TypeScript    |
| Prototipado             | v0 con componentes portables |

## 1. Objetivo de diseno

La interfaz debe sentirse como un RCE docente pequeno y creible: silencioso,
compacto y orientado al trabajo. El foco no es presentar el producto sino
permitir que un alumno alterne rapidamente entre paciente, regla CQL, resultado
ELM y recomendacion CDS. En modo aula, la primera visita entra directo al RCE sin
login visible y muestra un sandbox anonimo por navegador.

## 2. Decisiones frontend

| ID         | Decision                                              | Razon                                                                                              | Consecuencia                                                                 |
| ---------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| FE-ADR-001 | Generar la maqueta fuera de `apps/web`                | El gate M0 no permite abrir aun la implementacion funcional.                                       | v0 entrega una referencia revisable, no codigo integrado automaticamente.    |
| FE-ADR-002 | Componentes React cliente y portables a Vite          | v0 puede previsualizar con otro wrapper, pero el destino del repositorio es Vite.                  | No usar `next/*`, Server Components, Server Actions ni API routes.           |
| FE-ADR-003 | Tailwind, CSS variables y primitives estilo shadcn/ui | v0 los representa bien y permiten extraer componentes sin fijar una pagina monolitica.             | Las versiones exactas se fijan al crear `apps/web`.                          |
| FE-ADR-004 | Lucide para iconografia                               | Mantiene controles reconocibles y evita SVG manual.                                                | Todo icon button no obvio requiere tooltip y nombre accesible.               |
| FE-ADR-005 | Monaco mediante `@monaco-editor/react`                | El editor CQL es la experiencia central.                                                           | La UI solo muestra diagnosticos devueltos; no parsea CQL.                    |
| FE-ADR-006 | Arquitectura por features                             | Pacientes, reglas y CDS evolucionan a ritmos distintos.                                            | Componentes compartidos no importan modulos internos de features.            |
| FE-ADR-007 | Mock API asincrona y determinista                     | Permite demostrar estados sin falsificar integracion real.                                         | Los resultados dependen de fixtures, nunca de logica clinica en componentes. |
| FE-ADR-008 | Desktop denso con adaptacion mobile                   | La clase se demostrara principalmente en notebook, pero debe poder revisarse en tablet y telefono. | Paneles multiples se convierten en tabs/drawers en viewport estrecho.        |
| FE-ADR-009 | Tema claro unico en MVP                               | Reduce superficie visual y facilita revisar contrastes.                                            | Dark mode queda fuera de la primera maqueta.                                 |
| FE-ADR-010 | Sesion anonima visible, no gestion de usuarios        | Todos entran por una URL y el backend separa el trabajo por sandbox.                               | Topbar/menu muestran sandbox corto y reinicio; no hay pantalla de login.     |

## 3. Arquitectura de informacion

```text
RCE CQL
|-- Sesion anonima
|   `-- Mi sandbox
|-- Pacientes
|   |-- Listado
|   `-- Ficha clinica
|-- Reglas CQL
|   |-- Catalogo
|   |-- Nueva regla
|   |-- Editor
|   `-- Prueba con paciente
`-- Actividad CDS
    `-- Evaluaciones y cards emitidas
```

Rutas objetivo:

| Ruta              | Pantalla              | Layout principal              |
| ----------------- | --------------------- | ----------------------------- |
| `/patients`       | Catalogo de pacientes | Tabla + filtros               |
| `/patients/:id`   | Ficha clinica         | Cabecera + tabs + rail CDS    |
| `/rules`          | Catalogo de reglas    | Tabla + filtros               |
| `/rules/new`      | Nueva regla           | Metadata + editor             |
| `/rules/:id`      | Workspace de regla    | Monaco + inspector            |
| `/rules/:id/test` | Prueba                | Selector paciente + resultado |
| `/activity`       | Actividad CDS         | Tabla cronologica + detalle   |

La ruta inicial de la maqueta sera `/rules/rule-adult-risk` para que Monaco y el
flujo central sean visibles en el primer viewport.

## 4. Shell de aplicacion

### 4.1 Desktop

```text
+----------------------+--------------------------------------------------+
| RCE CQL              | Breadcrumb             Entorno  Rol  Sandbox/Menu |
|----------------------|--------------------------------------------------|
| Pacientes            |                                                  |
| Reglas CQL           |                Contenido de ruta                 |
| Actividad CDS        |                                                  |
|                      |                                                  |
|----------------------|--------------------------------------------------|
| API / HAPI / CQL     |                                                  |
+----------------------+--------------------------------------------------+
```

- Sidebar fija: `232px`, colapsable a `64px`.
- Topbar: `56px`, sin segunda barra decorativa.
- Contenido: ancho completo con padding `20-24px`.
- Footer global: no existe; el estado de dependencias vive al pie del sidebar.
- El contenido puede usar panels con borders, pero una seccion de pagina no se
  presenta como una gran card flotante.

### 4.2 Mobile

- Sidebar dentro de un drawer abierto desde menu iconico.
- Topbar conserva titulo corto, entorno y menu; rol y sandbox pasan al menu de
  sesion.
- Toolbars permiten wrap en dos lineas estables.
- Tablas usan columnas prioritarias y un menu de acciones; no fuerzan scroll de
  toda la pagina.
- Workspace CQL cambia de columnas a tabs `Codigo`, `Metadata`, `Diagnosticos`,
  `Prueba` y `ELM`.

## 5. Pantallas

### 5.1 Catalogo de pacientes

Toolbar:

- Search con icono, label accesible y placeholder de nombre o identificador.
- Select de cohorte: Todos, Ninos, Adolescentes, Adultos, Adultos mayores.
- Select de estado: Todos, Con alertas, Sin alertas.
- Contador de resultados alineado a la derecha.

Tabla:

| Columna             | Comportamiento                                   |
| ------------------- | ------------------------------------------------ |
| Paciente            | Nombre sintetico + `SYN-xxxx`                    |
| Edad                | Numero + cohorte secundaria                      |
| Sexo                | Texto FHIR administrativo                        |
| Condiciones activas | Conteo y hasta dos nombres truncados con tooltip |
| Ultimo encuentro    | Fecha y tipo                                     |
| CDS                 | Conteo con severidad maxima e icono              |
| Acciones            | Menu iconico                                     |

No usar una card por paciente. La fila completa abre la ficha y conserva un
target de foco visible.

### 5.2 Ficha clinica

Cabecera no flotante:

- Nombre sintetico, identificador, edad, fecha de nacimiento y sexo.
- Badge `Datos sinteticos`.
- Badge compacto `Mi sandbox` cuando existan cambios privados del navegador.
- Acciones: editar dato y reevaluar.
- Tabs debajo de la identidad clinica.

Contenido desktop:

```text
+---------------------------------------+--------------------------+
| Resumen / recursos clinicos           | Recomendaciones CDS      |
|                                       |                          |
| timeline, observaciones, condiciones  | cards ordenadas          |
+---------------------------------------+--------------------------+
```

- Grid `minmax(0, 1fr) minmax(300px, 360px)`.
- El rail derecho queda sticky debajo del topbar.
- En mobile, CDS pasa a tab y muestra contador en su label.

Drawer de edicion:

- Ancho desktop `440px`; full screen en mobile.
- Selector de tipo editable y formulario especifico.
- Footer fijo con Cancelar y Guardar cambios.
- Secuencia visible: `editando -> validando -> guardando -> reevaluando -> listo`.
- El dialog de sugerencia enumera accion, tipo FHIR y paciente antes de confirmar.

### 5.3 Catalogo de reglas

Tabla con filtros persistentes en la URL mock:

| Columna    | Contenido                                     |
| ---------- | --------------------------------------------- |
| Regla      | Titulo + nombre CQL                           |
| Version    | Semver                                        |
| Estado     | Lifecycle con icono y texto                   |
| Hook       | `patient-view`, `order-select` u `order-sign` |
| Activacion | Switch solo para Docente y published          |
| Modificada | Fecha y autor sintetico                       |
| Alcance    | Mi sandbox o compartida                       |
| Acciones   | Abrir, duplicar version, retirar              |

El boton `Nueva regla` es el unico CTA primario de la pagina.

### 5.4 Workspace de regla

Desktop:

```text
+--------------------------------------------------------------------------+
| Breadcrumb / titulo / version / lifecycle       Guardar Validar Probar...|
+----------------------------------------------+---------------------------+
| Monaco CQL                                   | Metadata / Test           |
|                                              |                           |
|                                              |                           |
+----------------------------------------------+---------------------------+
| Diagnostics (colapsable) / estado / linea-columna                       |
+--------------------------------------------------------------------------+
```

- Header compacto de `48-56px` y toolbar estable.
- Grid principal `minmax(520px, 1fr) minmax(320px, 380px)`.
- Panel derecho usa tabs `Metadata`, `Prueba`, `ELM`.
- Diagnosticos usan panel inferior redimensionable entre `120px` y `300px`.
- Monaco mantiene al menos `420px` de alto.
- Estado dirty aparece junto al titulo y en el boton Guardar, sin modal intrusivo.
- `Ver ELM` esta deshabilitado cuando la fuente cambio despues de validar.
- `Publicar` requiere rol Docente, estado validated y confirmacion.

Diagnosticos:

- Icono y label Error/Warning/Info.
- Mensaje en una linea expandible.
- Posicion `Ln 12, Col 8` en columna estable.
- Activar una fila llama a `editor.revealPositionInCenter` y enfoca Monaco.

### 5.5 Prueba de regla

- Combobox de paciente con busqueda y cohortes.
- Resumen del fixture seleccionado.
- Boton `Ejecutar prueba` con estado loading que no redimensiona el panel.
- Resultado `Aplica` o `No aplica` con icono y texto.
- Tabs de resultado: Cards, Recursos considerados, Advertencias.
- CorrelationId visible como metadata copiable, no como headline.

### 5.6 Actividad CDS

- Tabla cronologica, no feed de cards.
- Columnas: fecha, paciente, hook, reglas evaluadas, cards, duracion, estado y
  correlationId.
- Drawer de detalle con cards emitidas y advertencias.
- Filtros por hook, severidad y resultado.

## 6. Sistema visual

### 6.1 Paleta

Tokens light propuestos:

```css
:root {
  --canvas: #f6f8f9;
  --surface: #ffffff;
  --surface-subtle: #eef3f4;
  --text: #172126;
  --text-muted: #5d6b72;
  --border: #d7e0e3;
  --border-strong: #b9c7cc;
  --interactive: #0b6e69;
  --interactive-hover: #085955;
  --focus: #0284c7;
  --info: #2563eb;
  --info-bg: #eff6ff;
  --success: #15803d;
  --success-bg: #f0fdf4;
  --warning: #a8540b;
  --warning-bg: #fff8e8;
  --critical: #b42318;
  --critical-bg: #fff1f0;
}
```

Reglas:

- `interactive` se reserva para seleccion y acciones primarias.
- Estados clinicos usan info, warning y critical con icono y label.
- Success se usa para guardado/validacion, no como color dominante.
- No usar gradientes, purple, fondos dark slate ni beige como tema.

### 6.2 Tipografia

- UI: `Inter, ui-sans-serif, system-ui, sans-serif`.
- Codigo: `JetBrains Mono, ui-monospace, SFMono-Regular, monospace`.
- Escala: `12`, `13`, `14`, `16`, `20`, `24px`.
- Body operativo: `14px/20px`.
- Titulos de pagina: maximo `24px/32px`.
- Labels y metadata: `12-13px`, nunca menos de `12px`.
- `letter-spacing: 0` en toda la aplicacion.
- No usar `vw` para font-size.

### 6.3 Espaciado y geometria

- Escala base: `4px`.
- Altura control compact: `32px`; normal: `36px`.
- Icon button: `32x32px` o `36x36px` estable.
- Radius: controles `4-6px`, panels/cards/dialogs `6-8px`, status badge puede
  usar pill.
- Borders de `1px`; shadows solo en dialog, popover y drawer.
- Focus ring de `2px` con offset visible.

### 6.4 Jerarquia de acciones

- Primaria: una por region; background `interactive`.
- Secundaria: outline neutral.
- Terceria: ghost con icono.
- Destructiva: rojo solo en confirmacion y accion final.
- Undo/redo, cerrar, copiar y menus usan iconos familiares.

## 7. Componentes

### 7.1 Estructura objetivo

```text
src/
|-- app/
|   |-- App.tsx
|   |-- router.tsx
|   |-- providers.tsx
|   `-- session-provider.tsx
|-- components/
|   |-- ui/
|   `-- layout/
|-- features/
|   |-- patients/
|   |   |-- api/
|   |   |-- components/
|   |   |-- pages/
|   |   `-- types.ts
|   |-- rules/
|   |   |-- api/
|   |   |-- components/
|   |   |-- pages/
|   |   `-- types.ts
|   `-- cds/
|       |-- api/
|       |-- components/
|       |-- pages/
|       `-- types.ts
|-- mocks/
|   |-- fixtures/
|   `-- mock-rce-api.ts
|-- lib/
|   |-- rce-api.ts
|   `-- formatters.ts
`-- styles/
    |-- tokens.css
    `-- globals.css
```

### 7.2 Componentes de layout

| Componente            | Responsabilidad                                      |
| --------------------- | ---------------------------------------------------- |
| `AppShell`            | Sidebar, topbar, route outlet y responsive shell.    |
| `AppSidebar`          | Navegacion y salud de servicios.                     |
| `AppTopbar`           | Breadcrumb, entorno, rol y sandbox anonimo.          |
| `SessionMenu`         | Sandbox corto, expiracion, rol y reinicio.           |
| `PageHeader`          | Titulo, metadata y acciones de una ruta.             |
| `ResponsiveDataTable` | Tabla desktop y columnas prioritarias mobile.        |
| `AsyncStateBoundary`  | Loading, error, empty y retry sin cambiar geometria. |

### 7.3 Componentes de reglas

| Componente          | Responsabilidad                             |
| ------------------- | ------------------------------------------- |
| `RulesTable`        | Catalogo, filtros y acciones.               |
| `RuleStatusBadge`   | Lifecycle accesible con icono/texto.        |
| `RuleWorkspace`     | Composicion de toolbar, editor e inspector. |
| `CqlEditor`         | Wrapper de Monaco y markers externos.       |
| `RuleMetadataForm`  | Metadata fuera del codigo.                  |
| `DiagnosticsPanel`  | Lista y navegacion a markers.               |
| `ElmViewer`         | Monaco JSON read-only.                      |
| `RuleTestPanel`     | Paciente, ejecucion mock y resultado.       |
| `PublishRuleDialog` | Confirmacion de version y canonical.        |

### 7.4 Componentes de pacientes/CDS

| Componente               | Responsabilidad                          |
| ------------------------ | ---------------------------------------- |
| `PatientsTable`          | Busqueda y seleccion.                    |
| `PatientHeader`          | Identidad sintetica y contexto clinico.  |
| `PatientChartTabs`       | Recursos agregados.                      |
| `ClinicalTimeline`       | Eventos ordenados.                       |
| `ClinicalResourceDrawer` | Formularios editables permitidos.        |
| `CdsCardList`            | Ordena y presenta cards.                 |
| `CdsCardItem`            | Card individual con severidad accesible. |
| `ApplySuggestionDialog`  | Confirmacion explicita de acciones FHIR. |
| `CdsActivityTable`       | Historial de evaluaciones.               |

No crear `DashboardCard`, `StatCard` o wrappers genericos que conviertan toda
seccion en una card.

## 8. Contratos de UI mock

```typescript
type UserRole = 'student' | 'teacher';
type RuleLifecycle = 'draft' | 'validated' | 'published' | 'retired';
type CdsIndicator = 'info' | 'warning' | 'critical';
type DependencyState = 'up' | 'degraded' | 'down';

interface UiSessionContext {
  anonymousSessionId: string;
  classroomId: string;
  sandboxId: string;
  sandboxLabel: string;
  role: UserRole;
  expiresAt: string;
}

interface UiDiagnostic {
  id: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  startLine: number;
  startColumn: number;
  endLine?: number;
  endColumn?: number;
}

interface UiCdsCard {
  id: string;
  summary: string;
  detail: string;
  indicator: CdsIndicator;
  source: { label: string; url?: string };
  rule: { id: string; title: string; version: string };
  suggestions?: UiSuggestion[];
}

interface RuleTestResult {
  applies: boolean;
  cards: UiCdsCard[];
  warnings: string[];
  evaluatedResources: Array<{ type: string; id: string }>;
  correlationId: string;
}
```

Puerto mock:

```typescript
interface RceUiApi {
  getSession(): Promise<UiSessionContext>;
  resetSandbox(): Promise<UiSessionContext>;
  listPatients(query: PatientQuery): Promise<PatientListResult>;
  getPatientChart(id: string): Promise<PatientChartView>;
  updateClinicalResource(input: UpdateResourceInput): Promise<UpdateResult>;
  listRules(query: RuleQuery): Promise<RuleListResult>;
  getRule(id: string): Promise<RuleDetail>;
  saveRuleDraft(input: SaveRuleDraftInput): Promise<RuleDetail>;
  validateRule(id: string): Promise<RuleValidationResult>;
  testRule(input: TestRuleInput): Promise<RuleTestResult>;
  publishRule(input: PublishRuleInput): Promise<RuleDetail>;
}
```

El mock retorna Promises con latencia corta determinista. No inspecciona el CQL
ni calcula condiciones clinicas. Los fixtures validos/invalidos y los resultados
por paciente estan predefinidos. Todas las operaciones reciben el sandbox desde
`SessionProvider`; ningun componente visual puede inventar o enviar un sandbox
arbitrario como fuente de autoridad.

## 9. Estado e interacciones

### 9.1 Regla

```text
clean -> dirty -> saving -> clean
dirty -> validating -> validated | invalid
validated + source change -> dirty + stale ELM
validated + teacher -> publishing -> published
```

- No mostrar validacion exitosa mientras la fuente este dirty.
- Deshabilitar acciones incompatibles durante requests.
- No reintentar publicaciones automaticamente.
- Confirmar salida de una regla dirty.

### 9.2 Cambio clinico

```text
editing -> validating -> saving -> reevaluating -> updated
                                 `-> error (datos editados conservados)
```

La respuesta mock contiene el nuevo recurso y un diff de cards. La UI solo
representa esa respuesta.

### 9.3 Dependencias

- API down: bloqueo global con retry.
- HAPI down: pacientes y evaluacion deshabilitados; editor local sigue visible.
- Translator down: Guardar disponible; Validar y Ver ELM deshabilitados.
- Degraded debe usar texto e icono, no solo un punto de color.

### 9.4 Sesion anonima

```text
sin cookie -> creando sesion -> sandbox listo
sandbox listo -> reiniciando -> sandbox nuevo
```

- No existe pantalla de login ni formulario de registro.
- El sandbox se muestra como etiqueta corta, por ejemplo `S-A4F9`.
- Reiniciar sandbox pide confirmacion y conserva foco al cerrar el dialog.
- Al reiniciar, la UI vuelve a datos base y actividad vacia.
- La maqueta no muestra una lista de alumnos ni administracion de cuentas.

## 10. Accesibilidad

- Landmarks `nav`, `header`, `main` y dialogs con nombres.
- Skip link hacia contenido principal.
- Orden DOM coincide con el orden visual.
- Foco se restaura al trigger al cerrar drawer/dialog.
- Tabs implementan patron ARIA y flechas.
- Errores se anuncian con region live sin mover foco automaticamente.
- Tablas conservan headers y nombres accesibles en acciones.
- Monaco recibe label `Editor de codigo CQL`.
- Contraste minimo WCAG AA para texto y controles.
- Motion respeta `prefers-reduced-motion` y se limita a transiciones funcionales.

## 11. Responsive y QA visual

Viewports obligatorios:

| Nombre         | Tamano   |
| -------------- | -------- |
| Desktop amplio | 1440x900 |
| Notebook       | 1280x800 |
| Tablet         | 768x1024 |
| Mobile         | 390x844  |

En cada viewport verificar:

- Sin overflow horizontal de pagina.
- Sin texto solapado o truncado sin alternativa.
- Toolbars y actions estables en loading.
- Monaco visible, no blanco y con alto util.
- Drawers/dialogs dentro del viewport.
- Navegacion y dialogs operables con teclado.
- Severidades y lifecycle legibles en escala de grises.

## 12. Estrategia de handoff desde v0

1. Aprobar primero composicion y flujos en un proyecto v0 independiente.
2. Exportar archivos, no copiar una pagina monolitica directamente a `main`.
3. Inventariar dependencias y eliminar cualquier API de Next.js.
4. Migrar primero tokens y primitives; despues shell; finalmente features.
5. Sustituir `MockRceUiApi` por cliente OpenAPI sin cambiar componentes.
6. Verificar cada pantalla con capturas Playwright desktop/mobile.
7. Mantener `SessionProvider` como fuente unica de sandbox al pasar de mock a API.

La integracion solo comienza cuando el gate principal permita crear `apps/web`.
