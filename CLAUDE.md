# CreatorFlow — Claude Development Rules

This file governs how Claude works in this repository. Read it fully before touching any code.

---

## Project Overview

CreatorFlow is a platform for social media creators. Architecture:

- **`backend/`** — Spring Boot 3.5.x microservices (Java 21, Maven)
  - `auth-service` — user auth, Keycloak integration
  - `media-service` — S3 presigned upload/serve flow
  - `analytics-service` — analytics snapshots
  - `scheduler-service` — scheduled jobs
  - `db-migrations` — the ONLY service that runs Flyway migrations
- **`frontend/`** — Next.js 14 App Router (TypeScript)
- **`scripts/db/`** — DB init scripts

---

## Backend Rules (Spring Boot / Java)

### Package Structure (media-service as canonical example)
```
com.creatorflow.<service>/
├── configuration/   # @Configuration, @ConfigurationProperties beans
├── controllers/     # @RestController — thin, no business logic
├── dto/
│   ├── request/     # inbound request bodies
│   └── response/    # outbound response shapes + ErrorResponse
├── exception/       # custom RuntimeExceptions + GlobalExceptionHandler
├── filter/          # OncePerRequestFilter (e.g. RateLimitFilter)
├── model/           # @Entity JPA classes
├── repository/      # JpaRepository interfaces
└── services/        # all business logic lives here
```

### Controllers
- Must be thin — no business logic, no AWS calls, no DB queries
- Extract `ownerId` and other identity from request body/params — never use `@AuthenticationPrincipal` at the controller level to modify requests
- Always use `@PreAuthorize("hasRole('CREATOR')")` on every endpoint
- Return `ResponseEntity<T>` with explicit HTTP status codes

### Services
- All business logic lives here
- Manual UUID generation before save when building an S3 key (single save pattern — no double save)
- Validate MIME type against `ALLOWED_MIME_TYPES` set before any DB or S3 operation
- Validate `sizeBytes` against `awsProperties.getMaxFileSizeBytes()` before issuing presigned URL
- Use `@Transactional` on write methods, `@Transactional(readOnly = true)` on reads

### Entities / JPA
- No `@GeneratedValue` on IDs that need to be known before save (manual UUID pattern)
- Use `@Enumerated(EnumType.STRING)` + `@JdbcType(PostgreSQLEnumJdbcType.class)` for Postgres native enum columns
- `@PrePersist` for `createdAt` and default status

### Error Handling
- All custom exceptions extend `RuntimeException`
- All mapped in `GlobalExceptionHandler` (`@RestControllerAdvice`)
- Always use `ErrorResponse.of(code, status, message)` — never write raw JSON strings
- Ownership violations return 404 (not 403) to avoid leaking existence of other users' resources
- `IllegalStateException` (e.g. S3 file not found on confirm) → 422 `S3_FILE_NOT_FOUND`

### Database / Migrations
- Flyway runs ONLY from `db-migrations` service — all other services have `flyway.enabled: false`
- New migrations go in `backend/db-migrations/src/main/resources/db/migration/`
- Never add migrations to individual service migration folders for schema changes
- Migration naming: `V{N}__{description}.sql`

### AWS / S3
- Use `DefaultCredentialsProvider` — never hardcode credentials
- S3 key format: `uploads/{ownerId}/{mediaId}/{fileName}`
- Presigned PUT expiry: 15 min (matches `app.aws.upload-url-expiry-minutes`)
- Presigned GET expiry: 1 hr (matches `app.aws.read-url-expiry-hours`)
- Always call `HeadObject` in `confirmUpload` before marking UPLOADED — verify file actually exists in S3
- Never log AWS secret keys — only log key prefix for debugging

### Rate Limiting
- Bucket4j token bucket, keyed by JWT `sub` (Keycloak UUID), not IP
- Rate limiting applies only to `/upload-url` — the expensive endpoint
- 429 response uses `ErrorResponse` format (not raw JSON strings)
- Falls back to IP for unauthenticated requests (Spring Security rejects those anyway)

### Configuration
- All config via `application.yml` + env vars (no hardcoded values)
- Sensitive config via env vars: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET`, `DB_*`, `REDIS_*`
- Bind config to `@ConfigurationProperties` classes — avoid scattered `@Value` annotations

---

## Frontend Rules (Next.js / TypeScript)

### Directory Structure
```
frontend/src/
├── app/                    # Routes ONLY — no components, no lib here
│   ├── api/media/          # Next.js BFF API routes
│   │   ├── upload-url/route.ts
│   │   ├── confirm/route.ts
│   │   └── [id]/route.ts
│   ├── dashboard/page.tsx
│   ├── login/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/             # React components
│   ├── media/
│   └── landing/
├── context/                # React context providers
├── actions/                # Next.js server actions
├── lib/
│   ├── http/               # axios clients, buildUrl, routeErrorHandler
│   ├── request/            # request interface types (mirror Java DTOs)
│   ├── response/           # response interface types + ApiError
│   └── media/              # mediaApi.ts (server-side Spring calls)
└── service/                # client-side service layer (verb-based)
    ├── getService.ts
    ├── postService.ts
    ├── putService.ts
    └── errorService.ts
```

**Critical:** `src/app/` contains ONLY pages, sub-pages, API routes, layout, and globals. Never put components, lib, context, or actions inside `src/app/`.

### Import Alias
- Always use `@/*` which maps to `src/*`
- `auth.ts` lives at repo root — import as `@/../auth` from within `src/`

### API Route Pattern (BFF Layer)
- All API routes authenticate via `const session = await auth()`
- Check both `session?.accessToken` AND `session?.userId` — return 401 if either missing
- **Always inject `ownerId` from `session.userId` server-side** — never trust client-supplied `ownerId`
- Parse request body as `Omit<SomeRequest, 'ownerId'>` then spread with `ownerId: session.userId`
- Wrap in try/catch, use `handleRouteError(err)` in catch block

```typescript
// Correct pattern for POST routes
const body: Omit<UploadUrlRequest, 'ownerId'> = await req.json();
const data = await someApiCall({ ...body, ownerId: session.userId }, session.accessToken);
```

### Service Layer (`src/service/`)
- Verb-based files: `getService.ts`, `postService.ts`, `putService.ts`, `errorService.ts`
- All use `browserAxiosClient` — calls go to Next.js `/api/*` routes, NOT directly to Spring
- Client-facing functions use `Omit<Request, 'ownerId'>` — `ownerId` never appears in browser code
- `uploadToS3` lives in `putService.ts` — uses XHR (not axios/fetch) because only XHR exposes upload progress via `onprogress`
- `toApiError(err)` in `errorService.ts` normalises any thrown value to `ApiError`

### mediaApi.ts (`src/lib/media/mediaApi.ts`)
- Server-side only — called from Next.js API routes, never from components
- Uses `axiosClient` (with retry) not `browserAxiosClient`
- Injects `Authorization: Bearer {accessToken}` header on every call
- Full request types with `ownerId` — ownerId is always present here

### Request/Response Types
- `src/lib/request/media.ts` — mirrors Java DTOs, includes `ownerId` on full interfaces
- `src/lib/response/media.ts` — response shapes, `MediaStatus` enum
- `src/lib/response/error.ts` — `ApiError { code, status, message }`, `isApiError`, `makeApiError`
- Use `Omit<RequestType, 'ownerId'>` at the client boundary — don't create separate Server* types

### HTTP Clients
- `axiosClient` — server-side, has axios-retry (3 attempts, exponential, GET only)
- `browserAxiosClient` — client-side, no retry, 15s timeout
- `buildUrl(service, path, pathVars?, query?)` — always use this for Spring service URLs

### Security (Frontend)
- Content Security Policy in `next.config.mjs` — `connect-src` must include `https://*.amazonaws.com` for S3 XHR uploads
- Never expose AWS credentials to the frontend
- Never send `ownerId` from the browser — always inject server-side

---

## Identity / Auth Rules

- **Keycloak** is the source of truth for user identity
- `ownerId` = Keycloak UUID = JWT `sub` claim
- NextAuth stores `token.sub` as `session.userId` via the jwt/session callbacks in `auth.ts`
- No local `users` table lookup needed — use `ownerId` UUID directly as the FK in `media_files`
- `media_files.owner_id` has NO foreign key constraint to `users` table (dropped in V5 migration)

---

## Deduplication / Business Logic

When `POST /upload-url` is called:
1. Reject if MIME type not in allowlist → 400
2. Reject if `sizeBytes` exceeds max → 400
3. If UPLOADED row exists for `(ownerId, fileName)` → 409 `MEDIA_ALREADY_UPLOADED`
4. If PENDING row exists AND younger than 15 min → reuse row + S3 key, return fresh presigned URL
5. If PENDING row exists AND older than 15 min → delete stale row, insert new row with new S3 key
6. Otherwise → insert new row

When `POST /confirm` is called:
1. Find by `(mediaId, ownerId)` — 404 if not found or wrong owner
2. Reject if status != PENDING → 409 `MEDIA_ALREADY_CONFIRMED`
3. Call `HeadObject` on S3 — 422 `S3_FILE_NOT_FOUND` if file absent
4. Mark UPLOADED, save

---

## What NOT to Do

- Do not put business logic in controllers
- Do not use `@AuthenticationPrincipal` to overwrite request fields in controllers
- Do not add Flyway migrations to individual service folders (only `db-migrations`)
- Do not log AWS secret keys
- Do not use `fetch` or `axios` directly in components — use `service/` layer
- Do not send `ownerId` from the browser client
- Do not trust `ownerId` from the request body in Next.js routes — always overwrite from session
- Do not put anything except routes under `src/app/`
- Do not use `localStorage` or `sessionStorage`
- Do not create separate `Server*` request types — use `Omit<Type, 'ownerId'>` instead
- Do not use IP-based rate limiting — key by Keycloak UUID from JWT
