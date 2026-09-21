# Rebuild handoff

Reference: D:/serrian-tide-website at 7e996354106f9b098ca9433ad723b7c9dd37eb1e.
New project: D:/Serriantidewebrebuild.

## Scope

First transfer only: landing, registration, login, Choose Your Path, authentication and roles. Admin, Heavens, Realms and Crossroads are protected placeholders. Gameplay and catalog systems have not been copied.

Copied the existing entry-page presentation, semantic CSS, artwork, local title font, auth schema, role schema and username/email login. Added real sign-out, explicit post-registration login, server authorization for destination boundaries and a distinct rebuild cookie prefix. Appearance uses source CSS defaults; saved source-database theme settings were not imported.

## Validation completed

- Dependencies installed with pinned versions and a lockfile.
- Fresh five-table authentication migration generated and applied to the isolated test database.
- Three synthetic local test accounts seeded; repeating setup preserved account IDs, password hashes, test credentials and the user-edited application .env.local (verified by before/after comparison). Credentials are in ignored LOCAL-TEST-ACCOUNTS.md.
- TypeScript, ESLint and production build passed.
- Production Chromium browser checks passed all eight flow groups: anonymous redirects; entry links and invalid credentials; registration validation, hashed passwords and Player-only access; username login and role boundaries; logout, revoked cookies and email login; rejection of registration privilege escalation; independent roles with immediate grant/revoke enforcement; roleless access denial.
- Phone screenshots check horizontal overflow. Desktop and phone landing/login/registration/access screenshots were inspected. Evidence is in ignored artifacts/auth/.
- Confirmed test cleanup left only the three seed accounts and six intended role assignments.
- Re-ran TypeScript, lint and production browser checks after separating app/test environments; all passed.

## Confirmed database arrangement

Brannan will create **strebuild_dev** (all lowercase), using **serrian_tide_app**, and handle the password locally. The assistant may retain its independent PostgreSQL test instance. The earlier database-review pause is resolved for work on the isolated test instance.

Application: `.env.local`; regular `db:migrate` explicitly applies migrations to this configured application database when requested.

Automated tests: `.env.test.local`; independent PostgreSQL 18 cluster at `.local/postgres`, bound to 127.0.0.1:55439. Database serrian_tide_rebuild_dev; role rebuild_local. The test migration, seed and browser commands are guarded for this exact test endpoint. `local:setup` preserves an existing application `.env.local`.

The original project/database have not been changed. Neither schema nor test data has been applied to Brannan's strebuild_dev database by the assistant.

## Application connection awaiting clarification

A rebuild Next.js dev server is already running at http://localhost:3010; the public login page returned HTTP 200. It was left running untouched. Brannan edited `.env.local` to use strebuild_dev, but it still points to port 55439. Asked which PostgreSQL port pgAdmin shows for his new database. Do not silently assume the port or overwrite his credentials. The app connection to strebuild_dev has NOT been validated. See README for connection and migration instructions.

## Review and next transfers

- Fresh local test accounts were chosen; original users/passwords were not imported.
- Destination cards lead to protected placeholders until their systems are selected for transfer.
- Existing Admin/G.O.D./Player roles remain independent; public registration grants Player only.
- No password-recovery/email-delivery service or admin role-management UI was transferred.
- Future Natural Armor design: natural armor identifies the protection and has one numeric Soak amount. No separate Armor and Soak reductions. This is recorded for a future transfer, not implemented in this authentication foundation.
- This is a separate Git repository. No remote has been selected; never push the rebuild to the original project's remote automatically.
