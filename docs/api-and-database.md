# API and database environments

Haptic uses one shared Cloudflare Worker API for the web and desktop apps. There are exactly two PostgreSQL environments:

| Environment       | PostgreSQL                                                | API runtime                                            |
| ----------------- | --------------------------------------------------------- | ------------------------------------------------------ |
| Local development | The existing PostgreSQL server on the development machine | Wrangler on `http://localhost:8787`                    |
| Production        | The existing PostgreSQL server on the VPS                 | Cloudflare Worker at `https://haptic.strast.dev/api/*` |

There is no Neon, D1, or separately provisioned managed database in this architecture.

## Local setup

1. Copy `apps/api/.dev.vars.example` to `apps/api/.dev.vars`.
2. Set `DATABASE_URL` to the existing local Haptic database.
3. Run the first migration with an owner connection:

   ```sh
   DATABASE_URL='postgresql://haptic_owner:...@localhost:5432/haptic' pnpm --filter=api db:migrate
   ```

4. Put the restricted `haptic_api` connection in `.dev.vars` for normal API requests.
5. Start the Worker with `pnpm --filter=api dev` only when interactive local testing is needed.

The auth server must allow the Worker's development origin as a return origin. On the current LAN this is `http://192.168.1.217:8787`; update it if the machine's DHCP address changes. The JWT audience remains the registered production origin, `https://haptic.strast.dev`.

## Production setup

Production uses a Hyperdrive binding named `HYPERDRIVE`. It points to the PostgreSQL database already running on the VPS. The Worker selects `HYPERDRIVE.connectionString` in production and falls back to `DATABASE_URL` under local Wrangler.

After creating the Hyperdrive configuration, add its ID to `apps/api/wrangler.jsonc`:

```jsonc
"hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<hyperdrive-id>" }]
```

Keep `AUTH_SIGNING_SECRET` in Worker secrets. It must never be placed in a `VITE_*` variable, the static SvelteKit bundle, or the Tauri binary. Configure these non-secret Worker variables separately:

```text
API_URL=https://haptic.strast.dev
APP_ORIGINS=https://haptic.strast.dev
AUTH_AUDIENCE=https://haptic.strast.dev
AUTH_URL=https://auth.strast.dev
SESSION_TTL_SECONDS=604800
```

The Worker must be routed on `haptic.strast.dev/api/*`, not only on a `workers.dev` hostname. This keeps the web session cookie first-party. The desktop API will use an authorization token stored by the native credential layer; the native handoff is a later implementation slice.

## Database roles

Use distinct credentials even though all roles connect to the same database server:

- `haptic_owner`: owns the schema and runs migrations.
- `haptic_api`: restricted application reads and writes used through Hyperdrive.
- `haptic_electric`: logical replication and table reads for Electric.

Electric runs against the local PostgreSQL database during development and the VPS PostgreSQL database in production. It is the read-path sync service; writes continue to go through the Worker API. The initial collection and note schema is present; Electric configuration and sync rules are the next slice.

## Implemented auth endpoints

- `GET /api/auth/sign-in?returnTo=<allowed-url>` redirects through the centralized auth server with a short-lived, HttpOnly state cookie.
- `GET /api/auth/callback` validates the two-minute HS256 handoff, consumes its `jti` once, and creates an opaque application session.
- `GET /api/auth/session` returns the current user from a web cookie or native bearer token.
- `POST /api/auth/sign-out` revokes the server-side session and expires the cookie.
- `GET /health` is a process-level liveness check and does not query PostgreSQL.

Session tokens are stored only as SHA-256 hashes. Authentication handoff IDs are persisted so the same provider token cannot create multiple sessions.

## Cloud data endpoints

All cloud routes require a valid web session cookie or native bearer token. Every lookup is scoped to the authenticated user; a resource owned by another account returns `404`.

- `GET` / `POST /api/sync/collections` — list or create cloud collections.
- `GET` / `PATCH` / `DELETE /api/sync/collections/:collectionId` — read, rename, or delete one collection.
- `GET` / `POST /api/sync/collections/:collectionId/notes` — list notes or create a Markdown note.
- `GET` / `PUT` / `DELETE /api/sync/collections/:collectionId/notes/:noteId` — read, replace, or delete one note.

Note paths are collection-relative Markdown paths (for example, `daily/2026-08-02.md`). The Worker rejects absolute and traversing paths, and collection deletion cascades to its notes.
