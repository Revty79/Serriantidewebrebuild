# Serrian Tide Web Rebuild

Current scope: entry/authentication pages and the full Admin flow (users, roles, account deletion, appearance and content summaries). Other destinations remain placeholders until Brannan requests their transfer.

The reference project is `D:/serrian-tide-website`. Read it for context; do not modify it as part of this rebuild. Import each later system deliberately. Preserve user-authored canon and the user's latest decisions.

Use the installed Next.js guides in `node_modules/next/dist/docs/` before changing framework code. Use the shared `--st-*` semantic appearance variables in `src/app/globals.css`.

Keep the rebuild database, credentials and cookies separate from the reference project. Never commit `.env.local`, `.local/`, or `LOCAL-TEST-ACCOUNTS.md`. PostgreSQL setup scripts are guarded for this project's local database only.

Read `REBUILD-HANDOFF.md` before expanding scope. Authentication and permissions are enforced on the server; hiding a card is not authorization. Public registration grants Player only.

## Fresh-data rule

Transfer only the functionality Brannan selects. The rebuild starts with completely fresh data. Never import accounts, password hashes, saved settings, Campaigns, Characters or catalog rows from the reference database. Migrations define the new empty schema. Synthetic test records belong only in the isolated test database.
