# Preguntas y respuestas para defender la demo

> Catálogo actualizado el 3 de noviembre de 2026: los ejemplos anteriores de alergia y diabetes al ordenar ya no están en el selector. Este documento conserva esas explicaciones como material de estudio. Para la demo actual usa el [libreto con las cuatro plantillas vigentes](./LIBRETO_DEMO_PASO_A_PASO.md).


3 de noviembre de 2026 · Respuestas breves para decir en voz alta. Cubren las preguntas principales y objeciones técnicas previsibles; no es posible enumerar todas las preguntas de una audiencia.

Usa primero la respuesta corta. Amplía con la [guía técnica](./GUIA_APRENDIZAJE_DEMO_HL7_FHIR.md) solo cuando te lo pidan. Para ensayar: oculta cada respuesta, contesta con tus palabras y compara. Si practicamos por chat, seguimos con una pregunta por turno y feedback.

## A. Preguntas que salen de la explicación inicial

**1. ¿Qué es un RCE?**
Un Registro Clínico Electrónico. Esta versión es educativa: permite explorar datos sintéticos, escribir reglas y observar sus resultados.

**2. ¿Qué problema resuelve este proyecto?**
Permite ver el recorrido completo entre dato clínico, regla computable y recomendación, sin salir de la aplicación.

**3. ¿Qué es CQL?**
Clinical Quality Language: un lenguaje para expresar lógica sobre datos clínicos. Aquí se usa para escribir condiciones que decidirán si una regla aplica.

**4. ¿CQL es una base de datos o un servidor?**
No. Es un lenguaje. El servidor guarda datos y artefactos; el motor ejecuta la lógica escrita en ese lenguaje después de traducirla.

**5. ¿CQL solo funciona con FHIR?**
No está limitado conceptualmente a FHIR. En este proyecto las reglas declaran el modelo FHIR 4.0.1 y el adaptador de ejecución trabaja con ese modelo.

**6. ¿Qué es ELM?**
Expression Logical Model: la representación estructurada de la lógica CQL. El proyecto utiliza su representación JSON como entrada del motor.

**7. ¿ELM es el resultado de la regla?**
No. Describe la lógica que se ejecutará. El resultado aparece al evaluarla con datos y parámetros; para nuestras cards esperamos un Boolean.

**8. ¿Por qué convertir CQL a ELM?**
CQL facilita la autoría; ELM ofrece una representación estructurada para herramientas y motores. El runtime elegido consume ELM.

**9. ¿Cómo se hace la conversión?**
Un traductor analiza el texto, resuelve su estructura y tipos según el modelo y produce ELM o diagnósticos. No consiste en envolver el texto en JSON. [Semántica de traducción](https://cql.hl7.org/06-translationsemantics.html).

**10. ¿Quién hace esa conversión en el proyecto?**
CQL Translation Service. El adaptador de NestJS envía un POST a `/cql/translator`, con el texto CQL y opciones, y solicita ELM JSON.

**11. ¿El traductor necesita los datos del paciente?**
La petición de traducción de este proyecto envía la regla, no el bundle del paciente. Los datos se usan después al evaluar.

**12. ¿Qué es HAPI?**
La implementación FHIR usada como servidor de recursos. Guarda pacientes, Library y los Basic del sandbox; se consulta por API.

**13. ¿Qué es NestJS?**
El framework del backend. Aquí coordina sesiones, consultas FHIR, traducción, ejecución y generación de respuestas.

**14. ¿Qué motor ejecuta la lógica?**
`cql-execution`, con `cql-exec-fhir` para consumir los datos FHIR. Corre dentro del backend; no se construyó un motor propio.

**15. ¿Qué es una card?**
Una pieza de información de soporte a decisiones que muestra la interfaz. La fachada CDS devuelve resumen, indicador, fuente y otros campos disponibles.

**16. ¿La card es un recurso FHIR?**
No. Es parte del formato de respuesta CDS Hooks. Puede referirse a datos FHIR, pero no existe aquí un recurso FHIR llamado Card.

**17. ¿Qué es el sandbox?**
El espacio privado de práctica de una sesión. Separa sus reglas, cambios de pacientes y actividad de los de otras sesiones.

**18. ¿Qué significa que la expresión devuelva exactamente verdadero?**
El motor debe devolver el Boolean `true`. El backend compara `value === true`; el texto `"true"`, un número o un resultado ausente no equivalen a ese Boolean.

## B. HL7, FHIR y cada recurso

Las definiciones de recursos se consultan en [FHIR R4](https://hl7.org/fhir/R4/resourcelist.html). Su uso concreto en esta demo está explicado en las respuestas y en la guía técnica.

**19. ¿Qué es HL7?**
Una organización de estándares de interoperabilidad sanitaria. En este proyecto usamos estándares de su ecosistema, especialmente FHIR y CQL.

**20. ¿Qué significa FHIR?**
Fast Healthcare Interoperability Resources. Define recursos y reglas para representar e intercambiar información sanitaria.

**21. ¿FHIR y HAPI son lo mismo?**
FHIR es el estándar; HAPI es una implementación. Otro servidor compatible podría reemplazarlo si satisface los contratos y capacidades requeridos.

**22. ¿Esto recibe mensajes HL7 v2?**
El flujo mostrado usa FHIR por HTTP. No demuestra un receptor v2 ni una conversión de mensajes PID/OBX a recursos FHIR.

**23. ¿Qué es un recurso?**
Una unidad estructurada de información con un propósito definido, como un paciente, resultado, solicitud o artefacto de conocimiento.

**24. ¿Cualquier JSON sirve como FHIR?**
No. Debe respetar la estructura, tipos y restricciones del estándar y, cuando corresponda, del perfil acordado.

**25. ¿Qué es Patient?**
El recurso con información demográfica y administrativa del paciente. Su `birthDate` permite calcular edad en la plantilla.

**26. ¿Qué es Observation?**
Un recurso de mediciones o afirmaciones simples, como una HbA1c. Sus campos describen concepto, estado, sujeto, valor y tiempo.

**27. ¿Qué es Condition?**
Un problema o condición clínica registrada. Se distingue su vigencia clínica de su grado de verificación.

**28. ¿Qué es MedicationRequest?**
Una solicitud de medicamento. Tener una solicitud activa no demuestra que el paciente lo haya recibido o tomado.

**29. ¿Qué es ServiceRequest?**
Una solicitud de examen, procedimiento u otro servicio. Solicitar HbA1c no crea automáticamente una Observation con el resultado.

**30. ¿Qué es AllergyIntolerance?**
Información sobre riesgo de reacción adversa, con concepto, estado y detalles disponibles. La referencia al paciente está en `patient`.

**31. ¿Qué es Encounter?**
El contexto de un episodio o interacción de atención, con estado, clase y periodo cuando están informados.

**32. ¿Qué es Procedure?**
Un evento de procedimiento. Su estado permite distinguir realizado, en curso o no realizado; la solicitud se representa por separado.

**33. ¿Qué es Immunization?**
Un registro de evento de inmunización. Hay que mirar el estado antes de afirmar que la vacuna fue administrada.

**34. ¿Qué es Library?**
Un recurso FHIR para describir y contener conocimiento. Aquí guarda CQL, ELM y metadatos de la regla. No representa a un paciente. [Library R4](https://hl7.org/fhir/R4/library.html).

**35. ¿`library` en CQL y `Library` FHIR son lo mismo?**
No. La declaración CQL identifica la biblioteca de lógica. El recurso FHIR empaqueta y describe ese contenido para almacenarlo e intercambiarlo.

**36. ¿Cómo quedan CQL y ELM dentro de Library?**
El mapper genera adjuntos en `content`: `text/cql` y `application/elm+json`, con el contenido en Base64. Base64 codifica; no cifra.

**37. ¿Dónde se guarda el hook de una regla?**
En una extensión propia de Library. Lo mismo ocurre con expresión, texto de card, indicador, activación y ciclo editorial. Son convenciones del RCE.

**38. ¿Library ejecuta la regla por sí sola?**
No. Almacenar conocimiento no lo ejecuta. NestJS recupera ELM y se lo entrega al motor junto con los datos.

**39. ¿Qué es Basic y por qué lo usan?**
Es un recurso para conceptos que requieren representación propia. Aquí soporta overlays, actividad y revisiones de órdenes mediante código y extensiones. Otro sistema necesita conocer esas convenciones para interpretarlo. [Basic R4](https://hl7.org/fhir/R4/basic.html).

**40. ¿Qué es Bundle?**
Un conjunto de recursos con un propósito indicado por su tipo. Una colección, un resultado de búsqueda y una transacción no son lo mismo.

**41. ¿Qué es CapabilityStatement?**
La declaración de capacidades del servidor, consultable por `/metadata`. El proyecto la inspecciona en readiness.

**42. ¿Qué es OperationOutcome?**
Un recurso para informar incidencias de una interacción. No debe confundirse con una recomendación clínica ni con la card.

## C. Campos, códigos y relaciones

**43. ¿Cómo se conecta una observación con el paciente?**
Normalmente mediante `subject.reference`, por ejemplo `Patient/123`. Los nombres de campo dependen del recurso; AllergyIntolerance usa `patient`.

**44. ¿Qué diferencia hay entre id e identifier?**
`id` es la identidad lógica del recurso en su contexto FHIR. `identifier` representa un identificador de negocio, acompañado de su sistema.

**45. ¿Qué son Coding y CodeableConcept?**
Coding expresa una codificación; CodeableConcept puede contener codificaciones y texto. No son recursos independientes. [Tipos de datos](https://hl7.org/fhir/R4/datatypes.html).

**46. ¿Por qué se necesita system además de code?**
Porque el código se interpreta dentro de un sistema terminológico. Un mismo texto o número sin su sistema puede ser ambiguo.

**47. ¿Qué aportan LOINC, SNOMED CT, RxNorm y UCUM?**
En los ejemplos: LOINC identifica observaciones, SNOMED CT condiciones/alergias, RxNorm medicamentos y UCUM unidades. La plantilla compara códigos concretos.

**48. ¿Qué es valueQuantity?**
Una cantidad con valor y unidad. Comparar solo el número sin entender la unidad puede producir una interpretación incorrecta.

**49. ¿Qué significa value[x]?**
Que el estándar permite elegir entre tipos. El JSON usa el nombre concreto, como `valueQuantity` o `valueString`; no escribe literalmente `[x]`.

**50. ¿Qué es un perfil?**
Una definición de cómo usar un recurso en un contexto, restringiendo o precisando elementos y terminología. FHIR base no equivale automáticamente a conformidad con un perfil institucional.

**51. ¿Qué es una extensión?**
Un mecanismo FHIR para agregar información identificada por una URL. Necesita una definición compartida; un nombre propio del RCE no se vuelve universal por estar en una extensión.

**52. ¿Qué diferencia hay entre CodeSystem y ValueSet?**
Un sistema define conceptos; un conjunto de valores selecciona códigos para un uso. Citar un sistema en un recurso no demuestra que el motor pueda expandir cualquier ValueSet.

**53. ¿active significa lo mismo en todos los recursos?**
No. Una condición activa, una solicitud activa y un registro Patient activo describen cosas diferentes.

**54. ¿La fecha de modificación es la fecha clínica?**
No necesariamente. Un resultado puede tener una fecha clínica y haberse registrado o actualizado después.

## D. CQL y comportamiento de las reglas

**55. ¿Qué significa context Patient?**
Que la lógica se evalúa en el contexto de un paciente. El motor recibe el conjunto de datos preparado para ese paciente.

**56. ¿Qué significa define "Aplica"?**
Crea una expresión con ese nombre. La configuración de la regla indica al backend que esa es la expresión que debe ejecutar.

**57. ¿Qué hace exists?**
Comprueba si existe al menos un elemento que cumpla las condiciones. No selecciona automáticamente el más reciente.

**58. ¿Qué hace and en la regla de cuatro hechos?**
Exige que las cuatro condiciones se cumplan para obtener verdadero. Basta un hecho falso para que la conjunción no aplique.

**59. ¿Qué pasa si falta un dato?**
Depende de la expresión: puede producir `null`, una lista vacía u otro resultado. El RCE solo genera card por `true`; resultado ausente genera advertencia.

**60. ¿Para qué sirve Coalesce en la plantilla?**
Proporciona un valor alternativo si el primero es nulo. En la edad del ejemplo convierte un resultado ausente en `false` de forma explícita.

**61. ¿Validar significa que la regla es clínicamente correcta?**
No. Comprueba la traducción y diagnósticos disponibles. La corrección clínica requiere revisión del contenido y pruebas específicas.

**62. ¿Validar, probar y publicar son equivalentes?**
No. Validar traduce; probar ejecuta con un paciente; publicar y activar permite participar en el flujo del hook.

**63. ¿Quién administra la versión?**
El backend normaliza el encabezado CQL y administra versiones. Publicar vuelve a traducir para guardar CQL y ELM coherentes con esa versión.

**64. ¿Puedo editar una regla publicada?**
El guardado de una edición publicada crea un nuevo borrador con otra identidad/versión. Hay que validarlo y publicarlo para usar esa nueva lógica.

**65. ¿Puedo escribir una regla desde cero?**
Sí, el menú tiene En blanco. Eso no garantiza compatibilidad con cualquier dependencia o función CQL: debe validarse y probarse con el runtime disponible.

**66. ¿El texto de la card lo inventa el motor?**
No. En este proyecto proviene de los metadatos de la regla. El motor determina el resultado de la expresión.

**67. ¿Esto utiliza IA generativa para decidir?**
El camino de evaluación mostrado usa reglas CQL explícitas y un motor de ejecución. No consulta un modelo generativo para decidir si la regla aplica.

**68. ¿Por qué no usar simplemente if en TypeScript?**
El objetivo docente es que la lógica pueda escribirse y estudiarse en CQL como artefacto separado. TypeScript coordina el flujo y transforma el resultado en respuesta.

**69. ¿La HbA1c del ejemplo es siempre la última?**
No. La plantilla usa `exists` y no limita antigüedad. Una observación histórica coincidente puede mantener verdadero el criterio.

**70. ¿La plantilla comprueba unidades y todos los medicamentos equivalentes?**
No. La comparación de HbA1c usa el número; metformina usa un código exacto. El ejercicio prepara los datos compatibles y explicita esas limitaciones.

**71. ¿Por qué hay varios .value en el CQL?**
Porque se navega por el modelo tipado FHIR y sus valores primitivos. No significa que debas inventar la misma anidación en el JSON clínico.

## E. Hooks, órdenes y persistencia

**72. ¿Qué es CDS Hooks?**
Una especificación para invocar servicios de soporte a decisiones desde momentos del flujo clínico y recibir respuestas como cards. [CDS Hooks](https://cds-hooks.hl7.org/2.0/).

**73. ¿Qué hooks demuestra el RCE?**
`patient-view`, `order-select` y `order-sign`: ficha, selección de orden y revisión previa a firma.

**74. ¿Qué diferencia hay entre hook y regla?**
El hook identifica cuándo evaluar. La regla establece qué condición debe cumplirse. El título de una regla no cambia su hook configurado.

**75. ¿Qué es discovery?**
El listado de servicios CDS disponibles y sus datos de invocación. Aquí se expone en `GET /api/v1/cds-services`.

**76. ¿Qué son context, hookInstance y prefetch?**
Context describe la situación; hookInstance identifica una invocación; prefetch puede aportar recursos obtenidos previamente por el cliente.

**77. ¿Qué son draftOrders y selections?**
Las órdenes del contexto y las referencias recién seleccionadas. El backend las valida y las convierte en parámetros para las reglas de órdenes.

**78. ¿Selections y DraftOrders son nombres universales de parámetros CQL?**
No. Son los nombres elegidos por esta integración para pasar referencias al motor. Las plantillas los declaran explícitamente.

**79. ¿Pulsar Firmar órdenes ya guarda la orden?**
Ese botón solicita la revisión. La persistencia confirmada ocurre al pulsar Firmar y guardar órdenes.

**80. ¿Dónde se guardan las órdenes confirmadas del sandbox?**
En Basic de revisión/confirmación. Al construir la vista efectiva se materializan como MedicationRequest o ServiceRequest activas.

**81. ¿Si confirmo dos veces se duplica?**
La misma revisión conserva identidad y la confirmación repetida devuelve su resultado. Una revisión nueva no es la misma operación.

**82. ¿Qué pasa si cambian los datos o reglas antes de confirmar?**
El backend reevalúa. Si hay advertencias o cambia la huella de reglas/cards revisadas, exige revisar otra vez. No es un bloqueo general de toda modificación del paciente.

**83. ¿La revisión dura indefinidamente?**
No. El flujo tiene una caducidad de 15 minutos. Además, los cambios en el formulario invalidan la confirmación visible.

**84. ¿La orden se envía a farmacia o laboratorio?**
No en este flujo. Se guarda en el sandbox educativo; no demuestra un circuito institucional ni una firma electrónica asistencial.

**85. ¿Pedir HbA1c hace que la regla de HbA1c alta sea verdadera?**
No por sí solo. Pedir el examen crea una solicitud; la regla de valor alto necesita una Observation que cumpla su criterio.

## F. Preguntas difíciles y diagnóstico

**86. ¿Puedo elegir cualquier paciente?**
Puedes partir de cualquier paciente sintético accesible y preparar el sandbox. Los antecedentes existentes y los recursos recuperados influyen; no prometas idéntico resultado sin preparación.

**87. ¿Por qué hay reglas evaluadas pero no cards?**
Porque pueden devolver falso, no producir resultado o fallar. Hay que mirar advertencias, datos efectivos y expresión; solo contar cards no basta.

**88. ¿Por qué aparecen cero reglas evaluadas?**
Primero revisa publicación, activación, hook y sandbox. Puede que ninguna regla sea elegible para ese momento.

**89. ¿Por qué sigue la card después de quitar un dato?**
Puede existir otro recurso coincidente en los datos base o en los agregados. Quitar un overlay no elimina todas las observaciones o condiciones históricas.

**90. ¿Dos pestañas representan dos alumnos?**
Normalmente no: comparten cookies del mismo perfil. Para demostrar aislamiento usa sesiones realmente separadas.

**91. ¿Un tag de sandbox impide que alguien lea datos directamente en HAPI?**
No por sí solo. El aislamiento lo aplica el backend con la sesión y sus filtros; el tag no es un permiso universal del servidor.

**92. ¿El JSON del visor es exactamente lo persistido en HAPI?**
Puede incluir datos base y recursos materializados desde Basic. Por eso una lectura directa del recurso base no reproduce necesariamente la vista privada.

**93. ¿El visor incluye las órdenes aún no confirmadas?**
No necesariamente. Las órdenes pendientes se incorporan al contexto de revisión; el visor de ficha muestra el conjunto efectivo que construye su endpoint.

**94. ¿Qué hace Patient/$everything?**
Solicita información del paciente disponible en el servidor según capacidades, permisos y parámetros. Puede paginar; no equivale a garantía de historia exhaustiva.

**95. ¿La aplicación recorre toda la paginación?**
El adaptador inspeccionado solicita `_count=200` y no sigue enlaces `next` en ese método. Es un límite que importa con historias grandes.

**96. ¿Actividad CDS equivale a una auditoría formal?**
No. Es trazabilidad pedagógica en Basic. No demuestra un sistema completo de AuditEvent, Provenance, controles institucionales y conservación legal.

**97. ¿El feedback CDS queda auditado?**
El método actual acepta y cuenta entradas. No debe afirmarse persistencia completa del feedback porque la respuesta lo acuse como aceptado.

**98. ¿Soporta cualquier servidor FHIR externo?**
Requiere un endpoint compatible y permisos/capacidades concretos. El flujo usa el HAPI configurado, no cualquier URL enviada dinámicamente por un cliente CDS.

**99. ¿Cumple todos los perfiles y toda la especificación CDS Hooks?**
No se ha demostrado una conformidad universal. La demo implementa recursos R4 y una fachada CDS; las validaciones disponibles no equivalen a certificación.

**100. ¿Qué falta para usarlo con pacientes reales?**
Definir y verificar seguridad institucional, perfiles y terminología, calidad y completitud de datos, validación clínica, auditoría y operación. El modo educativo no acredita esas condiciones.

## Fuentes y alcance

Las respuestas sobre el proyecto proceden de [UiService](../apps/api/src/modules/ui/application/ui.service.ts), [adaptador del traductor](../apps/api/src/modules/cql/infrastructure/cql-translation-http.adapter.ts), [adaptador FHIR](../apps/api/src/modules/fhir/infrastructure/hapi-fhir-http.adapter.ts), [servicio CDS](../apps/api/src/modules/cds-hooks/application/cds-hooks.service.ts), [flujo de órdenes](../apps/api/src/modules/cds-hooks/application/order-workflow.service.ts) y [plantillas](../apps/api/src/modules/cds-hooks/application/order-rule-templates.ts).

Las definiciones y enlaces específicos de los nueve recursos clínicos, terminología, operaciones y restricciones están desarrollados en la [guía completa](./GUIA_APRENDIZAJE_DEMO_HL7_FHIR.md). Esta revisión fue documental y de código; no certifica el estado de un despliegue ni sustituye el ensayo de la demo.
