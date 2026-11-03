# Libreto de demostracion: RCE CQL y HL7 FHIR

> Catálogo actualizado el 3 de noviembre de 2026: los ejemplos anteriores de alergia y diabetes al ordenar ya no están en el selector. Este documento conserva esas explicaciones como material de estudio. Para la demo actual usa el [libreto con las cuatro plantillas vigentes](./LIBRETO_DEMO_PASO_A_PASO.md).


Duracion sugerida: 15-20 minutos. Audiencia: docente, jefatura o alumnos que
conocen la idea de CQL y ELM, pero quieren ver el flujo completo en pantalla.
Usar exclusivamente pacientes sinteticos. Las reglas de ejemplo son ejercicios
docentes, no recomendaciones clinicas para uso real.

## Preparacion antes de compartir pantalla

1. Verificar que web, API, HAPI y traductor esten operativos. Abrir la URL que
   realmente usara la audiencia y confirmar que carga la lista de pacientes.
2. Mantener el mismo navegador durante la demo: el codigo `S-....` identifica
   el sandbox de esa sesion. No reiniciar el sandbox a mitad del recorrido.
3. Elegir un paciente sintetico y tener tres reglas publicadas y activas en
   **Mi sandbox**: **Edad al abrir la ficha** (`patient-view`), **Amoxicilina y
   alergia al seleccionar** (`order-select`) y **HbA1c y diabetes antes de
   firmar** (`order-sign`). Se puede crear la primera en vivo y dejar las otras
   dos preparadas para ahorrar tiempo. Revisar el campo **Hook**: el titulo de
   una regla no determina cuando se ejecuta.
4. Para mostrar resultados predecibles, preparar en **Editar dato**: fecha de
   nacimiento adulta para la primera card, alergia activa a penicilina para
   `order-select` y condicion activa de diabetes mellitus para `order-sign`.
   Los tres cambios son del sandbox, no del paciente base de Synthea.
5. Si se mostrara acceso remoto, comprobar antes que la URL HTTPS y el acceso
   autorizado funcionen desde otro equipo. No mostrar en pantalla claves,
   cookies o secretos. Mantener un plan alternativo con la URL local.

## 1. Apertura: que estamos mostrando (1 minuto)

**En pantalla:** inicio y menu lateral.

**Decir:** "Este es un RCE educativo. No se conecta a pacientes reales: usa
pacientes sinteticos y permite cambiar sus datos dentro de un sandbox. La idea
es ver como una regla escrita en CQL utiliza datos clinicos en formato HL7 FHIR
y produce una card en un momento concreto del trabajo clinico."

**Aclaracion util:** HL7 es la organizacion y familia de estandares; FHIR es el
estandar que usamos para representar e intercambiar datos, CQL describe la
logica, y CDS Hooks define los momentos de invocacion y la forma de devolver
cards. HAPI es el servidor FHIR de esta instalacion, no el motor que ejecuta
las reglas.

## 2. Ficha del paciente: los recursos FHIR (2 minutos)

**Clics:** **Pacientes** > abrir el paciente sintetico elegido > recorrer
**resumen**, **condiciones**, **observaciones**, **medicamentos**, **alergias**,
**encuentros**, **procedimientos**, **inmunizaciones** y **Ordenes CDS**.

**Decir:** "No son tablas inventadas solo para la interfaz. La API consulta
recursos FHIR R4 en HAPI y arma la ficha. `Patient` identifica al paciente;
`Condition` representa problemas o diagnosticos; `Observation` representa
mediciones y resultados; `AllergyIntolerance` registra alergias;
`Encounter` representa atenciones; `Immunization`, vacunas administradas;
`Procedure`, procedimientos realizados. Una receta u orden de medicamento es
`MedicationRequest`; pedir un examen o procedimiento es `ServiceRequest`."

**Señalar:** "Una solicitud de HbA1c no es un resultado de HbA1c: la solicitud
es `ServiceRequest` y el resultado, cuando exista, seria `Observation`. Del
mismo modo, ordenar un procedimiento no significa que ya exista `Procedure`."

**Clics adicionales:** abrir **FHIR JSON**, filtrar por **Patient** u
**Observation** y expandir un recurso. "Esta es la representacion FHIR R4
efectiva que usa el ejercicio: los recursos base del paciente mas mis cambios
del sandbox. Podemos inspeccionar cada recurso completo sin editar JSON ni
salir del RCE." Tras firmar una orden en la escena 6, volver aqui y filtrar
por **ServiceRequest** para ver su estado `active`.

## 3. De CQL a ELM y a una card (4 minutos)

**Clics:** **Reglas CQL** > **Nueva regla** > en el modal **Punto de partida**
elegir **Edad al abrir la ficha** > **Crear regla**. Mostrar el CQL, el campo
**Hook: patient-view**, **Expresion booleana: Aplica**, y la metadata de la card.
Pulsar **Guardar** > **Validar** > **Ver ELM** > **Probar** con el paciente
elegido > **Publicar**. Si la regla no queda activa, activarla en el catalogo.

**Decir:** "El autor escribe CQL, que es legible para personas. Al validar, el
backend envia ese texto al servicio traductor y recibe ELM: una representacion
estructurada de la misma logica. Por eso no ejecutamos el texto CQL directamente.
El ELM es la entrada que entiende el motor `cql-execution`, junto con
`cql-exec-fhir` para leer recursos FHIR. El backend guarda la version de la
regla como `Library` FHIR en HAPI, con CQL y ELM. Validar prueba la traduccion;
**Probar** evalua la regla con un paciente; **Publicar y activar** permite que
participe en el hook real. Son pasos distintos."

**En pantalla:** volver a la ficha o pulsar **Reevaluar**.

**Decir:** "Al abrir esta ficha se dispara `patient-view`. NestJS reune los
datos del paciente, los cambios de este sandbox y las reglas activas para ese
hook. El motor evalua ELM; si `Aplica` es verdadero, el servicio devuelve una
card CDS con resumen, detalle, indicador y fuente. Si es falso, la respuesta
puede ser `cards: []`: eso no es un error."

**Resultado esperado:** con fecha de nacimiento adulta, aparece la card de
edad. Para mostrar causalidad, cambiar la fecha en **Editar dato** a una edad
menor de 18, guardar y reevaluar: esa card deja de aplicar. Restaurar edad
adulta si se usara el mismo paciente en las siguientes escenas.

## 4. Sandbox y aislamiento (1 minuto)

**Clics:** mostrar el codigo `S-....` de la cabecera y la etiqueta **Mi
sandbox**; abrir **Editar dato** y señalar el cambio guardado.

**Decir:** "Todos pueden partir del mismo paciente sintetico, pero cada
navegador tiene su propio sandbox. Una modificacion de este alumno no cambia el
paciente base ni contamina el ejercicio del siguiente. El backend guarda esos
cambios como overlay asociado al sandbox en HAPI y los materializa como
recursos FHIR efectivos cuando evalua CQL. El docente tambien puede compartir
reglas; los alumnos pueden crear y activar reglas propias en su sandbox."

**Opcional, solo si hay tiempo:** abrir una ventana privada y comparar el codigo
`S-....` y la ausencia de los cambios del primer navegador.

## 5. `order-select`: alerta al elegir una receta (3 minutos)

**Preparacion:** confirmar que **Amoxicilina y alergia al seleccionar** esta
publicada, activa y tiene **Hook: order-select**. En el paciente, usar **Editar
dato** para dejar **Alergia: Penicilina**, estado **Activo**.

**Clics:** en la ficha pulsar **Recetar / indicar** > seleccionar **Amoxicilina
500 mg (capsula)** > **Agregar a ordenes pendientes**. Esperar la revision
**Revisión al agregar la orden**.

**Decir:** "Este es otro momento clinico. `order-select` ocurre al seleccionar
la orden, antes de firmarla. La receta pendiente se representa como
`MedicationRequest`; la alergia es `AllergyIntolerance`. La regla CQL une
ambos hechos y devuelve una card para revisar. Aqui no se receta de forma
automatica: la decision y la confirmacion siguen en manos de la persona."

**Resultado esperado:** card de revision de alergia. Si se quita amoxicilina y
se selecciona otro medicamento no cubierto por esa regla, esa card no deberia
aparecer, aunque otra regla activa podria mostrar una card distinta.

## 6. `order-sign`: revisar antes de guardar (3 minutos)

**Preparacion:** confirmar que **HbA1c y diabetes antes de firmar** esta
publicada, activa y tiene **Hook: order-sign**. Dejar **Condicion activa:
diabetes mellitus** en **Editar dato**. Si quedo una orden anterior pendiente,
retirarla para que el ejemplo sea facil de leer.

**Clics:** **Recetar / indicar** > seleccionar **Hemoglobina glicosilada
(HbA1c)** > **Agregar a ordenes pendientes** > **Firmar ordenes** > esperar
**Revisión previa a la firma** > leer la card > **Firmar y guardar ordenes** >
mostrar **Ordenes guardadas en mi sandbox** y la pestaña **Ordenes CDS**.

**Decir:** "Al agregar HbA1c se ejecuta `order-select`, no la regla de firma.
Ahora, al intentar firmar, se ejecuta `order-sign` con el conjunto completo de
ordenes pendientes. La regla ve un `ServiceRequest` de HbA1c y una `Condition`
de diabetes; por eso aparece la card antes de guardar. Solo despues de revisar
y confirmar queda una orden activa en este sandbox. No se creo un resultado de
laboratorio ni se envio una receta a una farmacia."

**Punto importante:** no confundir **Firmar ordenes**, que pide la revision,
con **Firmar y guardar ordenes**, que confirma la persistencia. Si cambia el
formulario despues de revisar, hay que revisar otra vez. Las ordenes aun
pendientes viven en la ficha abierta; recargarla descarta ese formulario. Las
ordenes ya confirmadas deben seguir visibles en el mismo sandbox.

## 7. Actividad CDS y arquitectura (2 minutos)

**Clics:** **Actividad CDS** > buscar las ejecuciones recientes > **Paso a
paso** de una de ellas.

**Decir:** "Aqui se ve que hook se invoco, cuando, para que paciente, en que
sandbox, que tipos de recursos se consideraron, que reglas se evaluaron y
cuantas cards salieron. Sirve para explicar por que aparecio o no aparecio una
recomendacion; no basta con ver una card aislada."

**Resumen de arquitectura para decir mirando la pantalla:**

```text
Navegador RCE
   -> API NestJS
      -> HAPI FHIR R4: pacientes, recursos, Library y datos del sandbox
      -> Traductor CQL: CQL -> ELM al validar/publicar
      -> Motor cql-execution + cql-exec-fhir: ELM + datos FHIR -> Boolean
   -> Servicio CDS Hooks: Boolean verdadero -> card; falso -> sin card
   -> Navegador: muestra la card en patient-view, order-select u order-sign
```

**Aclarar:** "La API es la unica intermediaria del frontend. El navegador no
consulta HAPI ni llama al traductor directamente. HAPI almacena y entrega FHIR;
en esta instalacion la evaluacion ELM ocurre en el backend, no dentro de HAPI."

## Ampliacion opcional: reglas libres y mas recursos (2-3 minutos)

**Clics:** volver a **Reglas CQL > Nueva regla** y mostrar que el punto de
partida tambien puede ser **En blanco**. Sin necesidad de publicarla en esta
demo, enseñar la plantilla **Diabetes: cuatro hechos clinicos** o sus cuatro
expresiones: edad, `Condition` de diabetes activa, `Observation` de HbA1c alta
y `MedicationRequest` de metformina activa.

**Decir:** "No estamos limitados a una condicion simple ni a una lista fija
de reglas programadas en TypeScript. Esta regla combina cuatro recursos o
hechos FHIR en CQL; el motor evalua la expresion `Aplica` sobre el paciente
efectivo del sandbox. `En blanco` permite escribir otra regla CQL desde cero.
Las inmunizaciones tambien se ven y se pueden modificar como recursos
`Immunization`; una regla puede consultarlas, pero esta demo no presupone que
exista una card de inmunizacion ya publicada."

**Si preguntan por roles:** "El modo docente permite administrar y compartir
reglas del aula; el alumno puede trabajar con reglas y datos propios en su
sandbox. Compartir una regla no comparte las modificaciones del paciente."

## 8. Cierre (30 segundos)

**Decir:** "La maqueta permite enseñar el ciclo completo: datos HL7 FHIR,
regla CQL, traduccion a ELM, evaluacion sobre un paciente y una card activada
en el momento correcto. Ademas, el sandbox deja que varios alumnos experimenten
sin alterar el paciente original. Es una plataforma educativa, no un sistema
clinico validado para atender pacientes reales."

## Si algo no aparece durante la demo

- **`0 reglas evaluadas`:** comprobar que la regla este publicada y activa en
  el sandbox correcto, y que su campo **Hook** sea exactamente el de la accion
  (`patient-view`, `order-select` u `order-sign`). El nombre "order sign" por
  si solo no cambia el hook configurado.
- **Hay reglas evaluadas, pero no hay card:** la expresion CQL puede haber dado
  falso. Revisar edad, estado activo, codigos y orden seleccionada; abrir
  **Actividad CDS > Paso a paso**. Una respuesta sin cards es valida.
- **La card tarda:** esperar a que termine la revision antes de firmar o cambiar
  de pantalla. No afirmar que guardo hasta ver confirmacion y la orden en la
  lista del sandbox.
- **La orden no aparece tras recargar:** comprobar si se pulso **Firmar y
  guardar ordenes**. La lista pendiente no es una orden confirmada; si esta
  confirmada, revisar el mismo sandbox y el estado de API/HAPI.
- **Problema de acceso remoto:** verificar primero la URL local y luego el
  tunel/HTTPS y el permiso de acceso. Un fallo de red no implica que la regla
  CQL este mal.

## Referencias tecnicas

- [FHIR R4, indice de recursos](https://hl7.org/fhir/R4/resourcelist.html).
- [CQL: semantica de traduccion a ELM](https://cql.hl7.org/2019May/06-translationsemantics.html).
- [CDS Hooks: `patient-view`](https://cds-hooks.hl7.org/hooks/patient-view.html),
  [`order-select`](https://cds-hooks.hl7.org/hooks/order-select.html) y
  [`order-sign`](https://cds-hooks.hl7.org/hooks/order-sign.html).
- Detalles implementados en este repositorio:
  [flujos de ordenes](./CDS_HOOKS_WORKFLOWS.md),
  [CDS Hooks](./CDS_HOOKS_STANDARD.md) y
  [demo de edad](./AGE_RULE_DEMO.md).
