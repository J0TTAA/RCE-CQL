# Evidence - Manual de uso RCE CQL

## Objetivo

Preparar un paquete LaTeX operativo, no estilo tesis, para que el docente pueda
compartir un manual de uso del RCE CQL con sus alumnos.

## Artefactos

- `docs/manual/rce-cql-user-manual/`
- `docs/manual/rce-cql-user-manual/main.tex`
- `docs/manual/rce-cql-user-manual/SCREENSHOTS.md`
- `docs/manual/rce-cql-user-manual.zip`

## Comandos ejecutados

| Comando | Exit code | Resultado |
| --- | ---: | --- |
| `Compress-Archive -Path docs\manual\rce-cql-user-manual\* -DestinationPath docs\manual\rce-cql-user-manual.zip -Force` | 0 | ZIP generado. |
| `powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1` | 0 | `errors: 0`, SDD validation passed. |
| `git -c safe.directory=D:/universidad/RCE-CQL diff --check` | 0 | Sin errores de whitespace. |
| `tar -tf docs\manual\rce-cql-user-manual.zip` | 0 | El ZIP contiene `main.tex`, `sections/`, `figures/`, `README.md` y `SCREENSHOTS.md`. |
| `Get-Command pdflatex -ErrorAction SilentlyContinue` | 1 | `pdflatex` no esta instalado en este entorno; compilacion local no ejecutada. |

## Nota

El manual compila con placeholders aunque falten capturas. Las imagenes reales
deben agregarse luego en `figures/` con los nombres indicados en
`SCREENSHOTS.md`.
