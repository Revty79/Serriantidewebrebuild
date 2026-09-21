# Rebuild handoff

Reference project: D:/serrian-tide-website at 7e996354106f9b098ca9433ad723b7c9dd37eb1e. Read-only reference; unchanged by this work.
Rebuild: D:/Serriantidewebrebuild. Initial foundation checkpoint: 7863748254afd47504d8efe8ba441cd14f63be20.

## Current scope and data direction

Entry/registration/login/Choose Your Path plus the Admin workflow are implemented. Brannan clarified that this is largely a fresh rebuild retaining only selected functionality, with completely fresh database data. Do not import old accounts, password hashes, saved settings, histories, Campaigns, Characters or catalog rows. Select later feature work explicitly with him.

Heavens, Realms and Crossroads are protected placeholders. No gameplay/combat/catalog data or implementation has been brought over. Natural Armor's future direction remains a protection classification plus one numeric Soak value, without separate Armor and Soak reductions; this is recorded only for future work.

## Admin transfer

See docs/admin-transfer.md for the exact scope, dependency protections, adjustments and validation. Accounts/roles, account details/deletion, appearance and summary screens work. Original System Overview remains a placeholder. Gameplay-dependent summaries show Not available yet. First-Admin bootstrap is available for a chosen newly registered account; it creates no user and refuses an additional bootstrap once Admin exists.

Public registration grants Player only. Roles are independent. Every page/action checks current access on the server; mutations reauthorize inside protected transactions. Auth cookies remain separate from the reference app. Appearance now reads persisted rebuild settings, with built-in defaults for an empty setting table.

## Database work ownership

Brannan confirmed a second Codex session handles only database/migration work; this session handles Admin code and testing. The second session generated the appearance/lifecycle migration. Its artifacts were not edited by this session. Apply application migrations/connectivity changes with that session; this session has not modified .env.local, connected to strebuild_dev, or run first-Admin bootstrap there.

Application database name: strebuild_dev (lowercase); login: serrian_tide_app; password managed locally by Brannan. Earlier .env.local used test-instance port 55439, but the other session now owns resolving the application connection. Do not assume current connectivity from this historical observation.

Test instance remains independent: .local/postgres, 127.0.0.1:55439, serrian_tide_rebuild_dev/rebuild_local, .env.test.local. Seven application tables are migrated there. Three synthetic seed accounts are in ignored LOCAL-TEST-ACCOUNTS.md; temporary service/browser fixtures are cleaned up. No reference data was copied. local:setup preserves any existing application .env.local.

## Validation and operation

Admin tests passed: 10 unit tests, 8 service groups, 6 production browser groups. The 8 entry/authentication regression groups also passed. TypeScript, lint and production build passed. Screenshots were inspected on desktop/phone. Details and rerun commands are in README/docs/admin-transfer.md. Tests run sequentially and only against the guarded test endpoint.

Use npm run dev on port 3010 for the app. This session left the already-running user dev server untouched. The test servers were stopped after validation. After an application schema is migrated, register a new user then run npm run admin:bootstrap -- your_new_username if no Admin exists yet.

No remote is configured for this repository. Never push this rebuild to the original project's remote automatically.
