# AUTH — EARS Specs

Traces to `docs/llds/auth.md`. Segment prefix: `AUTH`.

## Password hashing

- [x] **AUTH-PWD-001**: When hashing a password, the system shall store a salted hash (never the plaintext), and verification shall return true for the correct password and false for any other value (including a malformed stored hash).
- [x] **AUTH-PWD-002**: The system shall hash each password with a random per-account salt, so that hashing the same password twice yields different stored hashes that both still verify.

## Accounts & sessions

- [x] **AUTH-API-001**: When registering, the system shall require a non-empty name, a valid email format, and a password of at least 8 characters, and shall reject input that fails any of these.
- [x] **AUTH-API-002**: If the submitted email is already registered (compared case-insensitively), then the system shall reject registration with an "email already registered" error and create no new account.
- [x] **AUTH-API-003**: On successful registration, the system shall create the agent with a lowercase-normalized email and a hashed password, start a session, set the session cookie, and return the agent without its password hash.
- [x] **AUTH-API-004**: On login with an email and password that match a stored account, the system shall start a session, set the session cookie, and return the agent.
- [x] **AUTH-API-005**: If login is attempted with an unknown email or an incorrect password, then the system shall reject it with a generic "invalid email or password" message and shall not start a session.
- [x] **AUTH-API-006**: On logout, the system shall delete the current session and clear the session cookie.
- [x] **AUTH-API-007**: `getCurrentAgent` shall return the agent for a valid, unexpired session token, and null for a missing, unknown, or expired token.

## Route gating

- [x] **AUTH-NAV-001**: The middleware shall treat the login page, the register page, the auth endpoints, and static assets as public, and for any other path lacking a session cookie shall redirect page requests to the login page and answer API requests with 401.
- [x] **AUTH-API-008**: The search and booking endpoints shall require a valid agent and shall respond 401 when no valid session is present.

## UI

- [x] **AUTH-UI-001**: The login page shall present email and password fields and a submit control, and on a successful login shall navigate into the app.
- [x] **AUTH-UI-002**: If a login attempt fails, then the login page shall display an error and shall not navigate away.
- [x] **AUTH-UI-003**: The register page shall present name, email, and password fields and a submit control, and on a successful registration shall navigate into the app.
- [x] **AUTH-UI-004**: While an agent is signed in, the app shall display the current agent and provide a logout control.
