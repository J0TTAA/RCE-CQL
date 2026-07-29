# Evidence - Menu de acciones en catalogo de reglas

## Objetivo

Corregir el boton de tres puntos del catalogo de reglas, que se mostraba en la
UI pero no abria ninguna accion.

## Cambios

- El boton de acciones de cada regla abre un modal `Acciones de regla`.
- Acciones funcionales:
  - abrir editor;
  - probar con paciente;
  - activar/desactivar cuando el usuario es docente y la regla esta publicada.
- Acciones futuras `Duplicar version` y `Retirar regla` quedan visibles pero
  deshabilitadas hasta que existan endpoints de backend.
- `docs/frontend/DESIGN.md` actualiza el alcance real del menu en el MVP.

## Comandos ejecutados

| Comando | Exit code | Resultado |
| --- | ---: | --- |
| `npm run typecheck --workspace @rce-cql/web` | 0 | TypeScript web sin errores. |
| `npm run build --workspace @rce-cql/web` | 0 | Build Vite generado correctamente. |
| `powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1` | 0 | `errors: 0`, SDD validation passed. |
| `git -c safe.directory=D:/universidad/RCE-CQL diff --check` | 0 | Sin errores de whitespace; solo warnings CRLF de Windows. |

## Nota

No se ejecuto prueba visual con navegador en este turno. La verificacion manual
esperada es abrir `/rules`, presionar el boton de tres puntos y comprobar que el
modal muestra las acciones.
