#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-${SCRIPT_DIR}/.env}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing environment file: ${ENV_FILE}" >&2
  echo "Copy .env.example to .env, fill it in, and run this script again." >&2
  exit 1
fi

set -a
# The deployment .env is intentionally shell-compatible KEY=value syntax.
# shellcheck disable=SC1090
source "${ENV_FILE}"
set +a

required=(
  GITHUB_PAT
  DATABASE_URL
  FRONTEND_PUBLIC_URL
  BACKEND_PUBLIC_URL
  CLOUDFLARE_FRONTEND_TUNNEL_TOKEN
  CLOUDFLARE_BACKEND_TUNNEL_TOKEN
)

for variable in "${required[@]}"; do
  if [[ -z "${!variable:-}" ]]; then
    echo "${variable} is required in ${ENV_FILE}." >&2
    exit 1
  fi
done

REPOSITORY_URL="https://github.com/therealahnaf/shikho-demo.git"
BRANCH="main"
APP_DIR="/opt/studycircle"

db_authority_path="${DATABASE_URL#*://}"
db_credentials="${db_authority_path%%@*}"
db_host_path="${db_authority_path#*@}"

if [[ "${db_credentials}" == "${db_authority_path}" || "${db_credentials}" != *:* || "${db_host_path}" != */* ]]; then
  echo "DATABASE_URL must look like postgresql+psycopg://user:password@db:5432/database." >&2
  exit 1
fi

export POSTGRES_USER="${db_credentials%%:*}"
export POSTGRES_PASSWORD="${db_credentials#*:}"
export POSTGRES_DB="${db_host_path#*/}"
POSTGRES_DB="${POSTGRES_DB%%\?*}"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Engine with the Compose v2 plugin is required." >&2
  exit 1
fi

export GITHUB_PAT
trap 'unset GITHUB_PAT' EXIT

git_with_pat() {
  GIT_TERMINAL_PROMPT=0 git \
    -c credential.helper= \
    -c credential.helper='!f() { if [ "$1" = get ]; then echo "username=x-access-token"; echo "password=$GITHUB_PAT"; fi; }; f' \
    "$@"
}

mkdir -p "$(dirname -- "${APP_DIR}")"

if [[ -d "${APP_DIR}/.git" ]]; then
  echo "Updating ${APP_DIR} from ${BRANCH}..."
  git_with_pat -C "${APP_DIR}" fetch origin "${BRANCH}"
  git_with_pat -C "${APP_DIR}" pull --ff-only origin "${BRANCH}"
else
  if [[ -e "${APP_DIR}" ]] && [[ -n "$(ls -A "${APP_DIR}" 2>/dev/null)" ]]; then
    echo "${APP_DIR} exists and is not an empty Git repository." >&2
    exit 1
  fi
  echo "Cloning ${REPOSITORY_URL} into ${APP_DIR}..."
  git_with_pat clone --branch "${BRANCH}" --single-branch "${REPOSITORY_URL}" "${APP_DIR}"
fi

compose=(docker compose --env-file "${ENV_FILE}" -f "${APP_DIR}/docker-compose.yml")

echo "Pulling base service images..."
"${compose[@]}" pull db cloudflared-backend cloudflared-frontend

echo "Building backend and frontend..."
"${compose[@]}" build --pull backend frontend

echo "Starting PostgreSQL..."
"${compose[@]}" up -d db

echo "Waiting for PostgreSQL..."
for _ in $(seq 1 60); do
  if "${compose[@]}" exec -T db pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if ! "${compose[@]}" exec -T db pg_isready -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" >/dev/null 2>&1; then
  echo "PostgreSQL did not become ready." >&2
  "${compose[@]}" logs db
  exit 1
fi

echo "Applying database migrations..."
"${compose[@]}" run --rm --no-deps backend uv run alembic upgrade head

echo "Loading idempotent seed data..."
"${compose[@]}" run --rm --no-deps backend uv run python -m app.scripts.seed_demo

echo "Starting application and Cloudflare tunnels..."
"${compose[@]}" up -d --remove-orphans --wait --wait-timeout 180

echo
"${compose[@]}" ps
echo
echo "Deployment complete."
echo "Frontend: ${FRONTEND_PUBLIC_URL}"
echo "Backend readiness: ${BACKEND_PUBLIC_URL}/health/ready"
