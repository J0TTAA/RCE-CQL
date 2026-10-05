#!/usr/bin/env bash
set -Eeuo pipefail

cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.."

if [[ $# -ne 1 ]]; then
  printf 'Uso: bash scripts/prepare-aws-env.sh rce.tudominio.cl\n' >&2
  exit 2
fi

domain="${1,,}"
if [[ ! "${domain}" =~ ^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$ ]]; then
  printf 'Indica un dominio DNS publico, sin https:// ni puerto.\n' >&2
  exit 2
fi

if [[ -e .env ]]; then
  printf '.env ya existe; se conserva sin cambios.\n' >&2
  exit 1
fi

for command in git openssl mktemp; do
  command -v "${command}" >/dev/null || {
    printf 'Falta %s en la VM.\n' "${command}" >&2
    exit 1
  }
done

commit="$(git rev-parse --short=12 HEAD)"
[[ "${commit}" =~ ^[0-9a-f]{12}$ ]] || {
  printf 'No se pudo obtener el commit para fijar las imagenes.\n' >&2
  exit 1
}

if [[ ! -t 0 ]]; then
  printf 'Ejecuta este comando en una terminal interactiva para introducir la clave docente.\n' >&2
  exit 1
fi

read -r -s -p 'Clave docente (12+ caracteres: letras, numeros, _ o -): ' teacher_passcode
printf '\n'
if [[ ! "${teacher_passcode}" =~ ^[A-Za-z0-9_-]{12,}$ ]]; then
  printf 'La clave docente debe tener al menos 12 caracteres permitidos.\n' >&2
  exit 1
fi

read -r -s -p 'Repite la clave docente: ' teacher_confirmation
printf '\n'
if [[ "${teacher_passcode}" != "${teacher_confirmation}" ]]; then
  printf 'Las claves no coinciden.\n' >&2
  exit 1
fi

umask 077
temp_file="$(mktemp ./.env.aws.XXXXXX)"
trap 'rm -f -- "${temp_file}"' EXIT
db_password="$(openssl rand -hex 32)"
session_secret="$(openssl rand -hex 32)"

while IFS= read -r line || [[ -n "${line}" ]]; do
  case "${line%%=*}" in
    RCE_DOMAIN) line="RCE_DOMAIN=${domain}" ;;
    CORS_ORIGINS) line="CORS_ORIGINS=https://${domain}" ;;
    RCE_API_IMAGE) line="RCE_API_IMAGE=ghcr.io/j0ttaa/rce-cql-api:sha-${commit}" ;;
    RCE_WEB_IMAGE) line="RCE_WEB_IMAGE=ghcr.io/j0ttaa/rce-cql-web:sha-${commit}" ;;
    HAPI_DB_PASSWORD) line="HAPI_DB_PASSWORD=${db_password}" ;;
    ANONYMOUS_SESSION_SECRET) line="ANONYMOUS_SESSION_SECRET=${session_secret}" ;;
    CLASSROOM_TEACHER_PASSCODE) line="CLASSROOM_TEACHER_PASSCODE=${teacher_passcode}" ;;
  esac
  printf '%s\n' "${line}"
done < .env.aws.example > "${temp_file}"

mv -- "${temp_file}" .env
trap - EXIT
printf 'Configuracion creada para https://%s con imagenes sha-%s.\n' "${domain}" "${commit}"
printf 'La clave docente queda solo en .env (permisos 600); no se imprimira.\n'
