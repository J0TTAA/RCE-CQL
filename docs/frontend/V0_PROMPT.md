# Prompt para v0

## Como usarlo

El [flujo incremental oficial de v0](https://v0.dev/docs/full-stack-apps)
recomienda iterar desde UI hacia funcionalidad. Usar primero el prompt maestro
completo y despues aplicar los prompts de revision en mensajes separados. Crear
el prototipo en un proyecto independiente y no conectar aun `RCE-CQL` a GitHub;
la [integracion GitHub de v0](https://v0.dev/docs/github) crea branches y
commits, algo que reservaremos para despues de aprobar la maqueta.

## Prompt maestro

Copiar desde la siguiente linea hasta `FIN DEL PROMPT`:

```text
Construye una maqueta frontend interactiva y de alta fidelidad para "RCE CQL",
un Registro Clinico Electronico educativo donde alumnos escriben reglas CQL,
las validan, las prueban contra pacientes sinteticos y observan recomendaciones
CDS Hooks cuando cambian datos clinicos.

OBJETIVO
Quiero la aplicacion real como primera pantalla, no una landing page ni una
pagina de marketing. Debe sentirse como una herramienta clinica operacional:
compacta, sobria, rapida de escanear y adecuada para uso repetido en clases.

LIMITES TECNICOS OBLIGATORIOS
- Genera frontend React + TypeScript con componentes cliente portables a Vite.
- Si tu preview necesita un wrapper Next.js, mantenlo solo como envoltorio: los
  componentes de aplicacion no pueden importar next/navigation, next/image,
  Server Components, Server Actions ni API routes.
- Usa Tailwind CSS, CSS variables para tokens y primitives estilo shadcn/ui.
- Usa Lucide para todos los iconos; no dibujes SVG manuales.
- Usa @monaco-editor/react para el editor CQL y para ELM JSON read-only.
- Separa datos mock, tipos, servicios asincronos y componentes visuales.
- Expone una interfaz MockRceUiApi; los componentes nunca leen arrays mock
  directamente ni llaman a HAPI o al traductor CQL.
- No implementes backend, autenticacion real, base de datos ni llamadas de red.
- No parses, traduzcas ni ejecutes CQL en JavaScript/TypeScript.
- Los resultados validos, invalidos y por paciente deben venir de fixtures mock
  predefinidos, no de condiciones clinicas codificadas en la UI.
- Todo el texto visible debe estar en espanol correcto, con tildes. Conserva los
  nombres tecnicos CQL, ELM, FHIR y CDS Hooks.

ARQUITECTURA DE ARCHIVOS
Organiza la aplicacion por features:
- src/app para App, router y providers.
- src/components/ui y src/components/layout.
- src/features/patients con api, components, pages y types.
- src/features/rules con api, components, pages y types.
- src/features/cds con api, components, pages y types.
- src/mocks/fixtures y src/mocks/mock-rce-api.ts.
- src/lib/rce-api.ts y formatters.
- src/styles/tokens.css y globals.css.
No construyas todo dentro de un unico page.tsx.

RUTAS Y NAVEGACION
Crea navegacion funcional entre:
- /patients: listado de pacientes.
- /patients/:id: ficha clinica.
- /rules: catalogo de reglas.
- /rules/new: nueva regla.
- /rules/:id: workspace CQL.
- /rules/:id/test: prueba con paciente.
- /activity: actividad CDS.
La pantalla inicial debe ser /rules/rule-adult-risk para mostrar la experiencia
central desde el primer viewport.

SHELL
- Sidebar fija de 232px, colapsable a 64px, con marca "RCE CQL".
- Navegacion: Pacientes, Reglas CQL, Actividad CDS.
- Al pie muestra estados API, HAPI y Traductor con icono y texto.
- Topbar de 56px con breadcrumb, badge de entorno sintetico, selector segmentado
  de rol Alumno/Docente y menu de usuario.
- Incluye skip link y landmarks semanticos.
- En mobile la sidebar debe ser un drawer.

PANTALLA PACIENTES
- Usa tabla densa y escaneable, nunca una cuadricula de cards.
- Toolbar con busqueda, filtro de cohorte, filtro con/sin alertas y contador.
- Columnas: paciente e ID sintetico, edad/cohorte, sexo administrativo,
  condiciones activas, ultimo encuentro, estado CDS y acciones.
- Usa al menos 8 pacientes ficticios, etiquetados como sinteticos, mezclando
  ninos, adolescentes, adultos y adultos mayores.
- Click en fila abre la ficha.

FICHA CLINICA
- Header no flotante con nombre sintetico, SYN-xxxx, edad, nacimiento, sexo y
  badge de datos sinteticos.
- Tabs: Resumen, Condiciones, Observaciones, Medicamentos, Encuentros.
- Resumen con datos clinicos compactos y linea temporal, sin cards anidadas.
- Desktop: contenido principal y rail CDS sticky de 300-360px.
- Mobile: recomendaciones CDS como tab con contador.
- Boton "Editar dato" abre drawer de 440px; full-screen en mobile.
- Permite editar una Observation mock y muestra secuencia visible:
  Validando -> Guardando -> Reevaluando reglas -> Actualizado.
- Al terminar, actualiza cards sin recargar. La respuesta viene del mock API.

PANTALLA REGLAS
- Tabla, no grid de cards.
- Filtros por texto, lifecycle, hook y activacion.
- Columnas: regla/nombre CQL, version, lifecycle, hook, activacion, modificada,
  acciones.
- Diferencia draft, validated, published, disabled y retired usando icono, texto
  y color, nunca solo color.
- Boton primario unico "Nueva regla".

WORKSPACE CQL
- Header compacto con titulo, nombre CQL, version, lifecycle y estado dirty.
- Toolbar estable con Guardar, Validar, Probar, Ver ELM y Publicar.
- Usa icono+texto para comandos y tooltips en icon buttons.
- Desktop: Monaco a la izquierda, inspector de 320-380px a la derecha y panel
  Diagnostics redimensionable abajo.
- Inspector con tabs Metadata, Prueba y ELM.
- Monaco debe tener numeros de linea, minimap discreto, fuente monoespaciada,
  alto minimo 420px y label accesible que identifique el editor CQL.
- Usa un fixture CQL legible llamado AdultRiskAssessment version 0.1.0.
- Metadata: titulo, nombre, version, hook, expresion booleana, summary, detail e
  indicator.
- Diagnostics muestra Error/Warning/Info, mensaje y "Ln x, Col y". Al hacer
  click debe enfocar/revelar esa posicion en Monaco usando markers externos.
- Incluye un fixture valido y otro invalido. Validar consulta MockRceUiApi; no
  inspecciona el texto CQL localmente.
- Cambiar el codigo marca dirty y vuelve stale el ELM anterior.
- ELM usa Monaco JSON read-only y solo se habilita tras resultado mock valido.
- Probar permite elegir paciente y muestra Aplica/No aplica, cards, recursos
  considerados, warnings y correlationId.
- Alumno no puede Publicar ni activar. Muestra control deshabilitado con tooltip
  "Solo docentes". Docente puede abrir dialog de publicacion que resume version,
  canonical y artefactos Library/PlanDefinition.

CARDS CDS
- Disena cards compactas individuales, no una seccion llena de cards decorativas.
- Severidades info, warning y critical con iconos distintos, labels visibles y
  fondos suaves.
- Cada card muestra summary, detail colapsable, source y regla/version.
- Una sugerencia lista create/update/delete y recurso FHIR afectado.
- Aplicar abre dialog de confirmacion explicita con paciente, accion y recurso.
- Incluye estado vacio "Sin recomendaciones activas" sobrio, no celebratorio.

ACTIVIDAD CDS
- Tabla cronologica con fecha, paciente, hook, reglas, cards, duracion, estado y
  correlationId.
- Filtros por hook, severidad y resultado.
- Click en fila abre drawer con cards emitidas, recursos y warnings.

MOCKS E INTERACCIONES
- MockRceUiApi retorna Promises con latencia determinista corta.
- Incluye loading, empty, error, degraded/offline, forbidden, dirty, validating,
  saving y success.
- Incluye un control solo de demo para alternar escenarios de API normal,
  traductor caido y HAPI caido; ubicalo dentro del menu de entorno, no como banner.
- Una regla fixture valida retorna ELM y resultados predefinidos.
- Una regla fixture invalida retorna diagnosticos predefinidos.
- Dos pacientes deben dar resultados mock diferentes al probar la misma regla.
- No agregues if de edad, diagnostico, laboratorio o logica CQL en componentes.

SISTEMA VISUAL
- Tema claro, sin dark mode en esta maqueta.
- Canvas #F6F8F9, surface #FFFFFF, subtle #EEF3F4, text #172126,
  muted #5D6B72, border #D7E0E3.
- Color interactivo teal #0B6E69 y hover #085955.
- Info #2563EB, success #15803D, warning #A8540B, critical #B42318,
  siempre con fondos suaves y significado textual/iconico.
- No uses gradientes, orbes, bokeh, morado dominante, beige, dark slate ni
  sombras decorativas.
- Tipografia UI Inter/system sans; codigo JetBrains Mono/system monospace.
- Escala 12, 13, 14, 16, 20 y 24px. No font-size con vw.
- letter-spacing siempre 0.
- Radius 4-6px en controles y maximo 8px en panels/cards/dialogs.
- Altura de controles 32 o 36px; icon buttons con dimensiones estables.
- Sombras solo para dialog, popover y drawer.
- No metas cards dentro de cards. No conviertas cada seccion en card flotante.
- No incluyas texto visible que explique las features o atajos de teclado.
- No incluyas hero, estadisticas gigantes ni copy de marketing.

RESPONSIVE Y ACCESIBILIDAD
- Debe funcionar en 1440x900, 1280x800, 768x1024 y 390x844.
- Sin overflow horizontal de pagina, solapes ni textos cortados sin tooltip.
- En tablet/mobile convierte paneles multiples en tabs o drawers.
- Toolbars pueden envolver en dos lineas estables.
- Todos los flujos deben operar con teclado, foco visible y restauracion de foco.
- Usa patrones ARIA correctos para tabs, dialogs, tooltips, combobox y tablas.
- Severidades y lifecycle deben entenderse en escala de grises.
- Respeta prefers-reduced-motion.

ENTREGA
- Genera la aplicacion multi-ruta completa e interactiva.
- Incluye todos los archivos, fixtures y tipos necesarios para ejecutar el mock.
- Prioriza composicion profesional, consistencia y codigo separable.
- No agregues backend ni dependencias especificas de Next.js.
FIN DEL PROMPT
```

## Prompt de revision visual

Aplicar despues de la primera generacion:

```text
Audita todas las pantallas contra estas reglas y corrige el codigo, no solo la
pantalla actual: herramienta operacional compacta, tablas en catalogos, no cards
anidadas, radius maximo 8px, sin gradientes ni sombras decorativas, tipografia
sin vw y letter-spacing 0. Comprueba 1440x900, 1280x800, 768x1024 y 390x844.
Corrige overflow, solapes, toolbar wrapping, alturas inestables y cualquier texto
que no quepa. Conserva los mismos tokens y componentes compartidos.
```

## Prompt de accesibilidad

```text
Haz una pasada de accesibilidad WCAG AA sobre el prototipo completo. Verifica
landmarks, skip link, orden DOM, foco visible, restauracion de foco en dialogs y
drawers, teclado en tabs/combobox/tablas, nombres accesibles de icon buttons,
aria-live para estados asincronos y contraste. Info, warning, critical y todos
los lifecycle deben distinguirse mediante icono y texto ademas del color. No
cambies la composicion visual salvo donde sea necesario para corregir acceso.
```

## Prompt de portabilidad

```text
Revisa el arbol de archivos para que los componentes de aplicacion sean
portables a React + Vite. Elimina imports next/*, Server Components, Server
Actions, API routes y acceso a variables NEXT_PUBLIC. Mantiene cualquier wrapper
de preview separado. Confirma que mocks, tipos, RceUiApi, features, components/ui
y styles estan en archivos distintos y que ningun componente interpreta CQL o
llama directamente a HAPI/CQL Translation Service.
```

## Material a devolver para integracion

Al terminar la iteracion en v0, conservar:

- URL privada de la generacion.
- Capturas de las cuatro resoluciones.
- Arbol de archivos generado.
- `package.json` o listado de dependencias.
- Componentes fuente exportados.
- Notas sobre errores de preview o controles incompletos.

No conectar ni fusionar la generacion con `main` antes de revisar estos
artefactos en el repositorio local.
