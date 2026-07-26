# Evidencia de verificacion

## Estructura

```text
docs/evidence/
  M0/
    runs/
      <UTC timestamp>/
        summary.json
        capability-statement.json
        translated-elm.json
        patient-*.response.json
```

Cada directorio de run es inmutable. Una nueva ejecucion crea otro timestamp.

## Reglas

- Guardar respuestas crudas cuando no contengan secretos ni PII.
- Registrar URLs sin tokens ni credenciales.
- Un `status: passed` debe provenir de condiciones comprobadas por el script.
- Un error de red, traduccion o FHIR se registra como `failed`, no se reemplaza por un ejemplo manual.
- Los mocks y screenshots sirven para UX, no para cerrar gates de interoperabilidad.
- No versionar cuerpos con pacientes reales.
