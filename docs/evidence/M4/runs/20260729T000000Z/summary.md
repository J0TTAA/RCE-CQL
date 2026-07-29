# M4 - Aula, reglas y edicion clinica guiada

Fecha: 2026-07-29

## Cambios verificados

- El cambio a rol docente exige `CLASSROOM_TEACHER_PASSCODE` y cookie de sesion valida.
- El alumno puede publicar y activar reglas privadas de su sandbox.
- Las reglas compartidas quedan protegidas para escritura de alumnos en backend y solo lectura en frontend.
- El editor de reglas usa select para la expresion CQL configurada desde `define`.
- La validacion ELM muestra estado listo para publicar.
- Reevaluar paciente actualiza cards y contador sin recargar toda la ficha.
- La ficha permite editar campos clinicos guiados: demografia, presion, HbA1c, glucosa, LDL, IMC, peso, talla, diabetes, metformina y encuentro.
- La trazabilidad CDS Hooks incluye explicacion didactica por pasos.
- Se elimino el promedio de ms del resumen de actividad.

## Comandos ejecutados

```text
npm run typecheck --workspace @rce-cql/api
Exit code: 0

npm run typecheck --workspace @rce-cql/web
Exit code: 0

npm run lint --workspace @rce-cql/api
Exit code: 0

npm run format:check --workspace @rce-cql/api
Exit code: 0

npm run test --workspace @rce-cql/api
Exit code: 0
Resultado: 20 tests, 20 pass, 0 fail.

npm run build --workspace @rce-cql/web
Exit code: 0
Nota: Vite mostro advertencia por Node.js 21.7.1; el build termino correctamente.

powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1
Exit code: 0
Resultado: SDD validation passed, 0 errors.
```

## Riesgo residual

- La regla booleana se elige por select desde `define`, pero la comprobacion estricta de tipo Boolean en ELM sigue siendo parte de REQ-F-009 y debe cerrarse con prueba de integracion especifica.
