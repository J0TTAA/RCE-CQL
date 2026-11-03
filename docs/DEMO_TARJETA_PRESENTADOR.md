# Tarjeta del presentador — RCE-CQL

> Catálogo actualizado el 3 de noviembre de 2026: los ejemplos anteriores de alergia y diabetes al ordenar ya no están en el selector. Este documento conserva esas explicaciones como material de estudio. Para la demo actual usa el [libreto con las cuatro plantillas vigentes](./LIBRETO_DEMO_PASO_A_PASO.md).


Referencia rápida de la [guía completa](./GUIA_APRENDIZAJE_DEMO_HL7_FHIR.md). Trabaja con un paciente sintético, el mismo navegador y reglas activas del sandbox elegido.

## Apertura de 30 segundos

“Este RCE enseña cómo datos FHIR y reglas CQL producen soporte a decisiones. Escribimos CQL, lo traducimos a ELM y lo guardamos en Library. NestJS reúne los datos del paciente y del sandbox; un motor existente evalúa la regla. Cuando la expresión da verdadero, mostramos una card en el momento correspondiente.”

## Recorrido

1. **Ficha / FHIR JSON:** Patient, Observation, referencia al paciente, sistema/código, valor, unidad y fecha.
2. **Reglas CQL:** crear “Edad al abrir la ficha”, guardar, validar, ver ELM, probar, publicar.
3. **Antes/después:** adulto → card; cambiar a menor → desaparece esa card. Restaurar.
4. **order-select:** alergia activa a penicilina + selección de amoxicilina → revisión. Comparar otra selección.
5. **order-sign:** diabetes activa + solicitud HbA1c → revisar antes de confirmar. Confirmar y mostrar orden guardada.
6. **Actividad CDS:** hook, reglas, recursos considerados, advertencias y cards.
7. **Arquitectura:** HAPI almacena; traductor produce ELM; motor en NestJS evalúa.

## Correspondencias esenciales

| Lo que describes | Recurso / mecanismo |
| --- | --- |
| Paciente | Patient |
| Resultado medido | Observation |
| Problema clínico | Condition |
| Solicitud de medicamento | MedicationRequest |
| Solicitud de examen/procedimiento | ServiceRequest |
| Alergia | AllergyIntolerance |
| Atención | Encounter |
| Evento de procedimiento | Procedure; revisar su estado |
| Evento de inmunización | Immunization; revisar su estado |
| Regla persistida | Library |
| Cambios privados, actividad y revisión de órdenes | Basic con convenciones propias |
| Conjunto de recursos | Bundle; revisar su tipo |
| Resultado de la decisión visible | Card CDS Hooks; no es un recurso FHIR |

## Frases que evitan confusiones

- “Validar traduce; probar ejecuta con datos; publicar y activar permite participar en el hook.”
- “La solicitud del examen no es su resultado.”
- “El visor muestra recursos efectivos del sandbox; algunos se construyen desde Basic.”
- “El hook marca cuándo evaluar; CQL decide si la condición aplica.”
- “No tener card no prueba normalidad: revisamos también advertencias y reglas evaluadas.”
- “La plantilla usa códigos exactos y `exists`; puede encontrar un resultado histórico.”
- “Compartir la regla no comparte mis cambios privados del paciente.”
- “Confirmar órdenes en el sandbox no envía recetas a una farmacia.”

## Si algo falla

**Cero reglas:** revisar hook, publicación, activación y sesión.

**Reglas sin cards:** revisar datos efectivos, códigos, estados y advertencias.

**Card persiste al bajar un valor:** buscar otros recursos coincidentes; `exists` no elige automáticamente el último.

**Orden perdida:** distinguir pendiente de confirmada y comprobar el mismo sandbox.

**Sin conexión:** comprobar `health/live` y `health/ready`; no atribuir un problema de infraestructura a CQL.

## Cierre

“La demo conecta representación FHIR, lógica CQL y momentos CDS Hooks. Permite experimentar con datos sintéticos y observar la relación entre cambios y resultados. Las reglas y el almacenamiento de sandbox tienen simplificaciones explícitas; una integración asistencial requiere completar perfiles, seguridad, terminología y validación.”
