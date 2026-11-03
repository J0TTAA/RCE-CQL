# Plantillas docentes y flujo de órdenes

El selector ofrece **En blanco** y **cuatro reglas**. Sustituye las antiguas plantillas de alergia y diabetes al ordenar; no elimina las Library ya creadas por los usuarios.

| Plantilla | Hook | Caso positivo | Caso negativo |
| --- | --- | --- | --- |
| Simple · patient-view: paciente adulto | patient-view | Nacimiento 1980-01-01 | Nacimiento 2012-01-01 |
| Simple · order-select: amoxicilina | order-select | Seleccionar amoxicilina | Seleccionar lisinopril |
| Simple · order-sign: solicitud de HbA1c | order-sign | Revisar firma con HbA1c pendiente | Revisar solo creatinina |
| Completa · patient-view: diabetes, HbA1c y metformina | patient-view | Adulto, diabetes activa, HbA1c 7,2 %, metformina activa | Cambiar solo la edad a menor |

## Preparar y publicar

**Reglas CQL → Nueva regla → Punto de partida → elegir plantilla → Crear regla → Guardar → Validar → Publicar**. Comprobar activación en Mi sandbox. La interfaz asigna el nombre de la regla; el backend administra su versión. La opción En blanco comienza con Aplica = false.

## Demostrar order-select

1. Publicar **Simple · order-select: amoxicilina**.
2. Abrir cualquier paciente sintético. No se requiere alergia.
3. **Recetar / indicar → Amoxicilina 500 mg → Agregar a órdenes pendientes**.
4. La revisión de selección muestra la card de esa regla.
5. Retirar amoxicilina y agregar lisinopril: esa card no aparece. Pueden existir cards de otras reglas.
6. Retirar la orden pendiente antes de iniciar la siguiente escena.

## Demostrar order-sign

1. Publicar **Simple · order-sign: solicitud de HbA1c**.
2. Agregar HbA1c desde Recetar / indicar. No se requiere diabetes.
3. Al agregar se ejecuta order-select. Pulsar **Firmar órdenes** para ejecutar order-sign y ver su card.
4. **Firmar y guardar órdenes** confirma la solicitud en el sandbox; no crea un resultado medido.
5. En otra revisión, dejar solo creatinina pendiente: la regla de HbA1c no aplica, aunque haya una solicitud histórica ya confirmada.

El [libreto](./LIBRETO_DEMO_PASO_A_PASO.md) contiene el CQL completo y lo que se debe decir y hacer para los cuatro ejemplos.

## Detalles para escribir otras reglas

Las recetas se representan como `MedicationRequest` R4, las solicitudes de
examenes o procedimientos como `ServiceRequest`. Una orden de procedimiento
no es un `Procedure` realizado.

El servicio entrega las ordenes pendientes al bundle efectivo del paciente.
Para distinguirlas de las ordenes historicas, estan disponibles estos parametros
de la integracion RCE-CQL (no son parametros obligatorios definidos por CDS Hooks):

```cql
parameter Selections List<String>
parameter DraftOrders List<String>
```

- `Selections`: referencias seleccionadas en `order-select`, como
  `MedicationRequest/identificador`. En `order-sign` es una lista vacia.
- `DraftOrders`: referencias de todas las ordenes del contexto, para ambos hooks.
- Consulta `[MedicationRequest]` o `[ServiceRequest]` y filtra por la referencia.
- Puedes combinar ordenes con edad, condiciones, alergias y observaciones del paciente.

Las plantillas no usan `default {}`: se detecto un fallo de validacion de listas
en `cql-execution` 3.3.2 cuando se entrega un parametro no vacio con ese default.
Declarar el tipo sin default evita ese fallo. No se modifica el ELM generado.

La validacion del CQL solo comprueba la traduccion. Para observar cards en el
flujo clinico, publica y activa la regla en tu sandbox y usa **Recetar / indicar**:
agregar una orden ejecuta `order-select`; pulsar **Firmar órdenes** ejecuta
`order-sign` antes de guardar. Las cards aparecen en el resultado de cada momento.

## Confirmacion y aislamiento

El navegador conserva la lista pendiente mientras la ficha esta abierta. Al salir
de la ficha o recargarla se pierde ese formulario pendiente. Las revisiones previas
a firma se guardan con caducidad de 15 minutos. Cambiar el formulario invalida
la confirmacion visible y exige revisar otra vez.

Nest reevalua al confirmar. Si hay errores o cambian las reglas/cards revisadas,
rechaza la confirmacion y pide una nueva revision. Confirmar una misma revision
dos veces no duplica las ordenes.

HAPI almacena la revision en `Basic`, con etiqueta del sandbox. Solo las revisiones
confirmadas se materializan como ordenes activas en el bundle efectivo. El RCE
no escribe recetas en el paciente base ni las envia a farmacias. Reiniciar el
sandbox permite comenzar otro ejercicio. El catalogo es intencionalmente limitado;
el endpoint CDS admite `MedicationRequest` y `ServiceRequest` con conceptos codificados.

## Contrato HTTP

- `GET /api/v1/cds-services`: discovery de los tres servicios.
- `POST /api/v1/cds-services/rce-order-select`: requiere `hook`, `hookInstance`,
  `context.userId`, `context.patientId`, `context.draftOrders` y `context.selections`.
- `POST /api/v1/cds-services/rce-order-sign`: requiere los mismos campos salvo
  `selections`. Devuelve `cards`; la firma se persiste solo despues de que el
  usuario las revise y pulse **Firmar y guardar órdenes**.
- La ficha usa `/api/v1/ui/orders/:patientId/review` para construir ese contexto
  FHIR en Nest y delegar al mismo servicio de evaluacion CDS, conservando ademas
  la actividad docente. No hace una llamada HTTP interna entre modulos de Nest.
- La API usa el HAPI configurado y la cookie del aula. No implementa autorizacion
  SMART ni conexion dinamica a cualquier `fhirServer` enviado por otro RCE.

Se comprueban los recursos soportados, identidad, conceptos codificados, paciente,
estado y selecciones. Esto no sustituye una validacion completa de perfiles FHIR
institucionales ni declara conformidad universal con CDS Hooks.

## Otras opciones oficiales investigadas

| Hook | Posible actividad docente | Estado en la biblioteca consultada | Estado del RCE |
| --- | --- | --- | --- |
| `encounter-start` | Iniciar una atencion y revisar antecedentes | Madurez 1, submitted | Pendiente |
| `problem-list-item-create` | Agregar un problema a la lista del paciente | Draft, madurez 1 | Pendiente |
| `allergyintolerance-create` | Revisar una nueva alergia antes de finalizarla | Madurez 1, submitted | Pendiente |

Un sintoma puede documentarse como `Condition` o `Observation`, segun su naturaleza
y uso. No todo cambio de datos equivale a un hook de creacion de problema. El RCE
mantiene la reevaluacion de la ficha tras guardar datos; no inventa un hook
estandar llamado `symptom-change`. `medication-prescribe` esta deprecado; las
opciones actuales para este flujo son `order-select` y `order-sign`.

## Verificacion automatizada

Con el RCE, HAPI, traductor y pacientes sinteticos disponibles, usando Node de la
version requerida por el repositorio:

```sh
node scripts/order-hooks-smoke.mjs --synthetic-patient-id ID_DEL_PACIENTE
```

Para acceder por la URL web/proxy:

```sh
node scripts/order-hooks-smoke.mjs --synthetic-patient-id ID_DEL_PACIENTE --base https://rce.ejemplo.cl/api/v1
```

Los comandos son iguales en Linux, macOS y PowerShell. El script crea dos sesiones
anonimas nuevas, valida/publica las plantillas contra el traductor y HAPI reales,
comprueba cards positivas/negativas, confirmacion repetida y aislamiento. Solo debe
ejecutarse con pacientes sinteticos. Las pruebas unitarias con gateway en memoria
no sustituyen este smoke test de integracion.

## Fuentes oficiales

Consultadas el 14 de septiembre de 2026; biblioteca CDS Hooks 1.0.1 basada en FHIR R4:

- [Order Select](https://cds-hooks.hl7.org/hooks/order-select.html): momento de seleccion, `selections` y `draftOrders`.
- [Order Sign](https://cds-hooks.hl7.org/hooks/order-sign.html): evaluacion previa a firma y deprecacion de hooks antiguos.
- [Encounter Start](https://cds-hooks.hl7.org/hooks/encounter-start.html).
- [Problem List Item Create](https://cds-hooks.hl7.org/hooks/problem-list-item-create.html).
- [AllergyIntolerance Create](https://cds-hooks.hl7.org/hooks/allergyintolerance-create.html).
- [FHIR R4 MedicationRequest](https://hl7.org/fhir/R4/medicationrequest.html).
- [FHIR R4 ServiceRequest](https://hl7.org/fhir/R4/servicerequest.html).
- [FHIR R4 Condition](https://hl7.org/fhir/R4/condition.html).
- [CQL: Translation Semantics](https://cql.hl7.org/06-translationsemantics.html): papel de ELM. El proyecto mantiene las versiones fijadas de su traductor y motor.
