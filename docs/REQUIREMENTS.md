# Software Requirements Specification

## RCE educativo con CQL, HAPI FHIR y CDS Hooks

| Campo | Valor |
|---|---|
| Tipo de documento | Especificacion de requisitos de software |
| Estado | Propuesto |
| Version | 0.2.0 |
| Fecha | 2026-07-26 |
| Referencia metodologica | ISO/IEC/IEEE 29148:2018 |

## 1. Proposito

Este documento define que debe hacer el RCE educativo y que propiedades de calidad debe cumplir. Los requisitos se expresan de forma identificable, verificable y trazable.

La estructura esta guiada por ISO/IEC/IEEE 29148:2018. No constituye una declaracion formal de conformidad o certificacion.

El diseno que satisface estos requisitos se encuentra en [DESIGN.md](./DESIGN.md). El trabajo para implementarlos se encuentra en [TASKS.md](./TASKS.md).

## 2. Alcance del producto

El sistema permitira que alumnos y docentes creen, validen, publiquen y prueben reglas escritas en Clinical Quality Language (CQL) sin abandonar el RCE. Las reglas se traduciran a Expression Logical Model (ELM), se almacenaran como artefactos FHIR y se evaluaran contra pacientes sinteticos almacenados en HAPI FHIR.

Los cambios realizados sobre datos clinicos podran modificar el resultado de las reglas y producir recomendaciones educativas en formato CDS Hooks Cards.

## 3. Lenguaje normativo

- **DEBE**: requisito obligatorio.
- **NO DEBE**: prohibicion obligatoria.
- **DEBERIA**: recomendacion que requiere justificacion si se omite.
- **PUEDE**: capacidad opcional.

Cada requisito tiene:

- Identificador unico.
- Prioridad `MUST`, `SHOULD` o `COULD`.
- Metodo principal de verificacion.
- Referencia a criterios de aceptacion cuando corresponde.

## 4. Definiciones

| Termino | Definicion |
|---|---|
| RCE | Registro Clinico Electronico educativo. |
| CQL | Clinical Quality Language, lenguaje para representar logica clinica. |
| ELM | Expression Logical Model, representacion ejecutable de CQL. |
| FHIR | Fast Healthcare Interoperability Resources. |
| HAPI | Implementacion FHIR utilizada como repositorio y motor de Clinical Reasoning. |
| CDS Hooks | Especificacion REST para solicitar soporte de decisiones en puntos del flujo clinico. |
| Card | Recomendacion devuelta por un CDS Service. |
| Regla | CQL, metadata y configuracion necesaria para producir una recomendacion. |
| Borrador | Regla editable que todavia no ha sido publicada. |
| Version publicada | Artefacto inmutable disponible para evaluacion. |
| Paciente sintetico | Datos ficticios creados exclusivamente para docencia y pruebas. |

## 5. Actores y partes interesadas

| Actor | Necesidad principal |
|---|---|
| Alumno | Escribir CQL, comprender errores y observar resultados clinicos. |
| Docente | Preparar reglas, publicar versiones y controlar escenarios. |
| Administrador tecnico | Configurar HAPI, traductor, seguridad y entorno local. |
| Evaluador academico | Verificar que el prototipo demuestra CQL, FHIR y CDS Hooks. |

## 6. Concepto operacional

El flujo educativo esperado es:

1. El alumno abre el editor de reglas dentro del RCE.
2. Escribe CQL y solicita validacion.
3. El sistema muestra errores por linea y columna o permite ver ELM.
4. El alumno prueba la regla contra un paciente sintetico.
5. El docente publica y habilita una version.
6. El alumno abre o modifica la ficha de un paciente.
7. El sistema reevalua las reglas aplicables.
8. El RCE muestra cards nuevas, modificadas o eliminadas.
9. Una accion sugerida solo se escribe en HAPI despues de confirmacion explicita.

## 7. Supuestos y dependencias

- Existira una instancia HAPI FHIR R4 local o accesible por red.
- HAPI tendra Clinical Reasoning habilitado para las funciones de evaluacion.
- Existira una instancia compatible de CQL Translation Service.
- `FHIRHelpers` y las dependencias CQL basicas estaran disponibles.
- Los recursos terminologicos utilizados por las demostraciones estaran instalados.
- Los pacientes usados durante el desarrollo y las clases seran sinteticos.
- El navegador tendra conectividad con el backend, no necesariamente con HAPI o el traductor.

## 8. Restricciones

| ID | Restriccion |
|---|---|
| CON-001 | El backend de aplicacion se implementara con NestJS y TypeScript. |
| CON-002 | HAPI FHIR sera el repositorio logico de datos clinicos y artefactos. |
| CON-003 | El backend NO DEBE acceder directamente a las tablas de HAPI. |
| CON-004 | La traduccion CQL a ELM NO DEBE implementarse dentro del proyecto. |
| CON-005 | La evaluacion clinica NO DEBE implementarse mediante reglas ad hoc en TypeScript. |
| CON-006 | La primera version NO DEBE utilizar pacientes reales. |
| CON-007 | El frontend DEBE incluir el editor CQL dentro del RCE. |
| CON-008 | Las recomendaciones NO DEBEN modificar recursos FHIR sin confirmacion. |

## 9. Requisitos funcionales

### 9.1 Autoria y gestion de reglas

| ID | Requisito | Prioridad | Verificacion |
|---|---|---|---|
| REQ-F-001 | El sistema DEBE permitir crear un borrador de regla. | MUST | E2E |
| REQ-F-002 | El sistema DEBE permitir editar CQL dentro del RCE mediante un editor de codigo. | MUST | Demostracion |
| REQ-F-003 | El sistema DEBE guardar el CQL y la metadata de un borrador en HAPI FHIR. | MUST | Integracion |
| REQ-F-004 | El sistema DEBE capturar nombre, titulo, version, hook, expresion de condicion, resumen, detalle e indicador de una regla. | MUST | E2E |
| REQ-F-005 | El sistema DEBE enviar el CQL a CQL Translation Service para validarlo y obtener ELM JSON. | MUST | Contrato |
| REQ-F-006 | El sistema DEBE devolver los diagnosticos de CQL con severidad, mensaje, linea y columna cuando esa informacion este disponible. | MUST | Contrato/E2E |
| REQ-F-007 | El sistema DEBE permitir visualizar el ultimo ELM vigente de un borrador validado. | MUST | E2E |
| REQ-F-008 | El sistema DEBE resolver `include` CQL por nombre y version desde artefactos autorizados. | MUST | Integracion |
| REQ-F-009 | El sistema DEBE comprobar que la expresion configurada exista en ELM y produzca un Boolean antes de publicar. | MUST | Unit/Integracion |
| REQ-F-010 | El sistema DEBE publicar una regla como Library y PlanDefinition relacionados. | MUST | Integracion |
| REQ-F-011 | La publicacion DEBE incluir CQL y ELM correspondientes a la misma fuente. | MUST | Integracion |
| REQ-F-012 | Una version publicada DEBE ser inmutable. | MUST | E2E |
| REQ-F-013 | Editar una regla publicada DEBE producir una version nueva. | MUST | E2E |
| REQ-F-014 | El docente DEBE poder habilitar o deshabilitar una version publicada. | MUST | E2E |
| REQ-F-015 | Solo una version publicada de una misma regla PUEDE estar habilitada. | MUST | Integracion |
| REQ-F-016 | El docente DEBE poder retirar una version que ya no deba utilizarse. | MUST | E2E |
| REQ-F-017 | El sistema DEBE permitir listar y filtrar reglas por estado, hook, nombre y version. | MUST | API/E2E |

### 9.2 Prueba y evaluacion

| ID | Requisito | Prioridad | Verificacion |
|---|---|---|---|
| REQ-F-018 | El usuario DEBE poder seleccionar un paciente sintetico para probar una regla validada. | MUST | E2E |
| REQ-F-019 | El sistema DEBE permitir probar un borrador validado antes de publicarlo. | MUST | Integracion/E2E |
| REQ-F-020 | La prueba DEBE ejecutar la regla mediante las capacidades de Clinical Reasoning configuradas. | MUST | Integracion |
| REQ-F-021 | La respuesta de prueba DEBE indicar si la condicion aplica y que cards fueron generadas. | MUST | E2E |
| REQ-F-022 | Los errores de evaluacion DEBEN identificar la regla y conservar informacion util del OperationOutcome. | MUST | Integracion |
| REQ-F-023 | El sistema DEBE evaluar todas las reglas publicadas y habilitadas asociadas a un hook. | MUST | E2E |
| REQ-F-024 | El fallo de una regla NO DEBERIA impedir la evaluacion de otras reglas independientes. | SHOULD | Integracion |

### 9.3 Pacientes y ficha clinica

| ID | Requisito | Prioridad | Verificacion |
|---|---|---|---|
| REQ-F-025 | El sistema DEBE listar y buscar pacientes sinteticos. | MUST | E2E |
| REQ-F-026 | El sistema DEBE mostrar una ficha agregada con Patient y recursos clinicos relacionados. | MUST | E2E |
| REQ-F-027 | El sistema DEBE permitir modificar los tipos de recurso clinico incluidos en una lista autorizada. | MUST | E2E/Seguridad |
| REQ-F-028 | El sistema DEBE validar un recurso FHIR antes o durante su persistencia. | MUST | Integracion |
| REQ-F-029 | El sistema DEBE soportar cambios atomicos de varios recursos mediante un Bundle `transaction`. | MUST | Integracion |
| REQ-F-030 | Despues de una escritura clinica exitosa, el sistema DEBE reevaluar las reglas aplicables. | MUST | E2E |
| REQ-F-031 | La respuesta posterior al cambio DEBE permitir actualizar las cards visibles sin recargar toda la aplicacion. | MUST | E2E |

### 9.4 CDS Hooks y recomendaciones

| ID | Requisito | Prioridad | Verificacion |
|---|---|---|---|
| REQ-F-032 | El sistema DEBE exponer un endpoint CDS Services Discovery. | MUST | Contrato |
| REQ-F-033 | El sistema DEBE exponer servicios para `patient-view`, `order-select` y `order-sign`. | MUST | Contrato/E2E |
| REQ-F-034 | Cada servicio DEBE devolver una respuesta con un arreglo `cards`. | MUST | Contrato |
| REQ-F-035 | Cuando ninguna regla aplique, el servicio DEBE responder `200` con `cards: []`. | MUST | Contrato |
| REQ-F-036 | Cada card DEBE incluir `summary`, `indicator` y `source`. | MUST | Contrato |
| REQ-F-037 | Las cards DEBERIAN ordenarse por `critical`, `warning` e `info`. | SHOULD | Unit/E2E |
| REQ-F-038 | Una card PUEDE incluir sugerencias con acciones FHIR `create`, `update` o `delete`. | COULD | E2E |
| REQ-F-039 | El sistema DEBE solicitar confirmacion explicita antes de aplicar una sugerencia. | MUST | E2E |
| REQ-F-040 | La aplicacion de una sugerencia DEBE ser validada, atomica cuando corresponda e idempotente. | MUST | Integracion/E2E |
| REQ-F-041 | El sistema DEBERIA aceptar feedback sobre cards mostradas. | SHOULD | Contrato |
| REQ-F-042 | Un cambio clinico generico DEBE tratarse como evento interno y NO presentarse como un CDS Hook estandar inexistente. | MUST | Revision/E2E |

### 9.5 Auditoria, operacion y acceso

| ID | Requisito | Prioridad | Verificacion |
|---|---|---|---|
| REQ-F-043 | El sistema DEBE registrar autor, fecha y recursos afectados al publicar una regla. | MUST | Integracion |
| REQ-F-044 | El sistema DEBERIA registrar pruebas, evaluaciones y feedback con identificadores de correlacion. | SHOULD | Integracion |
| REQ-F-045 | El rol alumno DEBE poder crear, editar, validar y probar borradores. | MUST | Seguridad/E2E |
| REQ-F-046 | Solo el rol docente DEBE poder publicar, habilitar, deshabilitar o retirar reglas. | MUST | Seguridad/E2E |
| REQ-F-047 | El sistema DEBE exponer endpoints separados de liveness y readiness. | MUST | Integracion |
| REQ-F-048 | Readiness DEBE comprobar HAPI y CQL Translation Service. | MUST | Integracion |
| REQ-F-049 | Al iniciar, el sistema DEBE comprobar la compatibilidad basica del servidor FHIR y detectar si Clinical Reasoning no esta disponible. | MUST | Integracion |
| REQ-F-050 | La URL y autenticacion de HAPI DEBEN poder configurarse sin recompilar la aplicacion. | MUST | Inspeccion/Integracion |

## 10. Requisitos de interfaces externas

| ID | Requisito | Prioridad | Verificacion |
|---|---|---|---|
| REQ-I-001 | El navegador DEBE consumir las funciones del sistema exclusivamente mediante la API NestJS. | MUST | Seguridad/Inspeccion |
| REQ-I-002 | La integracion con HAPI DEBE usar la API REST FHIR R4 y no su esquema SQL. | MUST | Inspeccion/Integracion |
| REQ-I-003 | La traduccion DEBE usar el endpoint HTTP soportado por CQL Translation Service. | MUST | Contrato |
| REQ-I-004 | La API CDS Hooks DEBE mantener endpoints estables aunque cambie la instancia HAPI. | MUST | Contrato |
| REQ-I-005 | La API del RCE DEBE documentarse mediante OpenAPI. | MUST | Inspeccion |
| REQ-I-006 | Los errores de API DEBEN usar un contrato comun con codigo, mensaje, correlationId y detalles opcionales. | MUST | Contrato |

## 11. Requisitos de datos

| ID | Requisito | Prioridad | Verificacion |
|---|---|---|---|
| REQ-D-001 | El CQL y el ELM DEBEN persistirse como contenidos de un recurso Library. | MUST | Integracion |
| REQ-D-002 | La condicion, el disparador y la recomendacion DEBEN persistirse como PlanDefinition. | MUST | Integracion |
| REQ-D-003 | Library y PlanDefinition DEBEN compartir identidad canonical y version coherentes. | MUST | Unit/Integracion |
| REQ-D-004 | El sistema DEBE distinguir logical id de HAPI, canonical URL y version de negocio. | MUST | Revision/Integracion |
| REQ-D-005 | El estado de ejecucion habilitado/deshabilitado DEBE ser independiente del ciclo editorial. | MUST | Unit/E2E |
| REQ-D-006 | Los datos de paciente DEBEN usar recursos FHIR R4. | MUST | Integracion |
| REQ-D-007 | Los escenarios entregados DEBEN contener exclusivamente datos sinteticos. | MUST | Inspeccion |
| REQ-D-008 | Las dependencias CQL DEBEN resolverse desde una fuente autorizada y versionada. | MUST | Seguridad/Integracion |
| REQ-D-009 | La poblacion local de demostracion DEBE generarse de forma reproducible, registrar su procedencia y poder distinguirse de otros datos FHIR. | MUST | Inspeccion/Integracion |

## 12. Requisitos no funcionales

### 12.1 Interoperabilidad y compatibilidad

| ID | Requisito | Prioridad | Verificacion |
|---|---|---|---|
| REQ-NF-001 | El sistema DEBE operar con recursos FHIR R4. | MUST | Contrato |
| REQ-NF-002 | Las versiones de HAPI, traductor y tooling CQL DEBEN fijarse y registrarse en una matriz de compatibilidad. | MUST | Inspeccion/Integracion |
| REQ-NF-003 | La cadena CQL a ELM a `$apply` DEBE verificarse antes de iniciar el desarrollo funcional completo. | MUST | Prueba de arquitectura |

### 12.2 Rendimiento

Los valores siguientes son objetivos para un equipo local de demostracion:

| ID | Requisito | Prioridad | Verificacion |
|---|---|---|---|
| REQ-NF-004 | La validacion CQL DEBERIA completar en menos de 5 segundos en p95. | SHOULD | Rendimiento |
| REQ-NF-005 | La evaluacion individual DEBERIA completar en menos de 3 segundos en p95. | SHOULD | Rendimiento |
| REQ-NF-006 | Un hook con hasta 50 reglas activas DEBERIA completar en menos de 10 segundos en p95. | SHOULD | Rendimiento |
| REQ-NF-007 | El entorno DEBERIA soportar al menos 500 pacientes sinteticos y 50 reglas activas. | SHOULD | Carga |

### 12.3 Seguridad y privacidad

| ID | Requisito | Prioridad | Verificacion |
|---|---|---|---|
| REQ-NF-008 | HAPI, el traductor y PostgreSQL NO DEBEN exponerse directamente al navegador en el despliegue normal. | MUST | Inspeccion/Seguridad |
| REQ-NF-009 | El sistema DEBE limitar origenes CORS, tamano de solicitudes y concurrencia de operaciones costosas. | MUST | Seguridad |
| REQ-NF-010 | El sistema NO DEBE registrar cuerpos clinicos completos ni secretos en logs. | MUST | Inspeccion/Seguridad |
| REQ-NF-011 | Hosts FHIR externos, tipos de recurso y dependencias CQL DEBEN controlarse mediante allowlists. | MUST | Seguridad |
| REQ-NF-012 | Los secretos DEBEN obtenerse desde configuracion externa al codigo. | MUST | Inspeccion |

### 12.4 Confiabilidad y consistencia

| ID | Requisito | Prioridad | Verificacion |
|---|---|---|---|
| REQ-NF-013 | Las actualizaciones FHIR DEBEN usar control optimista cuando exista ETag. | MUST | Integracion |
| REQ-NF-014 | La publicacion de artefactos relacionados DEBE ser atomica. | MUST | Integracion |
| REQ-NF-015 | Las escrituras repetibles DEBEN disponer de una estrategia de idempotencia. | MUST | Integracion |
| REQ-NF-016 | Las escrituras NO DEBEN reintentarse automaticamente sin garantia de idempotencia. | MUST | Unit/Integracion |
| REQ-NF-017 | La indisponibilidad del traductor NO DEBE impedir consultar pacientes ya almacenados. | MUST | Resiliencia |

### 12.5 Usabilidad y accesibilidad

| ID | Requisito | Prioridad | Verificacion |
|---|---|---|---|
| REQ-NF-018 | Los diagnosticos DEBEN permitir navegar desde el mensaje hasta la ubicacion del CQL. | MUST | E2E |
| REQ-NF-019 | El editor, los formularios y las cards DEBEN poder operarse mediante teclado. | MUST | Accesibilidad |
| REQ-NF-020 | El sistema DEBE diferenciar visualmente borrador, validado, publicado, deshabilitado y retirado. | MUST | E2E |
| REQ-NF-021 | Las cards DEBEN diferenciar `info`, `warning` y `critical` sin depender solo del color. | MUST | Accesibilidad |

### 12.6 Mantenibilidad y operacion

| ID | Requisito | Prioridad | Verificacion |
|---|---|---|---|
| REQ-NF-022 | Las integraciones con HAPI, traductor y ejecutor DEBEN estar aisladas tras contratos reemplazables. | MUST | Revision de codigo |
| REQ-NF-023 | Los logs DEBEN incluir un correlationId propagado a dependencias cuando sea posible. | MUST | Integracion |
| REQ-NF-024 | El entorno local DEBE iniciarse de forma reproducible mediante Docker Compose. | MUST | Demostracion |
| REQ-NF-025 | Las imagenes de contenedor NO DEBEN usar tags flotantes en entregas reproducibles. | MUST | Inspeccion |
| REQ-NF-026 | Los flujos CQL, FHIR y CDS Hooks DEBEN disponer de pruebas de contrato y end-to-end. | MUST | Inspeccion/Ejecucion |

## 13. Criterios de aceptacion de alto nivel

| ID | Escenario | Resultado esperado | Requisitos principales |
|---|---|---|---|
| AC-001 | Escribir CQL invalido y validar | Se muestran errores con ubicacion y el editor navega a ellos. | REQ-F-005, REQ-F-006, REQ-NF-018 |
| AC-002 | Escribir CQL valido y validar | Se genera y visualiza ELM. | REQ-F-005, REQ-F-007 |
| AC-003 | Publicar una regla validada | HAPI contiene Library y PlanDefinition coherentes e inmutables. | REQ-F-010 a REQ-F-013 |
| AC-004 | Probar una regla con dos pacientes | Un paciente genera card y el otro no. | REQ-F-018 a REQ-F-023 |
| AC-005 | Cambiar un dato clinico | La card aparece, cambia o desaparece sin recargar toda la aplicacion. | REQ-F-027 a REQ-F-031 |
| AC-006 | Deshabilitar una regla | La regla deja de participar en hooks. | REQ-F-014, REQ-F-015, REQ-F-023 |
| AC-007 | Invocar `patient-view` sin recomendaciones | Se obtiene HTTP 200 con `cards: []`. | REQ-F-032 a REQ-F-036 |
| AC-008 | Aceptar una sugerencia | El cambio FHIR se confirma, aplica una vez y queda auditado. | REQ-F-039, REQ-F-040, REQ-F-044 |
| AC-009 | Intentar publicar como alumno | La operacion se rechaza por autorizacion. | REQ-F-045, REQ-F-046 |
| AC-010 | Levantar el entorno desde cero | Todos los servicios quedan ready con versiones fijadas. | REQ-NF-002, REQ-NF-024, REQ-NF-025 |

## 14. Matriz de trazabilidad resumida

| Area | Requisitos | Seccion de diseno | Grupo de tareas |
|---|---|---|---|
| Autoria | REQ-F-001 a REQ-F-017 | DESIGN 9 y 12 | TASK 3.x y 4.x |
| Evaluacion | REQ-F-018 a REQ-F-024 | DESIGN 10.3 y 12.3 | TASK 5.x |
| Pacientes | REQ-F-025 a REQ-F-031 | DESIGN 9.7 y 12.4 | TASK 6.x |
| CDS Hooks | REQ-F-032 a REQ-F-042 | DESIGN 10.4 y 12.5 | TASK 5.x |
| Auditoria/acceso | REQ-F-043 a REQ-F-050 | DESIGN 13 y 14 | TASK 7.x |
| Datos | REQ-D-001 a REQ-D-009 | DESIGN 8, 11 y 15 | TASK 1.x, 3.x y 4.x |
| Calidad | REQ-NF-001 a REQ-NF-026 | DESIGN 13 a 17 | TASK 1.x, 7.x y 8.x |

La trazabilidad detallada se mantendra en las tablas de cada tarea y en los casos de prueba automatizados.

## 15. Referencias

- [ISO/IEC/IEEE 29148:2018](https://www.iso.org/standard/72089.html)
- [FHIR R4](https://hl7.org/fhir/R4/)
- [Clinical Quality Language](https://cql.hl7.org/)
- [CDS Hooks](https://cds-hooks.org/specification/current/)
- [HAPI FHIR Clinical Reasoning](https://hapifhir.io/hapi-fhir/docs/clinical_reasoning/overview.html)
- [CQL Translation Service](https://github.com/cqframework/cql-translation-service)
