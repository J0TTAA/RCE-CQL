#!/usr/bin/env bash
set -Eeuo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

if [[ $# -gt 1 || ( $# -eq 1 && "${1:-}" != '--seed' ) ]]; then
  printf 'Uso: bash scripts/deploy-aws-vm.sh [--seed]\n' >&2
  exit 2
fi

if [[ ! -f .env ]]; then
  printf 'Falta .env. Ejecuta primero scripts/prepare-aws-env.sh.\n' >&2
  exit 1
fi

for required_command in git docker curl; do
  command -v "${required_command}" >/dev/null || {
    printf 'Falta %s en la VM.\n' "${required_command}" >&2
    exit 1
  }
done
docker compose version >/dev/null

setting() {
  local entry
  entry="$(grep -m1 "^$1=" .env || true)"
  printf '%s' "${entry#*=}"
}

domain="$(setting RCE_DOMAIN)"
if [[ ! "${domain}" =~ ^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$ ]]; then
  printf 'RCE_DOMAIN no contiene un dominio valido.\n' >&2
  exit 1
fi

if [[ "$(setting CORS_ORIGINS)" != "https://${domain}" ||
      "$(setting ANONYMOUS_SESSION_COOKIE_SECURE)" != true ||
      "$(setting HAPI_BASE_URL)" != 'http://hapi:8080/fhir' ||
      "$(setting CQL_TRANSLATOR_BASE_URL)" != 'http://cql-translator:8080' ]]; then
  printf 'Revisa CORS, cookie HTTPS y URLs internas de HAPI/traductor en .env.\n' >&2
  exit 1
fi

db_password="$(setting HAPI_DB_PASSWORD)"
session_secret="$(setting ANONYMOUS_SESSION_SECRET)"
teacher_passcode="$(setting CLASSROOM_TEACHER_PASSCODE)"
if [[ ${#db_password} -lt 24 ||
      ${#session_secret} -lt 32 ||
      ${#teacher_passcode} -lt 12 ]]; then
  printf 'Falta una clave de PostgreSQL, sesion o docente suficientemente larga.\n' >&2
  exit 1
fi

chmod 600 .env
commit="$(git rev-parse --short=12 HEAD)"
expected_api="ghcr.io/j0ttaa/rce-cql-api:sha-${commit}"
expected_web="ghcr.io/j0ttaa/rce-cql-web:sha-${commit}"
compose=(docker compose --env-file .env -f compose.deploy.yaml -f compose.hapi.yaml -f compose.aws.yaml --profile local-translator)

# Comprobar que las imagenes de este commit se pueden descargar antes de
# modificar las referencias de .env o recrear contenedores.
RCE_API_IMAGE="${expected_api}" RCE_WEB_IMAGE="${expected_web}" "${compose[@]}" config --quiet
RCE_API_IMAGE="${expected_api}" RCE_WEB_IMAGE="${expected_web}" "${compose[@]}" pull api web

if [[ "$(setting RCE_API_IMAGE)" != "${expected_api}" ||
      "$(setting RCE_WEB_IMAGE)" != "${expected_web}" ]]; then
  umask 077
  temp_file="$(mktemp ./.env.aws.XXXXXX)"
  trap 'rm -f -- "${temp_file}"' EXIT
  while IFS= read -r line || [[ -n "${line}" ]]; do
    case "${line%%=*}" in
      RCE_API_IMAGE) line="RCE_API_IMAGE=${expected_api}" ;;
      RCE_WEB_IMAGE) line="RCE_WEB_IMAGE=${expected_web}" ;;
    esac
    printf '%s\n' "${line}"
  done < .env > "${temp_file}"
  mv -- "${temp_file}" .env
  trap - EXIT
fi

"${compose[@]}" config --quiet
"${compose[@]}" pull postgres hapi cql-translator caddy
"${compose[@]}" up -d

ready_url='http://127.0.0.1:5173/api/v1/health/ready'
ready=false
for ((attempt = 1; attempt <= 90; attempt++)); do
  if curl --fail --silent --show-error --max-time 5 "${ready_url}" >/dev/null 2>&1; then
    ready=true
    break
  fi
  if ((attempt % 6 == 0)); then
    printf 'Esperando API, HAPI y traductor (%s/90)...\n' "${attempt}"
  fi
  sleep 5
done

if [[ "${ready}" != true ]]; then
  printf 'La API no alcanzo readiness. Revisa: docker compose --env-file .env -f compose.deploy.yaml -f compose.hapi.yaml -f compose.aws.yaml ps\n' >&2
  exit 1
fi

if [[ "${1:-}" == '--seed' ]]; then
  "${compose[@]}" --profile seed-data build synthea-seed
  "${compose[@]}" --profile seed-data run --rm --no-deps synthea-seed
fi

https_ready=false
for ((attempt = 1; attempt <= 24; attempt++)); do
  if curl --fail --silent --show-error --max-time 10 "https://${domain}/api/v1/health/ready" >/dev/null 2>&1; then
    https_ready=true
    break
  fi
  sleep 5
done

"${compose[@]}" ps
if [[ "${https_ready}" != true ]]; then
  printf 'La API esta lista localmente, pero HTTPS aun no responde. Revisa DNS, puertos 80/443 y logs de Caddy.\n' >&2
  exit 1
fi

printf 'RCE listo en https://%s (release sha-%s).\n' "${domain}" "${commit}"
