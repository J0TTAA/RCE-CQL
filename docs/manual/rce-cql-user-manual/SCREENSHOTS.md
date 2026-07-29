# Checklist de capturas

Guarda cada captura en `figures/` con el nombre exacto indicado. El manual LaTeX
las insertara automaticamente.

## Preparacion

1. Levanta el entorno local con Docker.
2. Abre el frontend en `http://localhost:5173`.
3. Usa Chrome/Firefox al 100% de zoom.
4. Usa solo pacientes sinteticos cargados en HAPI local.

## Capturas principales

| Archivo | Donde tomarla | Que debe verse |
| --- | --- | --- |
| `01-docker-servicios.png` | Terminal | `docker ps` con `api`, `web`, `hapi`, `postgres` y `cql-translator` activos. |
| `02-health-ready.png` | Terminal o navegador | Respuesta de `/api/v1/health/ready` con HAPI y traductor `up`. |
| `03-pacientes-listado.png` | `/patients` | Listado de pacientes sinteticos, filtros y estado de servicios en la barra lateral. |
| `04-sandbox-sesion.png` | Menu superior del sandbox | Aula, sandbox, rol y boton `Reiniciar sandbox`. |
| `05-ficha-paciente.png` | `/patients/<id>` | Cabecera del paciente, resumen, boton `Editar dato` y rail CDS. |
| `06-editar-datos.png` | Drawer `Editar datos del paciente` | Fecha de nacimiento, presion sistolica, presion diastolica y HbA1c. |
| `07-reglas-catalogo.png` | `/rules` | Catalogo de reglas, filtros, estado, hook, activacion y alcance. |
| `08-editor-cql.png` | `/rules/<id>` | Editor CQL, metadata y botones `Guardar`, `Validar`, `Probar`, `Ver ELM`, `Publicar`. |
| `09-validacion-elm.png` | Tab `ELM` despues de validar | ELM generado o diagnosticos sin errores. |
| `10-prueba-no-aplica.png` | Tab `Prueba` | Resultado `No aplica` para el paciente antes de cambiar datos. |
| `11-card-activa.png` | Ficha del paciente | Card CDS visible despues de editar edad, presion o HbA1c. |
| `12-actividad-cds.png` | `/activity` | Lista de ejecuciones CDS con filtros y conteo de cards. |
| `13-trazabilidad-hook.png` | Drawer de detalle en `/activity` | Diagrama del hook: hook, paciente, sandbox, reglas, recursos y resultado. |
| `14-cds-discovery.png` | Terminal | `GET /api/v1/cds-services` con servicios `rce-patient-view`, `rce-order-select`, `rce-order-sign`. |
| `15-cds-post-card.png` | Terminal | `POST /api/v1/cds-services/rce-patient-view` devolviendo `cards`. |

## Capturas opcionales

| Archivo | Donde tomarla | Que debe verse |
| --- | --- | --- |
| `16-error-cql.png` | Editor de regla | Diagnostico por linea/columna cuando el CQL tiene un error. |
| `17-dos-navegadores.png` | Dos ventanas | Dos sandboxes diferentes usando la misma URL. |
| `18-reset-sandbox.png` | Menu superior | Confirmacion o efecto de `Reiniciar sandbox`. |

## Tips para que queden limpias

- Antes de capturar reglas, cambia a modo `Docente` si necesitas publicar o activar.
- Para la demo de diabetes, usa un adulto y deja HbA1c bajo antes de activar la regla.
- Si la lista de pacientes demora, espera a que desaparezca el estado de carga antes de tomar la imagen.
- En capturas de terminal, agranda la fuente para que el comando se lea.
