# Cockroach Ki Awwaz

A production-style anonymous message board with a modern React frontend and a typed Node.js API backed by PostgreSQL.

## Architecture

- Frontend: React, TypeScript, Vite, Tailwind CSS
- API: Express (TypeScript), Zod request validation, Helmet, Morgan
- Database: PostgreSQL + Prisma ORM
- Runtime model: One Node service serving both `/api` and built frontend (`dist`)

## Project Structure

- `src/` - frontend app
- `server/src/` - backend API source
- `server/dist/` - backend build output
- `prisma/` - schema and migrations

## Environment Variables

Copy `.env.example` to `.env` and set values:

- `VITE_API_BASE_URL=/api`
- `PORT=4000`
- `NODE_ENV=development`
- `FRONTEND_ORIGIN=http://localhost:5173`
- `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cockroach_ki_awwaz?schema=public`

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Start PostgreSQL locally:

```bash
docker compose up -d db
```

3. Apply migrations:

```bash
npm run db:deploy
```

4. Start full app:

```bash
npm run dev
```

This runs:
- Frontend at `http://localhost:5173`
- Backend at `http://localhost:4000`

## API Endpoints

- `GET /api/health`
- `GET /api/messages?limit=50`
- `POST /api/messages`
- `POST /api/messages/:id/reactions`

## Build and Run

Build frontend + backend:

```bash
npm run build
```

Start production server:

```bash
npm run start:prod
```

## Docker Deployment

Build image:

```bash
docker build -t cockroach-ki-awwaz .
```

Run app container:

```bash
docker run -p 4000:4000 --env DATABASE_URL="postgresql://postgres:postgres@host.docker.internal:5432/cockroach_ki_awwaz?schema=public" --name cockroach-ki-awwaz cockroach-ki-awwaz
```

Container startup automatically runs `prisma migrate deploy` before starting API.

## Deployment Recommendation

For a professional setup:

1. Deploy backend container to Render/Railway/Fly.io.
2. Use managed PostgreSQL (Neon/Supabase/Railway Postgres).
3. Deploy frontend to Netlify or Vercel with `VITE_API_BASE_URL` set to backend URL (for example `https://api.yourdomain.com/api`).

## Useful Commands

- `npm run db:generate` - regenerate Prisma client
- `npm run db:migrate` - create/apply migration in development
- `npm run db:deploy` - apply committed migrations (production-safe)
- `npm run db:studio` - open Prisma Studio
