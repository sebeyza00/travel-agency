# AUTH — Agent Accounts, Sessions & Route Gating

## Context and Design Philosophy

AUTH owns who is using the tool. It provides agent registration, login/logout, password
hashing, server-side sessions, the session cookie, the route-gating middleware, and a
`getCurrentAgent` accessor. It supplies the current agent to BOOKING (attribution) and to
PROFILES.

Guiding principles:

- **Fail closed.** Anything that cannot prove a valid session is treated as logged out.
- **Never store plaintext passwords.** Passwords are hashed with a per-account random salt.
- **Sessions are revocable.** A session is a server-side row; deleting it logs the agent out
  everywhere. The cookie carries only an opaque random token, never identity or claims.

## Data model

Both tables live in the same SQLite database as `bookings`/`audit_log`, created and migrated
by the same idempotent init discipline (`CREATE TABLE IF NOT EXISTS` + additive `ALTER`).

```sql
CREATE TABLE IF NOT EXISTS agents (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT    NOT NULL UNIQUE,   -- normalized lowercase
  name          TEXT    NOT NULL,
  password_hash TEXT    NOT NULL,          -- "saltHex:hashHex" (scrypt)
  created_at    TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT    PRIMARY KEY,         -- opaque 256-bit random hex
  agent_id    INTEGER NOT NULL REFERENCES agents(id),
  created_at  TEXT    NOT NULL,
  expires_at  TEXT    NOT NULL             -- ISO-8601
);
CREATE INDEX IF NOT EXISTS idx_sessions_agent ON sessions(agent_id);
```

`Agent` (the in-app shape) never includes `password_hash`:

```ts
interface Agent { id: number; email: string; name: string; createdAt: string; }
```

**Persistence & concurrency.** The running app uses a **single shared `better-sqlite3`
connection** for all tables (auth + bookings/audit), opened once and reused, with
`journal_mode = WAL` and a `busy_timeout` so brief write contention retries instead of
erroring. Unit tests continue to open isolated in-memory stores. (Today the audit store
opens its own connection; this pass introduces the shared connection the auth store and the
audit app-singleton both use.)

**Duplicate-email registration.** Registration relies on the `UNIQUE(email)` constraint as
the source of truth: a duplicate insert (including a race between two simultaneous
registrations) is caught and reported as "that email is already registered," not a 500.

## Password hashing

- `node:crypto` **scrypt** — no external dependency, no native build beyond Node itself.
- Hash: `salt = randomBytes(16)`, `key = scryptSync(password, salt, 64)`; store
  `` `${salt.toString("hex")}:${key.toString("hex")}` `` in `password_hash`.
- Verify: split the stored value, recompute the key with the same salt, and compare with
  `crypto.timingSafeEqual` (constant-time). A malformed/short candidate fails closed.
- Password policy (MVP): minimum 8 characters; no maximum-complexity rules.

## Sessions & cookie

- On successful register or login, create a session: `token = randomBytes(32).toString("hex")`
  (256-bit), `expires_at = now + 7 days`.
- Cookie `fd_session`: value = token, **httpOnly**, **SameSite=Lax**, `Secure` in production,
  `Path=/`, `Max-Age = 7 days`.
- `getCurrentAgent(token)` → looks up the session, rejects if missing or `expires_at <= now`
  (expired sessions are treated as logged out and may be pruned), else returns the `Agent`.
- Logout deletes the session row and clears the cookie.

## Endpoints

| Endpoint | Method | Body | Behavior |
|---|---|---|---|
| `/api/auth/register` | POST | `{ name, email, password }` | Validate; reject duplicate email; hash; create agent + session; set cookie; return `Agent`. |
| `/api/auth/login` | POST | `{ email, password }` | Look up by normalized email; verify password (constant-time); on success create session + cookie; on failure return a **generic** "invalid email or password" (no field disclosure). |
| `/api/auth/logout` | POST | – | Delete session; clear cookie. |

Registration validation: name non-empty; email matches a basic format and is unique
(case-insensitive); password ≥ 8 chars. Email is normalized to lowercase before storage and
lookup.

## Route gating

Two layers, because `better-sqlite3` cannot run in Next.js **edge** middleware:

1. **Middleware (`middleware.ts`, edge):** a coarse, DB-free gate. For any protected path,
   if the `fd_session` cookie is **absent**, redirect page requests to `/login` and answer
   `/api/*` with `401`. Public paths: `/login`, `/register`, `/api/auth/*`, Next static
   assets. The middleware checks only cookie *presence*.
2. **Node-runtime validation:** server routes/pages call `getCurrentAgent` (full DB
   validation incl. expiry). An absent/invalid/expired session yields `401` (API) or a
   redirect (pages). This is the authoritative check; the middleware is just an early bounce.

The split is deliberate: the cheap presence check keeps unauthenticated traffic off the app
shell, while the real validation runs where the database is reachable.

## Booking attribution (cross-segment → AUDIT)

`/api/search` and `/api/bookings` require a valid agent (`getCurrentAgent`, else `401`). The
booking route passes the current agent to persistence so the booking is attributed to them.

**Security boundary: attribution identity is server-derived, never client-supplied.** The
agent email used for `actor`/`agent_email` comes only from the validated session
(`getCurrentAgent`). It is **not** a field of the client `BookingInput`; a client cannot set
or spoof who a booking is attributed to. Persistence receives the agent email as a separate
server-supplied argument.

**Gating composes to fail closed.** The edge middleware rejects an *absent* cookie; the
node-runtime `getCurrentAgent` rejects a *present-but-invalid/expired* one. A protected
route or page always performs the node check — the middleware's presence test is never the
sole authority. Attribution:

- `audit_log.actor` is set to the agent's email (replacing the constant `'internal-agent'`).
- `bookings` gains a nullable `agent_email` column (additive migration) recording who booked.

These AUDIT-side changes are owned by `docs/llds/audit.md` and cascaded there in this pass;
AUTH supplies the identity.

## Decisions & Alternatives

| Decision | Chosen | Alternatives Considered | Rationale |
|---|---|---|---|
| Password hash | scrypt (`node:crypto`) + per-account salt | bcrypt/argon2 (native deps) | Built into Node; strong KDF; no extra native build |
| Session | Opaque random token + server-side row | Stateless JWT cookie | Revocable; no claims in the cookie; simple |
| Cookie hardening | httpOnly + SameSite=Lax + Secure(prod) | SameSite=Strict | Lax allows normal top-level navigation while blocking cross-site POST; CSRF risk is low for same-origin JSON |
| Gate split | Edge middleware (cookie presence) + node validation | DB lookup in middleware | `better-sqlite3` can't run on the edge runtime |
| Login errors | Generic "invalid email or password" | Field-specific errors | Avoids user-enumeration |

## Open Questions & Future Decisions

### Deferred
1. Password reset / change-password flow.
2. Rate limiting / lockout on repeated failed logins.
3. Explicit CSRF tokens (SameSite=Lax is the MVP mitigation).
4. Session sliding-expiry / "remember me"; multi-device session management UI.

## References

- `docs/llds/audit.md` — booking attribution (`actor`, `agent_email`).
- `docs/llds/booking.md` — booking flow runs as the current agent.
- `docs/high-level-design.md § Approach` (discipline 6).
