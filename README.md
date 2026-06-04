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
npm start
```

The backend listens on `0.0.0.0:8080` by default and exposes `GET /api/health`.
Prisma is configured for PostgreSQL via `DATABASE_URL`.
