import { Activity, buildWeeklyData, formatWeekLabel, getMonday } from './fitness-data';

const hours = (h: number) => h * 3600;

describe('getMonday', () => {
  it('returns the UTC Monday for mid-week and Sunday dates', () => {
    expect(getMonday(new Date('2026-09-23T15:00:00Z'))).toBe('2026-09-21'); // Wed
    expect(getMonday(new Date('2026-09-27T23:00:00Z'))).toBe('2026-09-21'); // Sun
    expect(getMonday(new Date('2026-09-28T00:30:00Z'))).toBe('2026-09-28'); // Mon
  });
});

describe('formatWeekLabel', () => {
  it('formats as short month and two-digit year', () => {
    expect(formatWeekLabel('2014-09-08')).toBe("Sep '14");
  });
});

describe('buildWeeklyData', () => {
  const activities: Activity[] = [
    { sport_type: 'Run', start_date: '2026-08-31T10:00:00Z', moving_time: hours(1) },
    { sport_type: 'Ride', start_date: '2026-09-02T10:00:00Z', moving_time: hours(2) },
    // week of 09-07 has nothing
    { sport_type: 'Run', start_date: '2026-09-15T10:00:00Z', moving_time: hours(3) },
  ];
  const today = new Date('2026-09-23T12:00:00Z');

  it('returns an empty array for no activities', () => {
    expect(buildWeeklyData([], new Set(), today)).toEqual([]);
  });

  it('buckets by week and fills gap weeks through today', () => {
    const weeks = buildWeeklyData(activities, new Set(), today);
    expect(weeks.map((w) => w.week)).toEqual([
      '2026-08-31',
      '2026-09-07',
      '2026-09-14',
      '2026-09-21',
    ]);
    expect(weeks.map((w) => w.volume)).toEqual([3, 0, 3, 0]);
  });

  it('averages fitness over six weeks, dividing by 6 from the start', () => {
    const weeks = buildWeeklyData(activities, new Set(), today);
    expect(weeks.map((w) => w.fitness)).toEqual([0.5, 0.5, 1, 1]);
  });

  it('filters by selected sports but keeps the full date span', () => {
    const weeks = buildWeeklyData(activities, new Set(['Ride']), today);
    expect(weeks).toHaveLength(4);
    expect(weeks.map((w) => w.volume)).toEqual([2, 0, 0, 0]);
  });

  it('drops weeks older than six from the fitness window', () => {
    const long: Activity[] = [
      { sport_type: 'Run', start_date: '2026-01-05T10:00:00Z', moving_time: hours(6) },
    ];
    const weeks = buildWeeklyData(long, new Set(), new Date('2026-02-16T12:00:00Z'));
    expect(weeks.map((w) => w.fitness)).toEqual([1, 1, 1, 1, 1, 1, 0]);
  });
});
