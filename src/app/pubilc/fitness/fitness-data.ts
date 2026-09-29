// Weekly volume / fitness aggregation, ported from
// ~/sean-fitness/app/components/FitnessChart.tsx.

export interface Activity {
  sport_type: string;
  start_date: string;
  moving_time: number;
}

export interface FitnessSnapshot {
  generated_at: string;
  activities: Activity[];
}

export interface WeekData {
  week: string;
  label: string;
  volume: number;
  fitness: number;
}

// Weeks are computed in UTC so every visitor sees the same buckets regardless
// of their timezone (the original mixed local time with toISOString()).

/** ISO date (YYYY-MM-DD) of the UTC Monday starting the week containing `date`. */
export function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export function formatWeekLabel(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00Z');
  const year = d.getUTCFullYear().toString().slice(2);
  const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
  return `${month} '${year}`;
}

/**
 * Bucket activities into weeks (hours of moving time) and compute a 6-week
 * trailing average as "fitness". An empty `selected` set means all sports.
 * `today` is injectable for tests.
 */
export function buildWeeklyData(
  activities: Activity[],
  selected: ReadonlySet<string>,
  today: Date = new Date(),
): WeekData[] {
  if (!activities.length) return [];

  const filtered =
    selected.size === 0 ? activities : activities.filter((a) => selected.has(a.sport_type));

  const weekMap = new Map<string, number>();
  for (const a of filtered) {
    const week = getMonday(new Date(a.start_date));
    weekMap.set(week, (weekMap.get(week) ?? 0) + a.moving_time);
  }

  // Span from the earliest activity (across all sports) to today
  const earliest = getMonday(new Date(activities[0].start_date));
  const current = getMonday(today);

  const weeks: string[] = [];
  const cursor = new Date(earliest + 'T00:00:00Z');
  const end = new Date(current + 'T00:00:00Z');
  while (cursor <= end) {
    weeks.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  const volumeByWeek = weeks.map((w) => (weekMap.get(w) ?? 0) / 3600);

  return weeks.map((week, i) => {
    const window = volumeByWeek.slice(Math.max(0, i - 5), i + 1);
    // Always divide by 6 so fitness builds gradually from the start
    const fitness = window.reduce((a, b) => a + b, 0) / 6;
    return {
      week,
      label: formatWeekLabel(week),
      volume: Math.round(volumeByWeek[i] * 10) / 10,
      fitness: Math.round(fitness * 10) / 10,
    };
  });
}
