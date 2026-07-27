# Evidence - Diabetes CQL demo

| Campo | Valor |
| --- | --- |
| Fecha UTC | 2026-07-27T07:53:29Z |
| Alcance | Fixture CQL y guia docente para alerta educativa de diabetes por HbA1c |

## Cambios verificados

- Se agrego `RceDiabetesRiskHba1c.cql` como fixture CQL para paciente adulto con HbA1c mayor o igual a 6.5%.
- Se actualizo `docs/CLINICAL_RULE_DEMO.md` con metadata, CQL y pasos esperados para activar la card.

## Comandos ejecutados

| Comando | Exit code | Resultado |
| --- | ---: | --- |
| `powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1` | 0 | SDD validation passed |
| `git -c safe.directory=D:/universidad/RCE-CQL diff --check` | 0 | Sin errores de whitespace |

## Notas

- No se ejecuto traduccion contra el CQL Translation Service en esta maquina.
- La regla es educativa y no representa diagnostico clinico definitivo.
