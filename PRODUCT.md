# alex-0d18-test-20 Product Snapshot

`alex-0d18-test-20` is a self-hostable social image-sharing app. It lets authenticated users upload images, publish posts, follow other users, browse a personalized feed, like posts, comment, and view profile pages with post grids and social counts.

## Current Features

- myClawTeam auth-service sign-in with an app-issued JWT after `/auth/callback`.
- User persistence in PostgreSQL, keyed by the auth provider subject.
- Presigned S3-compatible uploads for post images, with object keys stored under the configured `S3_PREFIX`.
- Post creation with image URL and optional caption.
- Follow and unfollow endpoints that prevent self-follow and duplicate follows.
- Home feed showing followed users' posts in reverse chronological paginated order.
- Like and unlike endpoints returning current like counts.
- Comment creation and paginated comment listing.
- User profile endpoint and frontend page with avatar, display name, follow/unfollow action, follower/following counts, and post grid.
- React frontend pages for feed, create post, profile, auth callback, and basic navigation.
- Backend service tests plus an API-level end-to-end test covering login, post creation, follow, feed, like, and comment flow.

## Architecture

- Monorepo with `frontend/` and `backend/` npm workspaces.
- Frontend: Vite, React, React Router, Tailwind CSS.
- Backend: Express, TypeScript, Prisma, Zod, JWT/JWKS verification, AWS SDK v3 for S3-compatible uploads.
- Database: PostgreSQL only, via Prisma and `DATABASE_URL`.
- Runtime object storage: S3-compatible storage only; no local disk, JSON files, SQLite, or in-memory persistence for durable state.
- Production build serves the compiled React app from `frontend/dist` through the backend after all `/api/*` routes.

## Data Model

Core tables are `users`, `posts`, `follows`, `likes`, and `comments`.

- `follows` uses a composite unique primary key on follower/followee.
- `likes` enforces one like per user/post pair.
- `posts`, `likes`, `comments`, and follows cascade when their related user or post is deleted.
- Feed and profile listings are paginated with newest-first ordering where applicable.

## API Conventions

- API routes are mounted under `/api/*`, except `GET /me` for the authenticated current user.
- Error responses use a consistent JSON shape with an error code and message.
- Request validation is handled with Zod at route boundaries.
- Protected routes require a bearer token issued by the app after myClawTeam auth verification.

## Configuration And Deployment

- Required runtime config is documented in `.env.example`.
- Backend listens on `HOST`/`PORT`, defaulting to `0.0.0.0:8080`.
- Use `npm run deploy:build` to build frontend and backend.
- Use `npm run deploy:start` to run Prisma migrations and then start the compiled backend.
- Prisma migrations run through `npm run prisma:migrate` / `npm run deploy:migrate`.
- Production deployments should set `NODE_ENV=production`, `SELF_URL`, `VITE_API_BASE_URL`, PostgreSQL credentials, myClawTeam auth vars, JWT secret, and S3 vars before build/start.

## Repository Conventions

- Do not hardcode database URLs, auth secrets, JWT secrets, or object-storage credentials.
- Do not introduce alternative durable storage backends.
- Preserve the S3 prefix invariant: every stored object key must include `S3_PREFIX`.
- Keep backend tests focused on service behavior and core flow regressions.
