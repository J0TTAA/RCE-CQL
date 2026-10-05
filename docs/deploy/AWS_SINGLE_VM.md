# RCE CQL en una sola VM de AWS

Esta ruta de aula instala **web, API, traductor CQL, HAPI FHIR R4 y PostgreSQL**
en la misma instancia Linux. Caddy publica solamente HTTPS; HAPI, API,
traductor y PostgreSQL quedan en la red de Docker. El primer sembrado carga
**ocho pacientes sinteticos** con Synthea. No usar este modo anonimo con datos
reales de pacientes.

La guia prepara el despliegue, pero **no certifica capacidad para 20 alumnos**:
antes de la clase hay que ensayar concurrencia, reglas, cards y recuperacion.

## 1. Preparar la instancia y la red

- Una instancia Linux x86_64 con Docker Engine y el plugin Docker Compose.
  Como punto de partida, 2 vCPU y 8 GiB RAM (por ejemplo, `t3.large`);
  monitorear memoria, CPU, creditos de CPU y disco durante el ensayo. No es
  una garantia de rendimiento. Instalar Docker segun la distribucion elegida:
  [instrucciones oficiales](https://docs.docker.com/engine/install/) y
  [Compose plugin](https://docs.docker.com/compose/install/linux/).
- Volumen EBS cifrado con al menos 80 GiB iniciales, espacio para HAPI,
  imagenes, logs y respaldos. Configurar snapshots y verificar restauracion.
  Este perfil rota los logs de contenedores (`10m` por archivo, tres archivos
  por servicio), pero no sustituye el monitoreo de disco del sistema.
- Asignar una IP publica estable (por ejemplo Elastic IP) y crear un registro
  DNS `A` del dominio, como `rce.ejemplo.cl`, hacia esa IP. Una IP publica
  automatica puede cambiar al detener/iniciar la instancia.
- Grupo de seguridad: permitir TCP 80 y 443 desde el publico que usara la
  clase; TCP 22 **solo desde la IP administrativa**. No abrir 3000, 5173,
  8080, 8081 ni 5432. Permitir salida para descargar imagenes y obtener el
  certificado TLS. Restringir 80/443 a la red del aula si sus IP son fijas.
- Verificar que ningun otro servicio ocupe 80/443 y que el dominio resuelva
  publicamente. Caddy necesita DNS correcto y ambos puertos para HTTPS
  automatico. Si existe un proxy institucional, coordinar dominio, TLS y
  encaminamiento antes de reemplazar Caddy.

Fuentes: [EC2 security groups](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/security-group-rules-reference.html),
[instancias T3](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-t3.html),
[ciclo de vida EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-lifecycle.html),
[snapshots EBS](https://docs.aws.amazon.com/ebs/latest/userguide/EBSFeatures.html),
[HTTPS automatico de Caddy](https://caddyserver.com/docs/quick-starts/https).

## 2. Obtener el codigo y las imagenes

En la VM, con un usuario con acceso a Docker:

```bash
git clone https://github.com/J0TTAA/RCE-CQL.git
cd RCE-CQL
docker compose version
```

El usuario con acceso al socket de Docker tiene privilegios equivalentes a
administrador en la VM. No entregar esa cuenta a los alumnos.

Esperar que el workflow **Publish Containers** del commit en `main` haya
publicado `rce-cql-api` y `rce-cql-web` en GHCR. El script usa sus tags
`sha-<12 caracteres>`; no compila web/API en la VM. Si los paquetes de GHCR
son privados, autenticar la VM con un token de GitHub de alcance minimo
`read:packages`:

```bash
docker login ghcr.io -u J0TTAA
```

Introducir el token en el prompt, no en el comando ni en este chat. Se puede
alternativamente hacer publicos los paquetes. Consultar
[autenticacion GHCR](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

## 3. Configurar y levantar

```bash
bash scripts/prepare-aws-env.sh rce.ejemplo.cl
bash scripts/deploy-aws-vm.sh --seed
```

El primer comando pregunta interactivamente la clave docente (12 caracteres
o mas) y genera `.env` con claves aleatorias para sesiones y PostgreSQL,
permisos `600`, origen HTTPS y las imagenes de ese commit. No comparte las
claves por consola ni Git. Guarda la clave docente en un gestor seguro.
El script **no sobrescribe** un `.env` existente.

El segundo comando descarga las imagenes del commit, levanta todos los
servicios, espera la API/HAPI/traductor y verifica HTTPS. `--seed` es
**explicito**: construye el job Synthea y carga 1 paciente infantil,
1 adolescente, 4 adultos y 2 mayores. La primera ejecucion puede tardar
varios minutos por HAPI y la descarga del generador. La carga queda marcada
en HAPI: repetir `--seed` con la misma fecha/cantidad no duplica pacientes.
Una base previamente sembrada con otra cantidad o fecha no se reduce al
cambiar `.env`; el job falla con un mensaje. No borrar el volumen de
PostgreSQL para intentar corregirlo sin respaldo y plan de restauracion.

Si falla, mirar primero el servicio concreto:

```bash
docker compose --env-file .env -f compose.deploy.yaml -f compose.hapi.yaml -f compose.aws.yaml --profile local-translator ps
docker compose --env-file .env -f compose.deploy.yaml -f compose.hapi.yaml -f compose.aws.yaml --profile local-translator logs --tail=100 api hapi caddy
```

No usar `docker compose down --volumes`: elimina los datos persistentes de
HAPI y los certificados de Caddy. Caddy mantiene certificados/configuracion
en volumenes; HAPI usa el volumen `hapi-postgres-data`.

## 4. Verificar antes de la clase

```bash
curl -fsS http://127.0.0.1:5173/api/v1/health/ready
curl -fsS https://rce.ejemplo.cl/api/v1/health/ready
df -h /
docker system df
```

En el navegador probar una sesion de alumno y otra de docente. Confirmar
pacientes sinteticos, crear/validar/publicar una regla CQL, ver una card en
`patient-view`, y probar `order-select` y `order-sign` desde el flujo clinico.
Con dos navegadores, comprobar que los sandboxes no comparten cambios.
Ver [demos clinicas](../CLINICAL_RULE_DEMO.md) y
[flujos CDS Hooks](../CDS_HOOKS_WORKFLOWS.md).

Hacer una prueba controlada de aproximadamente 20 usuarios antes del piloto,
observando `docker stats`, latencias, respuestas HTTP y `df -h`. Si aparecen
errores o la VM intercambia memoria, ampliar capacidad o reducir carga.

## 5. Actualizar y recuperar

Para una version nueva, esperar el workflow de publicacion y luego:

```bash
git pull --ff-only
bash scripts/deploy-aws-vm.sh
```

Sin `--seed` no se vuelve a generar poblacion. El script primero descarga
ambas imagenes del nuevo commit; solo despues cambia los tags en `.env` y
recrea servicios. Si GHCR falla, conserva las referencias previas. Antes de
actualizar HAPI/PostgreSQL, crear y probar un respaldo de la base; para
recuperar, restaurar ese respaldo o snapshot EBS en una instancia aislada.
El codigo actualizado no reemplaza un respaldo de datos.

Si la comprobacion HTTPS falla pero la local responde, revisar DNS, grupo de
seguridad, puertos y logs de Caddy. Si `docker pull` devuelve `denied`,
comprobar el workflow y el acceso GHCR. Si HAPI no queda healthy, revisar
memoria, disco, logs y la integridad del volumen. No ejecutar limpiezas
globales de imagenes/volumenes en un servidor compartido sin inventario.

Este modo concentra todos los servicios en una sola VM. Para separar HAPI en
otra instancia o conectarse al HAPI institucional existente, usar la
[guia general del README](../../README.md#modos-de-despliegue), no este
overlay de AWS.
