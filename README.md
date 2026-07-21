# Cockroach Ki Awwaz

A full-stack anonymous message board built with React + Vite on the frontend and Express on the backend.

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Express
- Persistence: JSON file storage (`data/messages.json`)
- Deploy: Docker (single container)

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Run full stack in dev mode:

```bash
npm run dev
```

This starts:
- Frontend on `http://localhost:5173`
- Backend on `http://localhost:4000`

Vite proxies `/api/*` requests to the backend.

## API Endpoints

- `GET /api/health`
- `GET /api/messages`
- `POST /api/messages`
- `POST /api/messages/:id/reactions`

## Production Run (Without Docker)

1. Build frontend:

```bash
npm run build
```

2. Start backend in production mode (serves API + `dist` static app):

```bash
npm run start:prod
```

## Docker Deployment

Build image:

```bash
docker build -t cockroach-ki-awwaz .
```

Run container:

```bash
docker run -p 4000:4000 --name cockroach-ki-awwaz cockroach-ki-awwaz
```

App will be available at `http://localhost:4000`.

## Netlify Deployment (Frontend + API On Same Domain)

This repo now includes Netlify Functions for `/api/*` endpoints, so your site can work on Netlify without a separate Express host.

What is included:
- `netlify.toml` redirecting `/api/*` to `/.netlify/functions/api/*`
- `netlify/functions/api.js` implementing:
	- `GET /api/health`
	- `GET /api/messages`
	- `POST /api/messages`
	- `POST /api/messages/:id/reactions`
- Persistent serverless storage via `@netlify/blobs`

Deploy steps:

1. Push latest code to your Git provider.
2. In Netlify, create/import the site from this repo.
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Deploy.

After deploy, this should work on your site domain:

- `/api/health`
- `/api/messages`

Note: local development still uses Express (`npm run dev`) for fast iteration.

## Deploy on Render/Railway/Fly.io

Use Docker deploy with this repository. Set environment variables:

- `NODE_ENV=production`
- `PORT=4000`
- `DATA_DIR=/app/data`

Optional:
- `VITE_API_BASE_URL=/api` (already default in frontend)

Note: JSON file storage works for demos and small usage. For multi-instance or long-term production, move storage to a managed database.
