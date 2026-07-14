# Deployment Design: Vercel (Frontend) + Railway (Backend + Postgres)

**Date:** 2026-07-14
**Status:** Approved

## Goal

Deploy the money-split app so it is publicly accessible via a Vercel URL (frontend) and a Railway URL (backend), suitable for sharing on LinkedIn as a portfolio project.

## Architecture

```
User browser
  │
  ├─► Vercel  (React/Vite SPA)   split-money-app.vercel.app
  │         │  VITE_API_URL ──────────────────────────────┐
  │                                                        ▼
  └─► (OAuth redirect) ──► Railway  (NestJS backend)   money-split-backend.up.railway.app
                                  │
                                  └─► Railway Postgres  (same project)
```

## Services

| Service | Platform | Source | URL |
|---|---|---|---|
| Frontend | Vercel | `MinhDuc0400/split-money-app` `main` | `<app>.vercel.app` |
| Backend | Railway | `MinhDuc0400/money-split-backend` `master` | `<app>.up.railway.app` |
| Database | Railway Postgres add-on | — | injected as `DATABASE_URL` |
| Redis | None | — | in-memory Socket.IO adapter (single instance) |

## Backend Deploy Configuration (Railway)

- **Build command:** `npm run build` (Railway auto-detects and runs this)
- **Start command:** `npm run start:prod` (runs `node dist/main`)
- **Deploy command (release phase):** `npx prisma migrate deploy`
- **Root directory:** repo root (`money-split-backend`)

### Environment variables (set in Railway dashboard)

| Variable | Value |
|---|---|
| `DATABASE_URL` | Auto-injected by Railway Postgres add-on |
| `JWT_SECRET` | Strong random secret (generate with `openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` (Railway injects `PORT` automatically — app already reads it) |
| `FRONTEND_URL` | `https://<app>.vercel.app` (set after Vercel deploy) |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | `https://<app>.up.railway.app/auth/google/callback` |

### No Redis

`main.ts` already guards Redis behind `if (process.env.REDIS_URL)`. With a single Railway instance, the default in-memory Socket.IO adapter works correctly. `REDIS_URL` is simply not set.

## Frontend Deploy Configuration (Vercel)

- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Root directory:** repo root (`split-money-app`)

### Environment variables (set in Vercel dashboard)

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://<app>.up.railway.app` |
| `VITE_API_PUBLIC_URL` | `https://<app>.up.railway.app` |

## Google OAuth Setup

In Google Cloud Console → OAuth 2.0 credentials:

- **Authorised JavaScript origins:** `https://<app>.vercel.app`
- **Authorised redirect URIs:** `https://<app>.up.railway.app/auth/google/callback`

## Code Changes Required

### Backend — `nixpacks.toml` (new file)

Railway uses Nixpacks to build Node apps. A `nixpacks.toml` ensures the correct build and start commands are used and that Prisma generates the client before build:

```toml
[phases.setup]
nixPkgs = ["nodejs_20"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["npx prisma generate", "npm run build"]

[start]
cmd = "npx prisma migrate deploy && npm run start:prod"
```

### Frontend — no code changes needed

Vite reads `VITE_*` env vars at build time. Vercel injects them during the build step. No source changes required.

## Deployment Order

1. Provision Railway project → add Postgres add-on → note `DATABASE_URL`
2. Deploy backend to Railway → note the Railway URL
3. Update Google Cloud Console with Railway callback URL
4. Deploy frontend to Vercel → note the Vercel URL
5. Set `FRONTEND_URL` in Railway to the Vercel URL (triggers CORS allowlist)
6. Smoke-test: open Vercel URL → login via Google → create a group → add expense

## Out of Scope

- Custom domain
- CI/CD pipeline (both platforms auto-deploy on push to main/master)
- Redis / horizontal scaling
- Staging environment
