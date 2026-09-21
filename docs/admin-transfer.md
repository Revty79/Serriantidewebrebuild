# Admin workflow in the fresh rebuild

## Data rule

Brannan explicitly requested selected functionality with completely fresh data. No reference database was connected to or read during this transfer. No old users, passwords, settings, audit history, Campaigns, Characters or catalogs were imported. Test users/records are newly generated only in the isolated test database and temporary fixtures are removed after validation. The three local test seed accounts remain solely for local testing.

## Delivered functionality

- Admin dashboard, desktop/mobile navigation, breadcrumbs, path switching and logout.
- User list, account details, grant/revoke Admin/G.O.D./Player roles, own-Admin protection, feedback and immediate server-side role enforcement.
- Account deletion preview, exact confirmation, reason, dependency checks, self/last-Admin protection, transaction rollback, audit history and session/credential cleanup.
- Shared appearance presets, color controls, contrast validation, isolated preview, cancel, restore defaults and persisted public theme.
- Content/account summary presentation and pure summary builders. Read-only projections report unavailable systems explicitly. No legacy gameplay schema is created to make these pages work. Rebuilt domain features must wire/update the small admin-content-source adapter when their own schema is designed; its current compatibility projections are not a mandate to reuse the old schema.
- Operator-only first-Admin bootstrap for a chosen newly registered account. Later role management is through the Admin UI.

## Intentional adjustments

The old Role Management dashboard card had no destination despite role controls existing in User Management. It now opens Users & Roles. System Overview had no implemented workflow in the reference and remains a placeholder. Unsupported gameplay/library destinations are not exposed as broken record links.

The original account-deletion dependency query assumed the complete old schema. The rebuild enumerates actual inbound foreign keys to public.user. Only login credentials, sessions and roles are automatically cleaned; appearance/audit attribution and every unfamiliar content reference block deletion even for cascading or SET NULL foreign keys. New membership cleanup behavior requires deliberate review when that feature is rebuilt. An unsupported compound relationship fails closed. User-row and administrator-roster locks protect deletion and permission changes against concurrent requests.

The appearance write also checks current Admin authority under the roster lock. Page visibility is never the authorization boundary: actions and services authorize independently. Registration still grants Player only.

## Database/session ownership

The other Codex session handles Brannan's application connection and migration work. It generated 0001_admin_appearance_and_lifecycle.sql plus the snapshot/journal entry from the appearance and lifecycle schemas. This session did not alter those migration artifacts. This session applied that migration only to 127.0.0.1:55439/serrian_tide_rebuild_dev for tests, without editing .env.local or connecting to strebuild_dev. The application database status is not certified by these tests.

The admin migration adds empty site_appearance_setting and lifecycle_audit_event tables. Application database: strebuild_dev; login: serrian_tide_app. No account is seeded there by this transfer. Register a new account after application migration and run npm run admin:bootstrap -- your_new_username to initialize Admin. This command has not been run against Brannan's database by this session.

Permanent account deletion retains the reference behavior: enabled in development, disabled in production unless SERRIAN_TIDE_ENABLE_PERMANENT_DELETION=true. Only the browser-test server receives that production override during tests; no application setting was changed.

## Validation

- TypeScript and ESLint.
- Production build using the separate test connection.
- 10 appearance and admin-summary unit tests.
- 8 database/service validation groups, including concurrent demotion, first-Admin bootstrap, unauthorized writes, retained references, audit/session cleanup, rollback, and populated read-only content projections from temporary synthetic fixture tables.
- 6 production Admin browser flow groups: route authorization; role UI and forged-action denial; revoked-admin stale-page denial; details/404/content/mobile navigation; theme preview/persistence/authorization; deletion dialog/revalidation/cleanup/session rejection.
- 8 entry/authentication regression flow groups including all Admin routes in anonymous coverage.
- Desktop/phone screenshots inspected, including the separate mobile appearance preview. No horizontal overflow or uncaught browser errors in the tested flows.

Commands are in package.json and README. Browser evidence is local under artifacts/auth and artifacts/admin; secrets and synthetic data remain ignored by Git. Automated validation does not replace Brannan's review of the rebuilt interface.
