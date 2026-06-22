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
  GITHUB_REPOSITORY
  GITHUB_BRANCH
  DEPLOY_DIRECTORY
  POSTGRES_DB
  POSTGRES_USER
  POSTGRES_PASSWORD
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

if ! command -v git >/dev/null 2>&1; then
  echo "git is required." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "Docker Engine with the Compose v2 plugin is required." >&2
  exit 1
fi

read -r -s -p "GitHub PAT (fine-grained, read-only repository access): " GITHUB_PAT
echo
if [[ -z "${GITHUB_PAT}" ]]; then
  echo "A GitHub PAT is required for this deployment workflow." >&2
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

repository="${GITHUB_REPOSITORY%.git}"
if [[ "${repository}" == https://github.com/* ]]; then
  repository_url="${repository}.git"
else
  repository_url="https://github.com/${repository}.git"
fi

app_dir="${DEPLOY_DIRECTORY}"
mkdir -p "$(dirname -- "${app_dir}")"

if [[ -d "${app_dir}/.git" ]]; then
  echo "Updating ${app_dir} from ${GITHUB_BRANCH}..."
  git_with_pat -C "${app_dir}" fetch origin "${GITHUB_BRANCH}"
  git_with_pat -C "${app_dir}" pull --ff-only origin "${GITHUB_BRANCH}"
else
  if [[ -e "${app_dir}" ]] && [[ -n "$(ls -A "${app_dir}" 2>/dev/null)" ]]; then
    echo "${app_dir} exists and is not an empty Git repository." >&2
    exit 1
  fi
  echo "Cloning ${repository} into ${app_dir}..."
  git_with_pat clone --branch "${GITHUB_BRANCH}" --single-branch "${repository_url}" "${app_dir}"
fi

compose=(docker compose --env-file "${ENV_FILE}" -f "${app_dir}/docker-compose.yml")

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

if [[ "${SEED_DATA:-true}" == "true" ]]; then
  echo "Loading idempotent seed data..."
  "${compose[@]}" run --rm --no-deps backend uv run python -m app.scripts.seed_demo
fi

echo "Starting application and Cloudflare tunnels..."
"${compose[@]}" up -d --remove-orphans --wait --wait-timeout 180

echo
"${compose[@]}" ps
echo
echo "Deployment complete."
echo "Frontend: ${FRONTEND_PUBLIC_URL}"
echo "Backend readiness: ${BACKEND_PUBLIC_URL}/health/ready"
