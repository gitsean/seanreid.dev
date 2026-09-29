# seanreid.dev

Personal site, built with Angular 22 and Angular Material (M3). Deployed to the
self-hosted mini computer by `.github/workflows/deploy.yml`. See
`docs/self-hosting-migration.md` for the hosting setup.

Requires Node 24 (`nvm use` picks it up from `.nvmrc`).

## Commands

```bash
npm start        # dev server at http://localhost:4200
npm run build    # production build into html/
npm test         # unit tests (Vitest)
```

## Fitness page

`/fitness` charts weekly training volume from Strava. The page is static: it
reads `public/fitness.json`, which `scripts/fitness-snapshot.mjs` generates by
syncing new Strava activities into the sean-fitness Postgres database and
exporting only sport type, start date and moving time.

CI runs the snapshot on every deploy and nightly at 09:00 UTC. If it fails, the
previously deployed snapshot is reused. It needs these repo secrets:
`DATABASE_URL`, `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`.

`DATABASE_URL` must be Supabase's **session pooler** URL
(`postgresql://postgres.<ref>:<password>@aws-0-us-west-2.pooler.supabase.com:5432/postgres`).
The direct `db.<ref>.supabase.co` host is IPv6-only and won't resolve on an
IPv4-only network.

Run it locally with:

```bash
DATABASE_URL='<pooler url>' node --env-file ~/sean-fitness/.env.local scripts/fitness-snapshot.mjs
```
