# Preparacion AWS single VM - 2026-10-05

## Alcance

Se agregaron `compose.aws.yaml`, Caddy, generacion de `.env`, despliegue
versionado, cohorte Synthea de ocho pacientes y runbook para una VM Linux.
No se realizaron cambios en Constancias ni se usaron datos clinicos reales.

## Verificacion ejecutada en Windows

| Comando | Resultado | Exit code |
| --- | --- | --- |
| `powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1` | 103 requisitos, 101 tareas, una `IN_PROGRESS`, cero errores | 0 |
| `C:\Program Files\Git\bin\bash.exe -n scripts/prepare-aws-env.sh scripts/deploy-aws-vm.sh infra/synthea/generate-and-load.sh` | Sintaxis Bash valida | 0 |
| `python -c 'import yaml; ... yaml.safe_load(...)'` sobre tres Compose y CI | Los YAML se pueden parsear; `compose.aws.yaml` contiene siete servicios y todos tienen rotacion de logs | 0 |
| `bash scripts/prepare-aws-env.sh invalid_domain` | Rechaza dominio invalido antes de escribir `.env` | 2 (esperado) |
| `bash scripts/prepare-aws-env.sh rce.example.cl` sin TTY | Exige terminal interactiva para la clave docente; no crea `.env` | 1 (esperado) |
| `bash scripts/deploy-aws-vm.sh --unexpected` | Rechaza opcion no soportada | 2 (esperado) |
| `git diff --check` | Sin errores de whitespace; Git aviso normal de conversion CRLF/LF de Markdown | 0 |

## Pendientes y limitaciones

- No hay Docker CLI en este host Windows; por ello **no** se ejecuto
  `docker compose config`, el build del job Synthea, el arranque de HAPI,
  readiness ni HTTPS. El CI incorpora validacion Compose y Bash del perfil
  AWS, pero su resultado debe comprobarse despues del push.
- En la VM se debe ejecutar `bash scripts/deploy-aws-vm.sh --seed` con dominio,
  permisos GHCR y puertos 80/443 listos. Registrar `docker compose ps`,
  readiness local y HTTPS, conteo sintetico, prueba de regla/card, hooks de
  orden y dos sandboxes antes de declarar la tarea `DONE`.
- Falta ensayar concurrencia aproximada de 20 alumnos; 8 GiB RAM es una
  dimension inicial, no una capacidad demostrada.
