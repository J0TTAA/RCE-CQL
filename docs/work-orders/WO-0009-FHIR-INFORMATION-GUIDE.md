# WO-0009 - Guía informativa de FHIR y reglas en el RCE

## Estado

DONE

## Solicitud

Incorporar una sección del RCE para que profesionales de salud puedan ubicar
los recursos HL7 FHIR en la interfaz, reconocer qué datos se pueden cambiar en
su sandbox y entender cómo esos datos participan en reglas CQL y cards CDS.

## Alcance implementado

- Agrega la ruta `/guide` y el acceso `Guía FHIR` en la navegación principal.
- Describe recursos clínicos y pestañas/vistas del RCE donde se pueden inspeccionar.
- Explica recursos de soporte `Library`, `Basic` y `Bundle` en este prototipo.
- Resume qué variar para probar reglas y en qué momento se ejecuta cada hook.
- Enlaza a Pacientes, creación de reglas y Actividad CDS.
- Aclara el aislamiento por sandbox y que la evaluación no firma órdenes.

## Aceptación

- La guía se puede abrir desde la navegación y `/guide` funciona al recargar.
- El contenido refleja recursos, datos y hooks presentes en el RCE.
- La presentación se adapta a escritorio y móvil y mantiene los flujos existentes.

## Evidencia

Typecheck, build web, validación SDD y navegación en escritorio/móvil se
registraron en `docs/evidence/M2/runs/20261116-fhir-information-guide/summary.md`.

Resultados: [resumen de verificación](../evidence/M2/runs/20261116-fhir-information-guide/summary.md).
