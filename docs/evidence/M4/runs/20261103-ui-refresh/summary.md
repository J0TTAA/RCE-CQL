# Revalidacion de vistas para demo

## Alcance

- Las escrituras clinicas y la confirmacion de ordenes siguen mostrando la respuesta confirmada sin esperar una nueva busqueda FHIR.
- Se retiraron 640 ms de pausas artificiales del formulario clinico.
- Catalogos visibles de reglas, actividad y pacientes revalidan cada 5, 8 y 15 segundos respectivamente, y al recuperar el foco. No consultan con la pestana oculta ni solapan solicitudes lentas.
- Las lecturas UI dinamicas usan `Cache-Control: no-store`; el cliente evita la cache HTTP en GET.
- Cambiar de sandbox remonta la vista activa para no conservar estado local anterior.

## Verificacion local

| Comando | Exit code | Resultado |
| --- | ---: | --- |
| `npm run build:web` con Node 24.22.1 | 0 | Typecheck y build Vite completados. |
| `npm run typecheck` | 0 | API tipada. |
| `npm run lint` | 0 | ESLint API sin warnings. |
| `npm run format:check` | 0 | Prettier API sin cambios. |
| `npm test` | 0 | 39 tests API pasaron. |
| `powershell -ExecutionPolicy Bypass -File .\scripts\validate-sdd.ps1` | 0 | 104 requisitos, 102 tareas, 0 errores. |
| `node scripts/ui-refresh-check.mjs` con Chrome y API simulada | 0 | Catalogo paso de 0 a 1 regla sin recarga; actividad se reconsulto. |
| `node scripts/order-hooks-ui-check.mjs` con Chrome y API simulada | 0 | Ordenes y visor FHIR JSON pasaron en 1440x1000 y 390x844; capturas en `../20261103-ui-final/`. |

## Limites

- La primera prueba de Chrome fallo por `ERR_NETWORK_ACCESS_DENIED` en el sandbox y otra por `ERR_CONNECTION_TIMED_OUT` con el servidor aislado. Se repitio con servidor y Chrome en el mismo contexto local; paso. No fueron fallos de la aplicacion.
- No hay Docker disponible en este Windows. No se midio la latencia real de HAPI, CQL ni Cloudflare en Fedora; tampoco se ejecutaron pruebas multiusuario reales aqui.
