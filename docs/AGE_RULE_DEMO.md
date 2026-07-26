# Demo: regla CQL por edad

Esta guia prueba el flujo completo local:

```text
Monaco en RCE -> NestJS -> CQL Translation Service -> ELM -> Library en HAPI
Paciente Synthea -> overlay de sandbox -> cql-execution -> card CDS
```

## 1. Levantar plataforma

Desde Linux, en la raiz del repo:

```bash
cp .env.example .env
docker compose --profile local-hapi --profile local-translator up -d --build
docker compose ps
```

La URL de uso para alumnos es:

```text
http://localhost:5173
```

## 2. Poblar HAPI con Synthea

```bash
docker compose --profile local-hapi --profile seed-data build synthea-seed
docker compose --profile local-hapi --profile seed-data run --rm synthea-seed
```

Verificar conteo:

```bash
curl -sG http://localhost:8080/fhir/Patient \
  --data-urlencode '_tag=https://rce-cql.local/fhir/tags/dataset|synthea-4.0.0-v1' \
  --data-urlencode '_summary=count' | jq '.total'
```

Debe retornar `30` con la configuracion por defecto.

## 3. Crear regla CQL

1. Abrir `http://localhost:5173`.
2. Entrar a `Reglas CQL`.
3. Presionar `Nueva regla`.
4. En el editor dejar este CQL:

```cql
library AgeRuleDemo version '0.1.0'

using FHIR version '4.0.1'

context Patient

define "Aplica":
  AgeInYears() >= 18
```

5. En metadata usar:
   - Nombre CQL: `AgeRuleDemo`
   - Version: `0.1.0`
   - Hook: `patient-view`
   - Expresion booleana: `Aplica`
   - Summary: `Paciente adulto`
   - Detail: `El paciente tiene 18 anos o mas segun CQL AgeInYears().`
   - Indicator: `info`
6. Presionar `Guardar`.
7. Presionar `Validar`; debe aparecer ELM.
8. Cambiar rol a `Docente`.
9. Presionar `Publicar`.

## 4. Probar con paciente

1. Ir a `Pacientes`.
2. Abrir cualquier paciente.
3. Presionar `Editar dato`.
4. Cambiar fecha de nacimiento a `2015-01-01`.
5. Guardar: la card no deberia aparecer.
6. Volver a `Editar dato`.
7. Cambiar fecha de nacimiento a `1990-01-01`.
8. Guardar: debe aparecer una card `Paciente adulto`.

El cambio de fecha de nacimiento se guarda como overlay del sandbox en HAPI
usando `Basic`; no modifica el `Patient` Synthea base. Por eso varios alumnos
pueden entrar por la misma URL sin login y trabajar con su sandbox anonimo.

## 5. Ver actividad

Entrar a `Actividad CDS`. Cada guardado de paciente que reevalue hooks persiste
una ejecucion con:

- paciente
- hook
- reglas evaluadas
- cantidad de cards
- correlationId
- recursos considerados

## Referencias

- HL7 CQL `AgeInYears()`: https://cql.hl7.org/2020May/09-b-cqlreference.html
- `cql-execution`: https://www.npmjs.com/package/cql-execution
- `cql-exec-fhir`: https://www.npmjs.com/package/cql-exec-fhir
- HAPI Clinical Reasoning: https://hapifhir.io/hapi-fhir/docs/clinical_reasoning/overview.html
