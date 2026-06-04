# alex-0d18-test-20

Monorepo with a React frontend and Express backend.

## Packages

- `frontend/`: Vite + React app with Tailwind and React Router
- `backend/`: Express API server

## Scripts

```bash
npm install
npm run dev
npm run build
npm run typecheck
npm run lint
npm run format:check
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate
npm run deploy:build
npm run deploy:migrate
npm run deploy:start
npm start
```

The backend listens on `0.0.0.0:8080` by default and exposes `GET /api/health`.
Prisma is configured for PostgreSQL via `DATABASE_URL`.
Runtime configuration is documented in `.env.example`.
Authentication routes are mounted under `/api/auth`.
`GET /me` returns the current user for authenticated bearer tokens.
The frontend stores the app JWT in local storage after `/auth/callback`.

## Local development

```bash
npm install
cp .env.example .env
npm run prisma:migrate
npm run dev
```

Fill `.env` before running migrations. The local frontend runs on Vite and should use `VITE_API_BASE_URL=http://localhost:8080`.

## Self-hosting

Use Node.js 20 or newer, PostgreSQL, myClawTeam auth configuration, and S3-compatible object storage. The app reads configuration from environment variables; do not hardcode database or storage credentials.

```bash
npm ci
npm run deploy:build
npm run deploy:start
```

`npm run deploy:start` runs `prisma migrate deploy` and then starts the compiled backend. After `npm run deploy:build`, the backend serves the built React app from `frontend/dist` and keeps all API routes under `/api/*`; `GET /me` remains available for authenticated users. Set `HOST=0.0.0.0` and `PORT=8080` for container hosting.

For production builds, set `NODE_ENV=production`, `SELF_URL` to the public app origin, and `VITE_API_BASE_URL` to the API origin before running `npm run deploy:build`. In a single-origin deployment, `SELF_URL` and `VITE_API_BASE_URL` should be the same base URL.

## Required environment

- `DATABASE_URL`: PostgreSQL connection string used by Prisma.
- `HOST` and `PORT`: backend bind address, defaulting to `0.0.0.0:8080`.
- `SELF_URL`: public app URL used for auth redirects.
- `MCTAI_AUTH_URL`, `MCTAI_AUTH_APP_TOKEN`, `MCTAI_AUTH_JWKS_URL`: myClawTeam auth service settings.
- `JWT_SECRET`: at least 32 characters for app-issued JWTs.
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_PREFIX`, `S3_ENDPOINT`, `S3_REGION`, `S3_FORCE_PATH_STYLE`, `S3_PUBLIC_BASE_URL`: S3-compatible object storage settings. Every object key is stored under `S3_PREFIX`.
- `VITE_API_BASE_URL`, `VITE_APP_ENV`: frontend build-time configuration.
