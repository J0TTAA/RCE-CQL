# Frontend Requirements Specification

## RCE educativo CQL

| Campo     | Valor                                    |
| --------- | ---------------------------------------- |
| Estado    | Propuesto para maqueta                   |
| Version   | 0.2.0                                    |
| Fecha     | 2026-07-26                               |
| Deriva de | `docs/REQUIREMENTS.md`                   |
| Audiencia | Alumno, docente y desarrollador frontend |

## 1. Objetivo

Definir una interfaz educativa de alta fidelidad que permita explorar pacientes
sinteticos, editar y probar reglas CQL y observar recomendaciones CDS sin salir
del RCE. La maqueta debe servir como referencia visual y como fuente de
componentes para la futura SPA React/Vite. La experiencia de clase debe abrirse
desde una sola URL sin login visible y mostrar un sandbox anonimo por navegador.

## 2. Alcance

Incluye:

- Shell de aplicacion, navegacion y estados de entorno.
- Catalogo y ficha de pacientes sinteticos.
- Catalogo, editor, validacion y prueba visual de reglas CQL.
- Visualizacion de ELM y diagnosticos.
- Cards CDS y confirmacion de sugerencias.
- Sesion anonima de aula y sandbox visible para soporte docente.
- Mocks interactivos aislados del render.
- Estados responsive, accesibles, vacios, cargando y de error.

No incluye:

- Backend, base de datos, autenticacion real, pantallas de login ni despliegue.
- Parser, traductor o evaluador CQL implementado en frontend.
- Acceso directo desde el navegador a HAPI o CQL Translation Service.
- Datos de pacientes reales.
- Evidencia de que `$apply`, CDS Hooks o una escritura FHIR funcionan.

## 3. Principios de experiencia

- La primera pantalla es la aplicacion utilizable, nunca una landing page.
- La primera visita no pide cuenta: el sistema entra directo a un sandbox.
- La interfaz prioriza lectura, comparacion y acciones repetidas.
- El alumno siempre puede distinguir fuente CQL, ELM, metadata y resultado.
- Las acciones con efecto clinico muestran alcance y requieren confirmacion.
- Los datos de demostracion se identifican como sinteticos en todo momento.
- La densidad es de herramienta operacional: sin heroes, gradientes decorativos
  ni secciones presentadas como tarjetas flotantes.

## 4. Requisitos funcionales frontend

### 4.1 Aplicacion y navegacion

| ID         | Requisito                                                               | Prioridad | Verificacion  |
| ---------- | ----------------------------------------------------------------------- | --------- | ------------- |
| FE-REQ-001 | La maqueta DEBE abrir directamente dentro del shell del RCE.            | MUST      | Inspeccion    |
| FE-REQ-002 | La navegacion DEBE incluir Pacientes, Reglas y Actividad CDS.           | MUST      | Demostracion  |
| FE-REQ-003 | El encabezado DEBE mostrar entorno, conectividad, rol activo y sandbox. | MUST      | Demostracion  |
| FE-REQ-004 | La interfaz DEBE indicar claramente que los datos son sinteticos.       | MUST      | Inspeccion    |
| FE-REQ-005 | El usuario DEBE poder cambiar entre un rol Alumno y Docente simulado.   | MUST      | Demostracion  |
| FE-REQ-006 | La navegacion activa DEBE reconocerse por icono, texto y estado visual. | MUST      | Accesibilidad |
| FE-REQ-007 | Las rutas principales DEBEN poder abrirse mediante enlaces directos.    | SHOULD    | Demostracion  |

### 4.2 Pacientes

| ID         | Requisito                                                                                                                  | Prioridad | Verificacion |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- | --------- | ------------ |
| FE-REQ-008 | Pacientes DEBE usar una tabla escaneable, no una cuadricula de cards.                                                      | MUST      | Inspeccion   |
| FE-REQ-009 | La tabla DEBE permitir buscar y filtrar por cohorte.                                                                       | MUST      | Demostracion |
| FE-REQ-010 | Cada fila DEBE mostrar nombre sintetico, identificador, edad, sexo administrativo, condiciones activas y ultimo encuentro. | MUST      | Inspeccion   |
| FE-REQ-011 | La ficha DEBE mostrar cabecera clinica y tabs Resumen, Condiciones, Observaciones, Medicamentos y Encuentros.              | MUST      | Demostracion |
| FE-REQ-012 | La ficha DEBE incluir una linea temporal compacta de eventos clinicos.                                                     | SHOULD    | Inspeccion   |
| FE-REQ-013 | El usuario DEBE poder abrir un formulario de edicion en drawer lateral.                                                    | MUST      | Demostracion |
| FE-REQ-014 | Guardar un cambio mock DEBE mostrar validar, guardar y reevaluar como estados distintos.                                   | MUST      | Demostracion |
| FE-REQ-015 | La reevaluacion mock DEBE actualizar las cards visibles sin recargar la pagina.                                            | MUST      | Demostracion |
| FE-REQ-016 | La UI NO DEBE contener logica clinica TypeScript para decidir si una regla aplica.                                         | MUST      | Revision     |

### 4.3 Reglas y editor CQL

| ID         | Requisito                                                                                                          | Prioridad | Verificacion  |
| ---------- | ------------------------------------------------------------------------------------------------------------------ | --------- | ------------- |
| FE-REQ-017 | Reglas DEBE usar una tabla con nombre, version, lifecycle, hook, activacion y ultima modificacion.                 | MUST      | Inspeccion    |
| FE-REQ-018 | La tabla DEBE filtrar por texto, lifecycle, hook y activacion.                                                     | MUST      | Demostracion  |
| FE-REQ-019 | Los estados draft, validated, published, disabled y retired DEBEN diferenciarse con texto, icono y color.          | MUST      | Accesibilidad |
| FE-REQ-020 | El editor DEBE usar Monaco y presentar numeros de linea.                                                           | MUST      | Demostracion  |
| FE-REQ-021 | Metadata y codigo CQL DEBEN editarse en regiones distintas de la pantalla.                                         | MUST      | Inspeccion    |
| FE-REQ-022 | La barra de acciones DEBE incluir Guardar, Validar, Probar, Ver ELM y Publicar.                                    | MUST      | Demostracion  |
| FE-REQ-023 | Los diagnosticos DEBEN mostrar severidad, mensaje, linea y columna.                                                | MUST      | Demostracion  |
| FE-REQ-024 | Activar un diagnostico DEBE enfocar su ubicacion en Monaco.                                                        | MUST      | Demostracion  |
| FE-REQ-025 | Cambiar CQL DEBE marcar el borrador como no guardado y volver obsoleto el ELM previo.                              | MUST      | Demostracion  |
| FE-REQ-026 | Ver ELM DEBE usar un visor JSON de solo lectura.                                                                   | MUST      | Demostracion  |
| FE-REQ-027 | Probar DEBE permitir seleccionar paciente y mostrar aplica/no aplica, cards, advertencias y recursos considerados. | MUST      | Demostracion  |
| FE-REQ-028 | Publicar y activar DEBEN estar disponibles solo en el rol Docente simulado.                                        | MUST      | Demostracion  |
| FE-REQ-029 | La maqueta NO DEBE interpretar, traducir ni ejecutar CQL localmente.                                               | MUST      | Revision      |

### 4.4 Cards CDS

| ID         | Requisito                                                                                            | Prioridad | Verificacion  |
| ---------- | ---------------------------------------------------------------------------------------------------- | --------- | ------------- |
| FE-REQ-030 | Las cards DEBEN distinguir info, warning y critical sin depender solo del color.                     | MUST      | Accesibilidad |
| FE-REQ-031 | Cada card DEBE mostrar resumen, detalle, fuente y regla/version.                                     | MUST      | Inspeccion    |
| FE-REQ-032 | Una sugerencia DEBE mostrar los recursos que crearia, actualizaria o eliminaria.                     | MUST      | Demostracion  |
| FE-REQ-033 | Aplicar una sugerencia DEBE abrir confirmacion explicita.                                            | MUST      | Demostracion  |
| FE-REQ-034 | El estado sin recomendaciones DEBE ser sobrio y no parecer un error.                                 | MUST      | Inspeccion    |
| FE-REQ-035 | La actividad CDS DEBE listar evaluaciones mock por fecha, paciente, hook, resultado y correlationId. | SHOULD    | Demostracion  |

## 5. Requisitos visuales y de interaccion

| ID         | Requisito                                                                                                  | Prioridad | Verificacion   |
| ---------- | ---------------------------------------------------------------------------------------------------------- | --------- | -------------- |
| FE-REQ-036 | El contenido visible DEBE estar en espanol correcto; CQL, ELM, FHIR y CDS conservan sus nombres tecnicos.  | MUST      | Inspeccion     |
| FE-REQ-037 | La UI DEBE ser clara en 1440x900, 1280x800, 768x1024 y 390x844.                                            | MUST      | Capturas       |
| FE-REQ-038 | Tablas, toolbars, tabs y paneles DEBEN mantener dimensiones estables durante loading y cambios de estado.  | MUST      | Capturas       |
| FE-REQ-039 | Ningun texto DEBE desbordar, solaparse ni quedar oculto por otro control.                                  | MUST      | Capturas       |
| FE-REQ-040 | Todos los flujos principales DEBEN operarse con teclado y foco visible.                                    | MUST      | Accesibilidad  |
| FE-REQ-041 | Icon buttons DEBEN usar Lucide y tooltip; comandos textuales pueden usar icono y texto.                    | MUST      | Inspeccion     |
| FE-REQ-042 | Cards y modales NO DEBEN contener otras cards decorativas.                                                 | MUST      | Inspeccion     |
| FE-REQ-043 | El radio de panels y cards NO DEBE superar 8px.                                                            | MUST      | Inspeccion CSS |
| FE-REQ-044 | La interfaz NO DEBE usar gradientes, orbes, paleta morada dominante ni sombras decorativas.                | MUST      | Inspeccion CSS |
| FE-REQ-045 | La tipografia NO DEBE escalar con el ancho del viewport y el letter-spacing DEBE ser cero.                 | MUST      | Inspeccion CSS |
| FE-REQ-046 | Loading, empty, error, offline, forbidden, dirty, validating, saving y success DEBEN tener representacion. | MUST      | Demostracion   |

## 6. Requisitos tecnicos de la maqueta

| ID         | Requisito                                                                                                           | Prioridad | Verificacion |
| ---------- | ------------------------------------------------------------------------------------------------------------------- | --------- | ------------ |
| FE-REQ-047 | Los componentes de aplicacion DEBEN ser React + TypeScript portables a Vite.                                        | MUST      | Revision     |
| FE-REQ-048 | La maqueta NO DEBE depender de Server Components, Server Actions, API routes ni navegacion especifica de Next.js.   | MUST      | Revision     |
| FE-REQ-049 | Los datos mock DEBEN residir fuera de componentes visuales y exponerse mediante interfaces asincronas.              | MUST      | Revision     |
| FE-REQ-050 | Ningun componente DEBE llamar directamente a HAPI o CQL Translation Service.                                        | MUST      | Revision     |
| FE-REQ-051 | Los componentes compartidos DEBEN derivar estilos de tokens CSS, no de colores repetidos ad hoc.                    | MUST      | Revision CSS |
| FE-REQ-052 | El prototipo DEBE usar identificadores y pacientes explicitamente ficticios.                                        | MUST      | Inspeccion   |
| FE-REQ-053 | La maqueta DEBE entrar en modo aula sin pantalla de login, registro ni seleccion obligatoria de usuario.            | MUST      | Demostracion |
| FE-REQ-054 | MockRceUiApi DEBE entregar una SessionContext anonima con classroomId, sandboxId, rol y expiracion.                 | MUST      | Revision     |
| FE-REQ-055 | La UI DEBE mostrar un identificador corto de sandbox y accion Reiniciar sandbox dentro del menu de sesion.          | MUST      | Demostracion |
| FE-REQ-056 | Las operaciones mock de reglas, pacientes, cards y actividad DEBEN recibir el sandbox activo desde el provider.     | MUST      | Revision     |
| FE-REQ-057 | La maqueta DEBE indicar que cambios y reglas pertenecen a Mi sandbox sin crear una pantalla de gestion de usuarios. | SHOULD    | Inspeccion   |

## 7. Criterios de aceptacion frontend

| ID        | Escenario                 | Resultado esperado                                                      |
| --------- | ------------------------- | ----------------------------------------------------------------------- |
| FE-AC-001 | Abrir la maqueta          | Se ve el editor RCE o una vista operacional, sin landing.               |
| FE-AC-002 | Buscar un paciente        | La tabla filtra sin cambiar su ancho ni saltar de layout.               |
| FE-AC-003 | Editar una observacion    | Se muestran validacion, guardado, reevaluacion y cambio de cards.       |
| FE-AC-004 | Validar fixture invalido  | Aparecen diagnosticos y al activarlos Monaco enfoca la ubicacion.       |
| FE-AC-005 | Validar fixture valido    | Se habilitan Ver ELM y Probar; el ELM aparece solo lectura.             |
| FE-AC-006 | Probar con dos pacientes  | Un resultado mock aplica y otro no, sin evaluar CQL en frontend.        |
| FE-AC-007 | Cambiar a Alumno          | Publicar y activar quedan bloqueados con explicacion accesible.         |
| FE-AC-008 | Cambiar a Docente         | Publicar abre confirmacion y muestra version/canonical afectados.       |
| FE-AC-009 | Revisar una card critical | Se reconoce por icono, etiqueta y jerarquia, no solo color.             |
| FE-AC-010 | Usar teclado              | Navegacion, editor, tabs, dialogs y formularios conservan foco visible. |
| FE-AC-011 | Capturar desktop y mobile | No hay overflow horizontal de pagina, solapes ni texto cortado.         |
| FE-AC-012 | Revisar codigo exportado  | Mocks, UI y contratos estan separados y no hay APIs Next.js.            |
| FE-AC-013 | Abrir la maqueta          | Entra directo, muestra sandbox anonimo y permite reiniciarlo sin login. |

## 8. Trazabilidad al sistema

| Area frontend          | Requisitos principales del sistema           |
| ---------------------- | -------------------------------------------- |
| Editor y diagnosticos  | REQ-F-002, REQ-F-004 a REQ-F-009, REQ-NF-018 |
| Pruebas                | REQ-F-018 a REQ-F-024                        |
| Pacientes              | REQ-F-025 a REQ-F-031, REQ-D-006, REQ-D-007  |
| Cards y sugerencias    | REQ-F-034 a REQ-F-040, REQ-NF-021            |
| Roles                  | REQ-F-045, REQ-F-046                         |
| Modo aula anonimo      | REQ-F-051 a REQ-F-055, REQ-I-007             |
| Accesibilidad          | REQ-NF-019 a REQ-NF-021                      |
| Limites de integracion | REQ-I-001, CON-003 a CON-008                 |
