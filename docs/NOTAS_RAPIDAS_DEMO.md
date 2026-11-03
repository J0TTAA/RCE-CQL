# Notas rápidas — nuevo catálogo

[Libreto con códigos y pasos](./LIBRETO_DEMO_PASO_A_PASO.md)

**Selector:** En blanco + tres reglas simples + una completa.

**Publicar:** elegir plantilla → Crear regla → Guardar → Validar → Publicar → comprobar activa en Mi sandbox.

| Regla | Mostrar | Cambiar para que no aplique |
| --- | --- | --- |
| Adulto / patient-view | Nacimiento 1980-01-01 | Nacimiento 2012-01-01 |
| Amoxicilina / order-select | Agregar amoxicilina; no requiere alergia | Retirar y seleccionar lisinopril |
| HbA1c / order-sign | HbA1c pendiente → Firmar órdenes; no requiere diabetes | Revisar solo creatinina |
| Completa / patient-view | Adulto + diabetes + HbA1c 7,2 % + metformina | Cambiar edad a menor |

**Decir al abrir:** “CQL se traduce a ELM y se guarda en Library. NestJS combina datos FHIR y sandbox; el motor evalúa y genera una card si la expresión es verdadera.”

**Ordenes:** Firmar órdenes = revisar. Firmar y guardar = confirmar. Solicitud ≠ resultado.

**Datos:** HAPI almacena; NestJS ejecuta con el motor existente. La vista efectiva incorpora cambios guardados en Basic.

**Si falla:** hook, publicación, activación, sandbox, datos y advertencias.

**Cierre:** Actividad CDS → Paso a paso. “Los tres hooks reutilizan el mismo flujo; la regla completa combina varios hechos.”

**Recordar:** retirar pendientes entre escenas y restaurar la fecha adulta. La regla completa usa exists: puede encontrar una observación histórica.
