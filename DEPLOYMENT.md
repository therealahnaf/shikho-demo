# VM deployment

This deployment runs five services in one Docker Compose project:

- `db`: private PostgreSQL 16 database with a persistent named volume.
- `backend`: FastAPI/Uvicorn on the private Docker network and `127.0.0.1:18400`.
- `frontend`: Nginx serving the React build on the private Docker network and `127.0.0.1:18473`.
- `cloudflared-backend`: remotely managed tunnel connector for the API.
- `cloudflared-frontend`: remotely managed tunnel connector for the web application.

PostgreSQL is not published on a host port. The frontend and backend ports bind only to loopback and are not directly reachable from the internet.

## VM prerequisites

Install Git, Docker Engine, and the Docker Compose v2 plugin. The deployment user must be able to run `docker` and write to `/opt/studycircle`.

For `/opt/studycircle`, prepare the directory once:

```bash
sudo mkdir -p /opt/studycircle
sudo chown -R "$USER":"$USER" /opt/studycircle
```

The VM needs outbound HTTPS access to GitHub, Docker registries, and Cloudflare. It does not need public inbound application ports; SSH is sufficient.

## Environment file

Copy `.env.example` to a file named `.env` beside the copied `deploy.sh`:

```bash
cp .env.example .env
chmod 600 .env
```

Fill every value. Generate a URL-safe PostgreSQL password with:

```bash
openssl rand -hex 32
```

`FRONTEND_PUBLIC_URL` and `BACKEND_PUBLIC_URL` must be the final HTTPS origins without trailing slashes. The frontend API URL is compiled into the Vite build, while the frontend origin is used by FastAPI CORS. Changing either URL requires running `deploy.sh` again.

The deployment uses the fixed repository `therealahnaf/shikho-demo`, branch `main`, and directory `/opt/studycircle`. Put the GitHub PAT in `.env` and protect the file with `chmod 600`.

For a private repository, use a fine-grained GitHub PAT scoped to the selected repository with read-only **Contents** access.

## Cloudflare setup

Create two remotely managed Cloudflare Tunnels in Cloudflare Zero Trust.

Cloudflare initially shows a `cloudflared service install <token>` command while it waits for a connector. Do not run that command for this deployment. Put each token in `.env`; the two Compose `cloudflared` services are the connectors. After deployment marks each tunnel healthy, open the tunnel and add its published application/public hostname route.

### Frontend tunnel

- Tunnel name: for example, `studycircle-frontend`.
- Public hostname: the hostname used by `FRONTEND_PUBLIC_URL`.
- Service type: `HTTP`.
- Service URL: `http://frontend:80`.
- Put the tunnel token in `CLOUDFLARE_FRONTEND_TUNNEL_TOKEN`.

### Backend tunnel

- Tunnel name: for example, `studycircle-backend`.
- Public hostname: the hostname used by `BACKEND_PUBLIC_URL`.
- Service type: `HTTP`.
- Service URL: `http://backend:8000`.
- Put the tunnel token in `CLOUDFLARE_BACKEND_TUNNEL_TOKEN`.

The service names above resolve inside the shared Compose network. Do not use `localhost` in the Cloudflare public-hostname service configuration because `localhost` would refer to the `cloudflared` container itself.

Cloudflare creates or offers to create the DNS route when the public hostname is added. Ensure both hostnames show an active certificate. Do not place a browser-interactive Cloudflare Access login in front of the backend hostname unless the frontend is also changed to provide Access credentials; otherwise browser API requests will receive the Access login response instead of JSON.

## First deployment and updates

Copy `deploy.sh` and the completed `.env` to the VM, then run:

```bash
chmod +x deploy.sh
./deploy.sh
```

The script:

1. Reads the GitHub PAT from the protected `.env` file.
2. Clones `main` on first deployment or performs a fast-forward pull later.
3. Pulls and builds the container images.
4. Starts PostgreSQL and waits for readiness.
5. Applies all Alembic migrations.
6. Runs the idempotent seed command.
7. Starts or replaces the backend, frontend, and tunnel connectors.
8. Waits for container health checks before reporting success.

Run the same script for every rebuild or redeployment. Application data persists in the `studycircle_postgres-data` Docker volume.

Never run `docker compose down -v` unless database deletion is intentional.

## Diagnostics

From the repository directory on the VM:

```bash
docker compose --env-file /path/to/.env ps
docker compose --env-file /path/to/.env logs -f backend
docker compose --env-file /path/to/.env logs -f cloudflared-backend
docker compose --env-file /path/to/.env logs -f cloudflared-frontend
curl http://127.0.0.1:18400/health/ready
curl http://127.0.0.1:18473/healthz
```
