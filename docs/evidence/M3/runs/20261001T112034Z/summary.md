# M3: visibilidad de ordenes del sandbox

## Cambio

- La ficha expone las ordenes firmadas y confirmadas del sandbox actual.
- Se incluyen recetas (`MedicationRequest`) y examenes/procedimientos (`ServiceRequest`).
- El resumen visual se mantiene separado del Bundle FHIR que evalua CQL.
- Las ordenes seleccionadas permanecen pendientes en el compositor hasta la confirmacion explicita de firma.
- El detalle de otro sandbox no recibe estas ordenes.

## Verificacion

| Comando | Resultado |
| --- | --- |
| `npm run test --workspace @rce-cql/api` | Exit 0; 35 tests passed, 0 failed. |
| `npm run typecheck --workspace @rce-cql/api` | Exit 0. |
| `npm run lint --workspace @rce-cql/api` | Exit 0. |
| `npm run format:check --workspace @rce-cql/api` | Exit 0. |
| `npm run build --workspace @rce-cql/api` | Exit 0. |
| `npm run build:web` | Exit 0; Vite emitio aviso de Node 21.7.1, pero compilo los archivos. |
| `powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1` | Exit 0; 103 requisitos, 101 tareas, 0 errores. |

## Pendiente

No se ejecutó un smoke visual contra la instancia Docker de Fedora. Para esa
verificacion se debe actualizar primero el codigo en Fedora, reconstruir las
imagenes `api` y `web`, agregar una orden, confirmar su firma y comprobar que
aparece en la pestaña de ordenes y persiste al reabrir la ficha. Confirmar
tambien que un segundo navegador no vea la orden del primer sandbox.
