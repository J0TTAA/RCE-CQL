# Libreto de demo — cuatro plantillas listas

## Antes de presentar

Elegir un paciente sintético y mantener la misma sesión. En **Nueva regla → Punto de partida** quedan **En blanco** y cuatro reglas. Para cada regla: seleccionar la plantilla → **Crear regla → Guardar → Validar → Publicar** y comprobar que esté activa en **Mi sandbox**. El CQL, el hook y el mensaje se cargan automáticamente; no hace falta pegarlos.

Las Library que ya creaste conservan su contenido. Si tienes ejemplos antiguos activos, desactiva los que no quieras mostrar para evitar cards adicionales.

## Apertura

**DECIR:** “Este RCE permite escribir CQL, traducirlo a ELM y guardarlo en Library. NestJS reúne los datos FHIR y los cambios del sandbox, y un motor existente evalúa la regla. Si devuelve verdadero, aparece una card. Voy a mostrar los tres hooks y una regla que combina varios hechos.”

## 1. Simple · patient-view: paciente adulto

**HACER:** Abrir esta regla y mostrar el CQL y **Ver ELM**. En la ficha, **Editar dato → nacimiento 1980-01-01 → Guardar cambios**. Mostrar la card de adulto.

**DECIR:** “Esta regla usa patient-view. Al abrir o reevaluar la ficha comprueba si el paciente es adulto.”

**HACER:** Cambiar nacimiento a **2012-01-01**, guardar y comprobar que desaparece esa card. Restaurar **1980-01-01**.

**DECIR:** “Cambió el dato; la misma regla ahora devuelve falso.”

```cql
library RceDemoAdulto version '0.1.0'
using FHIR version '4.0.1'
context Patient

define "Aplica":
  AgeInYears() >= 18
```

## 2. Simple · order-select: amoxicilina

**HACER:** **Recetar / indicar → Amoxicilina 500 mg → Agregar a órdenes pendientes**. Esperar la revisión y mostrar su card. No hace falta registrar alergias.

**DECIR:** “order-select recibe lo que acabo de seleccionar. Esta regla muestra una card cuando la selección incluye amoxicilina.”

**HACER:** Retirar amoxicilina, agregar **Lisinopril** y comprobar que esa card no aparece en la nueva revisión. Retirar lisinopril antes de continuar.

**DECIR:** “La otra selección no cumple la condición de esta regla.”

```cql
library RceDemoSeleccion version '0.1.0'
using FHIR version '4.0.1'
parameter Selections List<String>
context Patient

define "Aplica":
  exists ([MedicationRequest] M
    let MedicationCode: M.medication as FHIR.CodeableConcept
    where ('MedicationRequest/' + M.id.value) in Selections
      and exists (MedicationCode.coding C
        where C.system.value = 'http://www.nlm.nih.gov/research/umls/rxnorm'
          and C.code.value = '308182'))
```

## 3. Simple · order-sign: solicitud de HbA1c

**HACER:** Dejar vacías las órdenes pendientes. Agregar **Hemoglobina glicosilada (HbA1c)**. No hace falta registrar diabetes. Pulsar **Firmar órdenes** y mostrar su card.

**DECIR:** “Esta regla se evalúa en order-sign, antes de confirmar. Encuentra una solicitud de HbA1c entre las órdenes pendientes.”

**HACER:** **Firmar y guardar órdenes**. Mostrar la solicitud guardada y **FHIR JSON → ServiceRequest**.

**DECIR:** “Confirmamos una solicitud en el sandbox, no un resultado de laboratorio. La persistencia se apoya en Basic y aquí vemos la ServiceRequest efectiva.”

**HACER:** Iniciar otra revisión con solo **Creatinina** pendiente. Pulsar **Firmar órdenes** y comprobar que no aparece la card de HbA1c. Volver sin confirmar y retirar creatinina.

**DECIR:** “La solicitud de HbA1c ya confirmada no es una orden pendiente de esta revisión.”

```cql
library RceDemoFirma version '0.1.0'
using FHIR version '4.0.1'
parameter DraftOrders List<String>
context Patient

define "Aplica":
  exists ([ServiceRequest] O
    where ('ServiceRequest/' + O.id.value) in DraftOrders
      and exists (O.code.coding C
        where C.system.value = 'http://loinc.org' and C.code.value = '4548-4'))
```

## 4. Completa · patient-view: diabetes, HbA1c y metformina

**HACER:** En **Editar dato**, dejar nacimiento **1980-01-01**, **diabetes activa**, **HbA1c 7,2 %** y **metformina activa**. Guardar y mostrar la card de cuatro hechos.

**DECIR:** “Esta regla de patient-view combina Patient, Condition, Observation y MedicationRequest. Exige que coincidan los cuatro criterios.”

**HACER:** Cambiar únicamente el nacimiento a **2012-01-01**. Guardar y comprobar que desaparece la card de cuatro hechos. Restaurar la fecha adulta.

**DECIR:** “Con uno de los criterios falso, la regla completa deja de aplicar.”

```cql
library RceDemoCompleta version '0.1.0'
using FHIR version '4.0.1'
context Patient

define "EsAdulto":
  Coalesce(AgeInYears() >= 18, false)

define "DiabetesActiva":
  exists ([Condition] C
    where exists (C.code.coding CodingEntry
      where CodingEntry.system.value = 'http://snomed.info/sct'
        and CodingEntry.code.value = '44054006')
      and exists (C.clinicalStatus.coding ClinicalStatus
        where ClinicalStatus.code.value = 'active'))

define "HbA1cElevada":
  exists ([Observation] O
    where exists (O.code.coding CodingEntry
      where CodingEntry.system.value = 'http://loinc.org'
        and CodingEntry.code.value = '4548-4')
      and O.status.value = 'final'
      and (O.value as FHIR.Quantity).value.value >= 6.5)

define "MetforminaActiva":
  exists ([MedicationRequest] M
    let MedicationCode: M.medication as FHIR.CodeableConcept
    where exists (MedicationCode.coding CodingEntry
      where CodingEntry.system.value = 'http://www.nlm.nih.gov/research/umls/rxnorm'
        and CodingEntry.code.value = '860975')
      and M.status.value = 'active')

define "Aplica":
  "EsAdulto" and "DiabetesActiva" and "HbA1cElevada" and "MetforminaActiva"
```

**NOTA PARA PREPARAR:** La regla completa busca cualquier HbA1c final coincidente, no necesariamente la última, y compara el número sin comprobar su unidad. Preparar el ejercicio en porcentaje. Cambiar la edad es el caso negativo más directo, porque pueden existir resultados o diagnósticos históricos adicionales.

## Cierre

**HACER:** **Actividad CDS → Paso a paso** de una ejecución reciente.

**DECIR:** “Aquí comprobamos el hook, las reglas evaluadas y las cards. Los ejemplos simples muestran cada momento por separado; el completo muestra cómo combinar hechos FHIR sin cambiar el motor.”

## Si no aparece la card esperada

Comprobar **hook → publicada → activa → mismo sandbox → datos/contexto → advertencias en Actividad CDS**. Las reglas de órdenes se prueban desde **Recetar / indicar**, que entrega los parámetros Selections y DraftOrders; probar solo un paciente desde el editor no reproduce ese contexto.
