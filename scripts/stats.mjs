import { writeJsonIfChanged } from './lib/files.mjs';

export const STATS_SITES = [
  'station',
  'cs-lab',
  'lucky-hub',
  'pulse-hub',
  'repo-rank',
  'tech-radar',
];

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 0;
};

export function toSnapshot(payload, days = 30, now = new Date()) {
  const sourceSites = payload?.sites && typeof payload.sites === 'object' ? payload.sites : {};
  const sites = {};

  for (const id of STATS_SITES) {
    const entry = sourceSites[id];
    if (!entry || typeof entry !== 'object') continue;

    const rawSeries = Array.isArray(entry.series) ? entry.series.slice(-days) : [];
    const series = rawSeries
      .map((point) => ({ day: String(point?.day ?? ''), pv: toNumber(point?.pv) }))
      .filter((point) => point.day);

    const top = (Array.isArray(entry.top) ? entry.top.slice(0, 20) : [])
      .map((item) => ({ path: String(item?.path ?? ''), pv: toNumber(item?.pv) }))
      .filter((item) => item.path);

    sites[id] = {
      totalPv: toNumber(entry?.totals?.pv),
      totalUv: toNumber(entry?.totals?.uv),
      d30Pv: series.reduce((sum, point) => sum + point.pv, 0),
      d30Uv: rawSeries.reduce((sum, point) => sum + toNumber(point?.uv), 0),
      series,
      top,
    };
  }

  return {
    updatedAt: now.toISOString(),
    window: days,
    sites,
    total: {
      pv: Object.values(sites).reduce((sum, site) => sum + site.totalPv, 0),
      uv: Object.values(sites).reduce((sum, site) => sum + site.totalUv, 0),
    },
  };
}

export async function fetchStats({ endpoint, days = 30, timeoutMs = 8000 }) {
  const base = String(endpoint || '').replace(/\/+$/, '');
  if (!base) throw new Error('缺少统计端点');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${base}/stats/all?days=${days}`, {
      headers: { 'user-agent': 'everwynn-station/1.0 (+https://everwynn.github.io/)' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export function writeStats(file, snapshot) {
  return writeJsonIfChanged(file, snapshot);
}
