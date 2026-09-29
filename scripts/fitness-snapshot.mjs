// scripts/fitness-snapshot.mjs
//
// Syncs new Strava activities into Postgres, then writes a trimmed public
// snapshot (sport, start date, moving time only) for the /fitness page.
// Ported from ~/sean-fitness (lib/strava.ts, app/api/strava/sync/route.ts).
//
// Usage: node scripts/fitness-snapshot.mjs [outPath]
// Env:   DATABASE_URL, STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import pg from 'pg';

const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const outPath = process.argv[2] ?? 'public/fitness.json';

for (const name of ['DATABASE_URL', 'STRAVA_CLIENT_ID', 'STRAVA_CLIENT_SECRET']) {
  if (!process.env[name]) {
    console.error(`Missing required env var ${name}`);
    process.exit(1);
  }
}

const db = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

/**
 * Exchange a refresh token for a new access token. Strava rotates
 * refresh tokens, so always persist the new one you get back.
 */
async function refreshAccessToken(refreshToken) {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) {
    throw new Error(`Strava token refresh failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

/** Return a valid access token, refreshing if it expires within 5 minutes. */
async function getValidAccessToken(stored) {
  const now = Math.floor(Date.now() / 1000);
  if (stored.expires_at - 5 * 60 > now) return stored;

  const refreshed = await refreshAccessToken(stored.refresh_token);
  return {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    expires_at: refreshed.expires_at,
  };
}

/** Fetch all activities after afterEpoch (unix seconds), 200 per page. */
async function fetchAllActivities(accessToken, afterEpoch = 0) {
  const all = [];
  for (let page = 1; ; page++) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=200&page=${page}&after=${afterEpoch}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!res.ok) throw new Error(`Strava fetch failed: ${res.status}`);
    const batch = await res.json();
    if (!batch.length) break;
    all.push(...batch);
  }
  return all;
}

async function sync() {
  const { rows: tokenRows } = await db.query(
    `select access_token, refresh_token, expires_at, athlete_id from strava_tokens limit 1`,
  );
  if (!tokenRows[0]) throw new Error('No Strava tokens stored; authorize via sean-fitness first');

  const stored = tokenRows[0];
  const fresh = await getValidAccessToken({
    access_token: stored.access_token,
    refresh_token: stored.refresh_token,
    expires_at: Number(stored.expires_at),
  });

  if (fresh.refresh_token !== stored.refresh_token) {
    await db.query(
      `update strava_tokens set access_token=$1, refresh_token=$2, expires_at=$3 where athlete_id=$4`,
      [fresh.access_token, fresh.refresh_token, fresh.expires_at, stored.athlete_id],
    );
  }

  // Use the most recent stored activity as an incremental cursor
  const { rows: latest } = await db.query(
    `select extract(epoch from start_date)::bigint as after
     from activities where athlete_id = $1
     order by start_date desc limit 1`,
    [stored.athlete_id],
  );
  const afterEpoch = Number(latest[0]?.after ?? 0);

  const activities = await fetchAllActivities(fresh.access_token, afterEpoch);

  for (const a of activities) {
    await db.query(
      `insert into activities
         (id, athlete_id, name, sport_type, start_date, elapsed_time, moving_time,
          distance, elevation_gain, average_speed, max_speed, average_hr, max_hr,
          average_watts, suffer_score, trainer, raw)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       on conflict (id) do update set name=$3, raw=$17`,
      [
        a.id,
        a.athlete?.id ?? stored.athlete_id,
        a.name,
        a.sport_type,
        a.start_date,
        a.elapsed_time,
        a.moving_time,
        a.distance,
        a.total_elevation_gain,
        a.average_speed,
        a.max_speed,
        a.average_heartrate ?? null,
        a.max_heartrate ?? null,
        a.average_watts ?? null,
        a.suffer_score ?? null,
        a.trainer ?? false,
        JSON.stringify(a),
      ],
    );
  }

  console.log(`Synced ${activities.length} new activities (after ${afterEpoch})`);
}

async function exportSnapshot() {
  const { rows } = await db.query(
    `select sport_type, start_date, moving_time from activities order by start_date asc`,
  );
  const snapshot = {
    generated_at: new Date().toISOString(),
    activities: rows.map((r) => ({
      sport_type: r.sport_type,
      start_date: new Date(r.start_date).toISOString(),
      moving_time: r.moving_time,
    })),
  };
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(snapshot));
  console.log(`Wrote ${rows.length} activities to ${outPath}`);
}

try {
  await sync();
  await exportSnapshot();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await db.end();
}
