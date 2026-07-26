# Reglas de trabajo del repositorio

## Fuentes de verdad

Antes de implementar, leer en este orden:

1. `docs/REQUIREMENTS.md`
2. `docs/DESIGN.md`
3. `docs/TASKS.md`
4. El Work Order activo en `docs/work-orders/`

Si hay contradiccion, requisitos define el comportamiento, diseno define la solucion aprobada y tareas define el orden. Corregir primero los documentos antes de cambiar el codigo.

## Gate actual

El proyecto ya puede integrar el frontend Vite con NestJS para consumir HAPI,
CQL Translation Service y evaluacion CQL mediante engine existente. El frontend
no debe contener fixtures clinicos hardcodeados ni llamar directo a HAPI o al
traductor; toda interoperabilidad pasa por NestJS.

## Reglas tecnicas

- No implementar parser, traductor ni motor CQL propio.
- No evaluar reglas clinicas mediante condiciones TypeScript simuladas.
- Aislar HAPI, CQL Translation Service y Clinical Reasoning detras de puertos/adapters.
- No acceder a las tablas internas de HAPI.
- No usar datos clinicos reales, identificadores reales ni secretos en fixtures o logs.
- No usar tags de contenedor flotantes.
- No reintentar escrituras sin idempotencia demostrada.
- No aplicar sugerencias CDS sin confirmacion explicita.

## Ejecucion y evidencia

- Mantener como maximo una tarea `IN_PROGRESS`.
- `DONE` exige comandos ejecutados, exit code y artefactos en `docs/evidence/<milestone>/`.
- La existencia de un archivo no demuestra que una prueba paso.
- No escribir porcentajes de cobertura no medidos.
- No declarar una herramienta ejecutada cuando solo se comprobo su disponibilidad.
- Registrar incompatibilidades y resultados negativos; tambien son evidencia valida.
- Cada cambio de arquitectura requiere actualizar el registro de decisiones en `docs/DESIGN.md` o crear un ADR.

## Verificacion minima

Ejecutar siempre:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1
```

Cuando existan paquetes de codigo, agregar lint, typecheck y tests del paquete afectado. Los tests de integracion deben usar HAPI y traductor reales del entorno M0.
