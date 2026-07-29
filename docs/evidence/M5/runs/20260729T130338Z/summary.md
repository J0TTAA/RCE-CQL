# Evidence - Manual FHIR y UI con IDs compactos

## Objetivo

Explicar en el manual operativo por que la ficha muestra condiciones,
observaciones, medicamentos y encuentros, y reducir la presencia visual de IDs
largos en la UI del paciente.

## Cambios verificados

- Manual LaTeX actualizado con una explicacion docente de recursos FHIR R4:
  `Patient`, `Condition`, `Observation`, `MedicationRequest` y `Encounter`.
- ZIP del manual regenerado en `docs/manual/rce-cql-user-manual.zip`.
- Ficha de paciente, listado, prueba de reglas y traza CDS muestran IDs FHIR
  compactos como metadata tecnica.
- El ID completo queda disponible como `title` en elementos de ficha/listado
  cuando aplica.

## Comandos ejecutados

| Comando | Exit code | Resultado |
| --- | ---: | --- |
| `Compress-Archive -Path docs\manual\rce-cql-user-manual\* -DestinationPath docs\manual\rce-cql-user-manual.zip -Force` | 0 | ZIP regenerado. |
| `npm run typecheck --workspace @rce-cql/web` | 0 | TypeScript web sin errores. |
| `npm run build --workspace @rce-cql/web` | 0 | Build Vite generado correctamente. |
| `powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1` | 0 | `errors: 0`, SDD validation passed. |
| `git -c safe.directory=D:/universidad/RCE-CQL diff --check` | 0 | Sin errores de whitespace; solo warnings CRLF de Windows. |
| `tar -tf docs\manual\rce-cql-user-manual.zip` | 0 | El ZIP contiene `main.tex`, `sections/`, `figures/`, `README.md` y `SCREENSHOTS.md`. |

## Observacion

No se ejecuto prueba visual con navegador en este turno. La verificacion visual
debe hacerse al levantar el frontend local y revisar la ficha de paciente en
`/patients/<id>`.
