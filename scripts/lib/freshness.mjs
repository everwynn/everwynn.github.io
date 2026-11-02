export const DAY_MS = 86_400_000;

export function daysBetween(now, iso) {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  return Math.floor((now.getTime() - then.getTime()) / DAY_MS);
}

export function freshness(iso, warnAfterDays, errorAfterDays, now = new Date()) {
  if (!iso) return 'unknown';
  const days = daysBetween(now, iso);
  if (days === null) return 'unknown';
  if (days <= warnAfterDays) return 'ok';
  if (days <= errorAfterDays) return 'warn';
  return 'error';
}
