# alex-0d18-test-20 Product Snapshot

`alex-0d18-test-20` is a social image-sharing app. Authenticated users can upload images, publish posts, follow people, browse a personalized feed, like and comment on posts, and view profile pages with social counts and post grids.

## Current Features

- Sign-in through the myClawTeam auth service, followed by an app-issued bearer JWT for API calls.
- PostgreSQL-backed users, posts, follows, likes, and comments.
- S3-compatible presigned upload URLs for post images, with object keys kept under the configured `S3_PREFIX`.
- Feed, profile, comments, and social endpoints with validated pagination.
- Follow/unfollow, like/unlike, post creation, comment creation, and comment listing.
- React pages for feed, creating posts, profiles, auth callback, and shared navigation.
- Shared frontend UI components for post cards, profile grids/headers, comments, avatars, and follow buttons.
- Persisted color themes with a header swatch picker for emerald, indigo, rose, and amber palettes.

## Architecture

- Monorepo with `frontend/` and `backend/` npm workspaces.
- Frontend: Vite, React, React Router, Tailwind CSS.
- Frontend styling uses semantic Tailwind `app.*` color tokens backed by CSS variables, with `ThemeProvider` persisting the selected color theme in localStorage.
- Frontend API access is split into domain clients: `authApi`, `postsApi`, `feedApi`, `profilesApi`, and `socialApi`, with shared HTTP helpers in `frontend/src/lib/api/http.ts`.
- Backend: Express, TypeScript, Prisma, Zod, JWT/JWKS verification, AWS SDK v3 for S3-compatible uploads.
- Backend route helpers centralize authenticated-user extraction and Zod validation/error response handling.
- Backend services own Prisma access and use shared helpers for result shapes and pagination.
- Runtime env validation remains in `backend/src/config/env.ts`; backend code should use the exported `getRuntimeConfig()` aggregate accessor.
- Production builds serve `frontend/dist` from the backend after all `/api/*` routes.

## Data Model

Core tables are `users`, `posts`, `follows`, `likes`, and `comments`.

- `users` are keyed by the auth provider subject.
- `follows` uses a composite primary key on follower/followee.
- `likes` enforces one like per user/post pair.
- Posts, likes, comments, and follows cascade when their related user or post is deleted.
- Feed, profile, and comment listings are paginated with newest-first ordering where applicable.

## API Conventions

- API routes are mounted under `/api/*`, except `GET /me` for the authenticated current user.
- Protected routes require the app-issued bearer token.
- Error responses use `{ error, code, details? }`.
- Zod validation failures return `400` with code `VALIDATION_ERROR`.
- Domain errors use stable codes such as `INVALID_IMAGE_URL`, `SELF_FOLLOW`, `SELF_UNFOLLOW`, and `NOT_FOUND`.

## Testing

- Backend service tests cover serialization, service result shapes, pagination behavior, and domain branches.
- Route-level tests lock validation and error response contracts.
- An API-level E2E test covers login-token usage, upload URL creation, post creation, follow, feed, like, and comment flow.

## Configuration And Deployment

- Required runtime config is documented in `.env.example`.
- Backend listens on `HOST`/`PORT`, defaulting to `0.0.0.0:8080`.
- Use PostgreSQL via `DATABASE_URL`; do not introduce SQLite, JSON-file, local disk, or in-memory durable storage.
- Use S3-compatible object storage for uploaded images; preserve the invariant that object keys include `S3_PREFIX`.
- Use `npm run deploy:build` to build frontend and backend.
- Use `npm run deploy:start` to run Prisma migrations and start the compiled backend.

## Repository Conventions

- Do not hardcode database URLs, auth secrets, JWT secrets, or object-storage credentials.
- Keep route handlers thin: validation/auth composition in routes, persistence in services.
- Keep shared frontend UI in `frontend/src/components/*` and shared frontend API types/helpers in `frontend/src/lib/api/*`.
- Use semantic `app.*` Tailwind color classes for frontend UI instead of hardcoded palette colors.
- Extend route-level tests when changing validation or error response contracts.
