# Serrian Tide Web Rebuild

First transfer from `D:/serrian-tide-website`: landing, registration, login, and Choose Your Path. The existing nebula/alchemy artwork, Evanescent title font, semantic theme, username/email login and role-based access cards are preserved. Destination pages are protected placeholders for the next stage.

## Open the local preview

Open **http://localhost:3010**. Local test usernames and generated passwords are in **LOCAL-TEST-ACCOUNTS.md**, which is ignored by Git. The app uses your connection in `.env.local`; automated checks use the separate `.env.test.local` connection. These test accounts work only when the app is connected to the isolated test database. Registering through the UI creates a Player-only account and asks you to sign in afterward. Sign out from Choose Your Path to test a different account.

To run the app yourself:

```powershell
cd D:\Serriantidewebrebuild
npm install
npm run dev
```

If the app is already running on port 3010, use that instance or stop its foreground terminal with Ctrl+C before starting another. After restarting the computer, run `npm run db:start` if you are using the isolated test database.

## Your database: strebuild_dev

Create `strebuild_dev` in your chosen PostgreSQL server, with `serrian_tide_app` as its owner/login. Manage the password locally. The setup scripts have not created or connected to this database.

Edit **.env.local** with your connection, following **.env.example**. Use the host and port shown in your pgAdmin server connection; the example's `127.0.0.1:5432` assumes PostgreSQL on this machine and is only a default. Preserve the exact database-name capitalization. URL-encode password special characters in `DATABASE_URL`. Keep the existing generated `BETTER_AUTH_SECRET` for this local rebuild, and set `BETTER_AUTH_URL` to the address you actually open in the browser.

Once the connection points to your new empty database, apply the five authentication tables:

```powershell
npm run db:migrate
npm run dev
```

Restart the app after changing its environment. Your new database starts with no accounts. Register through the UI for Player access; local test accounts are only in the separate test database. Admin/G.O.D. assignment management is a later transfer.

## Separate automated-test database

The test cluster is in `.local/postgres`, bound only to `127.0.0.1:55439`. Database: `serrian_tide_rebuild_dev`; login: `rebuild_local`. Test secrets are in **.env.test.local**. The application reads **.env.local**, so connecting your application to `strebuild_dev` does not change the automated-test connection.

Requirements: Node.js 20.9 or newer, npm, PostgreSQL 18 binaries. The Windows default is `C:/Program Files/PostgreSQL/18/bin`; set `SERRIAN_POSTGRES_BIN` before initial test setup if needed.

```powershell
npm run local:setup
```

This starts the test cluster, applies test migrations and prepares three local test accounts. It never replaces an existing `.env.local`. For a fresh checkout with no app environment, it also creates an initial `.env.local` using the test connection. Repeating setup preserves test records and passwords. No source-project accounts, catalogs, migrations or secrets are copied.

`npm run db:start`, `npm run db:stop` and `npm run db:status` manage only this test cluster. Test migrations use `npm run db:test:migrate`, and test account setup uses `npm run db:test:seed`. These commands do not operate on `strebuild_dev`.

## Validation

```powershell
npm run typecheck
npm run lint
npm run build
npm run test:browser
```

The browser test starts its own production Next.js process on an available loopback port and explicitly uses `.env.test.local`. It requires Google Chrome at the standard Windows location, or `CHROME_PATH` pointing to a Chrome/Chromium executable. It creates uniquely named temporary accounts in the isolated test DB, then deletes only those accounts. It tests real registration/login/logout, role isolation, direct URL access, stale-session rejection and phone layouts. Screenshots and results are written to ignored `artifacts/auth/`.

## Scope and next steps

Read `REBUILD-HANDOFF.md`. No gameplay, combat, campaign, character, catalog, chat or admin-management implementation has been transferred. Admin/Heavens/Realms/Crossroads links intentionally end at authenticated placeholders. This repository has no remote configured yet.
