# Evidencia M1 - Fundacion backend

| Campo | Resultado |
|---|---|
| Fecha UTC | 2026-07-26 |
| Entorno | Windows, Node 21.7.1 local; objetivo fijado Node 24.18.0 |
| Docker | No disponible |
| Resultado local | PASS |
| Integracion real | PENDING |

## Verificaciones ejecutadas

| Comando/escenario | Resultado |
|---|---|
| `npm run format:check` | PASS |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS, 12 pruebas |
| `npm run build` | PASS |
| Parseo Prettier de YAML de Compose/HAPI | PASS |
| `GET /api/v1/health/live` con proceso Nest local | HTTP 200, `status=up` |
| `GET /api/v1/health/ready` sin dependencias | HTTP 503 esperado |
| `GET /docs/openapi.json` | PASS, titulo `RCE CQL API` |

## Limites de la evidencia

- Las pruebas de adapters usan respuestas HTTP controladas y no sustituyen M0.
- No fue posible ejecutar `docker compose config`, iniciar HAPI, traducir CQL
  realmente ni comprobar `$apply` porque Docker CLI no existe en esta maquina.
- El warning de engine local es esperado: Node 21 esta fuera del rango fijado; la
  imagen de la API usa Node 24.18.0.
- Los perfiles Compose para HAPI local e institucional se validaron de forma
  estatica, pero requieren Docker para verificar su seleccion efectiva.
