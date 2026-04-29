---
name: creatorflow-dev
description: >
  CreatorFlow project development skill. Use this for ANY task in the CreatorFlow
  repository — adding endpoints, new services, DB migrations, frontend components,
  API routes, security changes, or debugging. Covers the full stack: Spring Boot
  microservices (backend) and Next.js 14 App Router (frontend). Always invoke this
  skill when working in the creator-flow repo, even for small changes, to ensure
  architecture and coding standards are followed correctly.
---

# CreatorFlow Development Skill

Read `CLAUDE.md` at the repo root before writing any code — it is the authoritative source for all conventions. This skill provides the key patterns as a quick reference.

---

## Stack at a Glance

| Layer | Tech |
|---|---|
| Backend | Spring Boot 3.5.x, Java 21, Maven, Lombok, JPA/Hibernate |
| Auth | Keycloak (JWT OAuth2 resource server), `ROLE_CREATOR` |
| DB | PostgreSQL + Flyway (migrations from `db-migrations` only) |
| Storage | AWS S3, SDK v2, `DefaultCredentialsProvider` |
| Rate limit | Bucket4j token bucket, keyed by Keycloak UUID |
| Frontend | Next.js 14 App Router, TypeScript, NextAuth |
| HTTP | Axios (server: with retry), XHR (S3 upload progress only) |
| Identity | `ownerId` = Keycloak UUID = JWT `sub` = `session.userId` |

---

## Backend Patterns

### Adding a New Endpoint

1. DTO in `dto/request/` (inbound) and `dto/response/` (outbound)
2. Business logic in `services/` — controllers stay thin
3. `@PreAuthorize("hasRole('CREATOR')")` on every endpoint
4. Custom exceptions in `exception/`, mapped in `GlobalExceptionHandler`
5. Error responses always via `ErrorResponse.of(code, status, message)`

```java
// Controller — thin, no logic
@PostMapping("/something")
@PreAuthorize("hasRole('CREATOR')")
public ResponseEntity<SomeResponse> doSomething(@RequestBody SomeRequest request) {
    return ResponseEntity.status(HttpStatus.CREATED).body(service.doSomething(request));
}

// Service — all logic here
@Transactional
public SomeResponse doSomething(SomeRequest request) {
    // validate → query → act → return
}
```

### Ownership Safety
- Always query with `findByIdAndOwnerId` — never fetch by ID alone
- Return 404 (not 403) when ownership check fails — avoids leaking resource existence

### Entity with Manual UUID (when S3 key needs ID before save)
```java
UUID id = UUID.randomUUID();
String s3Key = String.format("uploads/%s/%s/%s", ownerId, id, fileName);
Entity entity = new Entity();
entity.setId(id);  // no @GeneratedValue
// ... set other fields
repository.save(entity);  // single save
```

### Postgres Native Enum
```java
@Enumerated(EnumType.STRING)
@JdbcType(PostgreSQLEnumJdbcType.class)
@Column(nullable = false, columnDefinition = "my_enum_type")
private MyEnum status;
```

### DB Migrations
- New migration → `backend/db-migrations/src/main/resources/db/migration/V{N}__description.sql`
- Never add migrations to other services — they have `flyway.enabled: false`

---

## Frontend Patterns

### Directory Rules
- `src/app/` — routes ONLY (`page.tsx`, `route.ts`, `layout.tsx`)
- `src/components/` — React components
- `src/lib/` — types, HTTP clients, server-side API helpers
- `src/service/` — client-side verb-based service layer
- `src/context/`, `src/actions/` — context and server actions

### Adding a New Next.js API Route

```typescript
// src/app/api/<resource>/<action>/route.ts
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.accessToken || !session?.userId) {
      return NextResponse.json(makeApiError('UNAUTHORIZED', 401, 'Not authenticated'), { status: 401 });
    }
    const body: Omit<SomeRequest, 'ownerId'> = await req.json();
    // Always inject ownerId from session — never trust client
    const data = await someApiCall({ ...body, ownerId: session.userId }, session.accessToken);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return handleRouteError(err);
  }
}
```

### Adding a Client Service Function

```typescript
// src/service/postService.ts (or get/put as appropriate)
export async function createSomething(body: Omit<SomeRequest, 'ownerId'>): Promise<SomeResponse> {
  const { data } = await browserAxiosClient.post<SomeResponse>('/api/resource', body);
  return data;
}
```

### Adding a Server-Side mediaApi Function

```typescript
// src/lib/media/mediaApi.ts — server-side only
export async function callSpringBackend(body: FullRequest, accessToken: string): Promise<Response> {
  const url = buildUrl('media', '/v1.0/api/media/endpoint');
  const { data } = await axiosClient.post<Response>(url, body, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return data;
}
```

### ownerId Rule (critical)
```
Browser → postService (Omit<Request, 'ownerId'>)
       → /api/route (inject ownerId: session.userId)
       → mediaApi (full Request with ownerId)
       → Spring backend (receives ownerId in body)
```
`ownerId` never originates from the browser. Always injected at the Next.js route layer.

### Request Types
Use `Omit<RequestType, 'ownerId'>` at client boundaries — don't create separate Server* types:
```typescript
// Good
const body: Omit<UploadUrlRequest, 'ownerId'> = await req.json();

// Bad — don't do this
const body: ServerUploadUrlRequest = await req.json(); // separate type = unnecessary
```

### Error Handling
- Components: `toApiError(err)` from `errorService.ts`
- API routes: `handleRouteError(err)` from `routeErrorHandler.ts`
- All errors surface as `ApiError { code, status, message }`

---

## Security Checklist (for every new feature)

- [ ] `ownerId` comes from session/JWT, never from client input
- [ ] MIME type validated against allowlist before S3 operations
- [ ] File size validated before issuing presigned URL
- [ ] Ownership verified with `findByIdAndOwnerId` before any mutation
- [ ] 404 returned for ownership failures (not 403)
- [ ] `connect-src` in `next.config.mjs` updated if new external domains needed
- [ ] Rate limiting applied to expensive write endpoints (Bucket4j, per-user)
- [ ] No credentials or secrets logged

---

## Running Locally

```bash
# Backend — set env vars in IntelliJ run config
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1
AWS_S3_BUCKET=creatorflow-media-dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=creatorflow
DB_USERNAME=...
DB_PASSWORD=...

# Frontend
cd frontend && npm run dev

# DB migrations (run once or when new migrations added)
cd backend/db-migrations && mvn flyway:migrate
```

## S3 CORS (required for presigned PUT from browser)
```json
[{
  "AllowedHeaders": ["*"],
  "AllowedMethods": ["PUT"],
  "AllowedOrigins": ["http://localhost:3000"],
  "ExposeHeaders": []
}]
```
