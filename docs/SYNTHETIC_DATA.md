# Datos clinicos sinteticos

## Fuente seleccionada

El entorno local usa [Synthea 4.0.0](https://github.com/synthetichealth/synthea/releases/tag/v4.0.0), un generador abierto de pacientes sinteticos mantenido por Synthetic Health/MITRE. Synthea modela historias desde el nacimiento y puede producir encuentros, condiciones, alergias, medicamentos, inmunizaciones, signos vitales, laboratorios, procedimientos y planes de cuidado en FHIR R4.

Los datos son realistas pero no reales. No corresponden a personas existentes y no deben mezclarse con datos institucionales. La [documentacion oficial](https://synthetichealth.github.io/synthea/) describe el uso de estas poblaciones para desarrollo y evaluacion de sistemas de soporte a decisiones clinicas.

## Poblacion local

El perfil `seed-data` genera 30 pacientes vivos con fecha clinica de referencia fija `2026-07-26`:

| Cohorte         | Edad en la fecha de referencia | Cantidad | Etiqueta       |
| --------------- | -----------------------------: | -------: | -------------- |
| Ninos           |                         0 a 11 |        6 | `children`     |
| Adolescentes    |                        12 a 17 |        4 | `adolescents`  |
| Adultos         |                        18 a 64 |       12 | `adults`       |
| Adultos mayores |                        65 a 90 |        8 | `older-adults` |

Las semillas de poblacion y profesionales estan fijadas en el cargador. Con la misma version, fecha y cantidades se obtiene el mismo conjunto. Se conserva toda la historia generada y los nombres incluyen numeros para que su naturaleza ficticia sea evidente.

Todos los recursos cargados reciben esta etiqueta FHIR:

```text
system: https://rce-cql.local/fhir/tags/dataset
code:   synthea-4.0.0-v1
```

Cada `Patient` recibe ademas una etiqueta de cohorte bajo `https://rce-cql.local/fhir/tags/cohort`.

## Carga en HAPI local

Con la plataforma local activa:

```bash
docker compose --profile local-hapi --profile seed-data build synthea-seed
docker compose --profile local-hapi --profile seed-data run --rm synthea-seed
```

La primera construccion descarga el JAR oficial de Synthea 4.0.0 y verifica su SHA-256 antes de crear la imagen. La generacion y la carga pueden tardar varios minutos.

El cargador usa solamente la API FHIR de HAPI. No accede a PostgreSQL y sigue el [orden de carga recomendado por Synthea](https://github.com/synthetichealth/synthea/wiki/FHIR-Transaction-Bundles):

1. Bundles de `Organization` y `Location`.
2. Bundles de `Practitioner`.
3. Bundles de pacientes con sus historias clinicas.

Los bundles de referencia de Synthea se normalizan a `transaction` antes de enviarlos a HAPI. Si un recurso no trae `entry.request`, el cargador crea una operacion `PUT ResourceType/id` cuando existe `id`, o `POST ResourceType` cuando no existe.

Al finalizar crea `Basic/rce-synthea-4-0-0-v1` con estado `completed`. Si se ejecuta otra vez, detecta esa marca y no duplica pacientes.

## Comprobacion

Contar todos los pacientes del dataset:

```bash
curl -sG http://localhost:8080/fhir/Patient \
  --data-urlencode '_tag=https://rce-cql.local/fhir/tags/dataset|synthea-4.0.0-v1' \
  --data-urlencode '_summary=count' | jq '.total'
```

El resultado esperado con la configuracion por defecto es `30`.

Usa el caracter `|` literal dentro de `--data-urlencode`. No pegues `%7C` en ese valor, porque `--data-urlencode` lo volveria a codificar.

Listar nombre, sexo administrativo y fecha de nacimiento:

```bash
curl -sG http://localhost:8080/fhir/Patient \
  --data-urlencode '_tag=https://rce-cql.local/fhir/tags/dataset|synthea-4.0.0-v1' \
  --data-urlencode '_count=50' |
jq '{total, patients: [.entry[].resource | {
  id,
  name: (.name[0].text // (((.name[0].given // []) + [(.name[0].family // "")]) | join(" "))),
  gender,
  birthDate
}]}'
```

Comprobar el numero de pacientes por cohorte:

```bash
for COHORT in children adolescents adults older-adults; do
  TOTAL=$(curl -sG http://localhost:8080/fhir/Patient \
    --data-urlencode "_tag=https://rce-cql.local/fhir/tags/cohort|$COHORT" \
    --data-urlencode '_summary=count' | jq -r '.total')
  printf '%s: %s\n' "$COHORT" "$TOTAL"
done
```

El resultado esperado es `6`, `4`, `12` y `8`, respectivamente.

Consultar un resumen de recursos asociados a un paciente:

```bash
PATIENT_ID='<id retornado por la consulta anterior>'
curl -sG http://localhost:8080/fhir/Patient/$PATIENT_ID/'$everything' \
  --data-urlencode '_count=200' |
jq '[.entry[].resource.resourceType] | group_by(.) | map({type: .[0], count: length})'
```

## Idempotencia y recuperacion

- Un run completado es idempotente: una segunda ejecucion no vuelve a cargarlo.
- Si una carga se interrumpe, la marca queda en `loading` para evitar duplicados silenciosos.
- Como este perfil es exclusivamente local, la recuperacion segura es recrear la base y ejecutar de nuevo:

```bash
docker compose down --volumes
docker compose up -d --build
docker compose --profile local-hapi --profile seed-data run --rm synthea-seed
```

El primer comando elimina tambien reglas y otros datos locales guardados en HAPI.

## Limites clinicos y demograficos

- Synthea usa por defecto demografia, prestadores, seguros y direcciones de Estados Unidos, con Massachusetts como ubicacion de esta poblacion.
- Los codigos y trayectorias son adecuados para interoperabilidad y docencia, pero no constituyen guias clinicas chilenas ni datos epidemiologicos locales.
- Tener una edad o diagnostico en el dataset no garantiza un caso exacto para cada regla. Los escenarios pedagogicos controlados se agregaran despues como fixtures FHIR pequenos y versionados.
- Este cargador apunta de forma fija al servicio Docker local `hapi`; no se usa para poblar el HAPI institucional.

## Fuentes oficiales

- [Synthea Patient Generator](https://github.com/synthetichealth/synthea)
- [Synthea 4.0.0](https://github.com/synthetichealth/synthea/releases/tag/v4.0.0)
- [Configuracion oficial 4.0.0](https://github.com/synthetichealth/synthea/blob/v4.0.0/src/main/resources/synthea.properties)
- [FHIR Transaction Bundles](https://github.com/synthetichealth/synthea/wiki/FHIR-Transaction-Bundles)
- [FHIR R4 Patient](https://hl7.org/fhir/R4/patient.html)
- [FHIR R4 Observation](https://hl7.org/fhir/R4/observation.html)
