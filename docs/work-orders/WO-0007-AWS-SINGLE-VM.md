# WO-0007 - Preparar una VM AWS autocontenida para aula

## Estado

REVIEW

## Relacion

- Revision parcial de TASK-8.7 y TASK-6.13.
- REQ-NF-024, REQ-NF-025, REQ-NF-028, REQ-D-007, REQ-I-001.
- DESIGN.md, ADR-026 y seccion 15.6.

## Objetivo

Desplegar en una unica VM Linux las imagenes versionadas de RCE web/API,
CQL Translation Service, HAPI R4, PostgreSQL y un proxy HTTPS. Sembrar un
conjunto pequeno de pacientes sinteticos para la primera clase.

## Aceptacion

- `.env` se crea localmente con secretos no versionados, URL HTTPS y tags
  inmutables de las imagenes publicadas del commit elegido.
- La configuracion Compose valida sin mostrar secretos y conserva HAPI,
  PostgreSQL y el traductor fuera del acceso publico.
- El despliegue espera readiness de Nest y verifica HTTPS.
- El seed se ejecuta solo bajo solicitud explicita, verifica el numero de
  pacientes y no duplica un conjunto ya cargado.
- La guia cubre DNS, red AWS, GHCR privado, respaldo, actualizacion y pruebas
  de aula.
- SDD y pruebas estaticas pasan; las pruebas con Docker/HAPI reales en la VM
  se registraran por separado antes de declarar DONE.

## Evidencia

`docs/evidence/M5/runs/20261005-aws-single-vm/summary.md`.

TASK-8.11 sigue siendo la unica tarea `IN_PROGRESS` hasta verificar su build
Docker limpio. Este work order no la cierra. `REVIEW` refleja que se completaron
los chequeos estaticos, pero faltan Compose y pruebas reales en Docker/VM.
