# CDS Hooks estandar y reglas CQL libres

## Objetivo

Exponer el RCE como CDS Service compatible con CDS Hooks, reutilizando la
evaluacion CQL/FHIR existente y manteniendo el aislamiento por sandbox anonimo.

## Endpoints

Con la configuracion local por defecto, el `baseUrl` CDS Hooks es:

```text
http://localhost:3000/api/v1
```

Discovery:

```bash
curl -s http://localhost:3000/api/v1/cds-services | jq
```

Invocacion `patient-view`:

```bash
curl -s -X POST http://localhost:3000/api/v1/cds-services/rce-patient-view \
  -H 'Content-Type: application/json' \
  -d '{
    "hook": "patient-view",
    "hookInstance": "d1577c69-dfbe-44ad-ba6d-3e05e953b2ea",
    "fhirServer": "http://localhost:8080/fhir",
    "context": {
      "userId": "Practitioner/rce-teacher",
      "patientId": "<FHIR_PATIENT_ID>"
    }
  }' | jq
```

Respuesta esperada cuando ninguna regla aplica:

```json
{
  "cards": []
}
```

Respuesta esperada cuando una regla aplica:

```json
{
  "cards": [
    {
      "uuid": "card-rce-rule-example",
      "summary": "Sospecha de diabetes por HbA1c",
      "detail": "El paciente adulto tiene HbA1c mayor o igual a 6.5%.",
      "indicator": "critical",
      "source": {
        "label": "RceDiabetesRiskHba1c 0.1.0"
      }
    }
  ]
}
```

## Servicios publicados

| Service ID | Hook | Estado |
| --- | --- | --- |
| `rce-patient-view` | `patient-view` | Implementado para reglas por paciente |
| `rce-order-select` | `order-select` | Ordenes pendientes y seleccion actual en `context` |
| `rce-order-sign` | `order-sign` | Revision de ordenes pendientes antes de confirmar |

La ficha tiene **Recetar / indicar** con medicamentos, examenes y procedimientos.
Los hooks de orden requieren `context.draftOrders`; `order-select` ademas requiere
`context.selections`. Se aceptan `MedicationRequest` y `ServiceRequest` R4.
Si se envia `prefetch`, Nest incorpora esos recursos solo para esa evaluacion;
las ordenes del contexto tienen prioridad ante referencias coincidentes.
Consulta [flujos y ejercicios](./CDS_HOOKS_WORKFLOWS.md) para crear reglas,
probar ambos momentos y confirmar ordenes solo en el sandbox.

## Sandbox libre de reglas CQL

El sistema no queda limitado a las reglas de ejemplo. Las reglas disponibles en
`spikes/m0/fixtures/cql` son solo material docente inicial.

Para crear una regla nueva sin cambiar codigo:

1. Escribir CQL en el editor del RCE.
2. Definir metadata: nombre, hook, expresion booleana, summary, detail e indicator.
   La version se asigna automaticamente.
3. Validar para obtener ELM desde CQL Translation Service.
4. Probar contra uno o mas pacientes.
5. Publicar y activar en mi sandbox como alumno o docente; compartir requiere docente.

La regla participa en CDS Hooks si cumple:

- esta guardada como `Library` FHIR;
- contiene CQL y ELM coherentes;
- esta `published`;
- esta `enabled`;
- su hook coincide con el servicio invocado;
- la expresion configurada existe y devuelve Boolean;
- los recursos FHIR que usa estan disponibles en `Patient/$everything`, overlay
  del sandbox o `prefetch` de la invocacion.

## Limites intencionales del MVP

- `fhirServer` recibido no reemplaza el HAPI configurado por backend.
- No se aceptan escrituras automaticas por `systemActions`.
- El feedback CDS se acepta como contrato basico; auditoria completa con
  `AuditEvent` queda como endurecimiento posterior.
- Las reglas libres siguen siendo educativas y deben usar pacientes sinteticos o
  entornos institucionales autorizados.
