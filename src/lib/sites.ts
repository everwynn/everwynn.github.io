import { readFileSync } from 'node:fs';

export type Category = 'learn' | 'data' | 'tool' | 'experience';
export type SiteStatus = 'ok' | 'warn' | 'error' | 'unknown';

export interface VisitSummary {
  totalPv: number;
  totalUv: number;
  d30Pv: number;
  d30Uv: number;
  series: Array<{ day: string; pv: number }>;
  top: Array<{ path: string; pv: number }>;
}

export interface StatsFile {
  updatedAt: string;
  window: number;
  sites: Record<string, VisitSummary>;
  total: { pv: number; uv: number };
}

export interface SiteRecord {
  id: string;
  name: string;
  url: string;
  repo: string;
  category: Category;
  description: string;
  tech: string[];
  lastCommitAt: string | null;
  dataUpdatedAt: string | null;
  status: SiteStatus;
  statusLabel: string;
  statusDetail: string | null;
  summary: { label: string; detail: string | null } | null;
  order: number;
}

export interface SiteEntry extends SiteRecord {
  visits: VisitSummary | null;
}

interface SitesFile {
  updatedAt: string;
  sites: SiteRecord[];
}

const data = JSON.parse(
  readFileSync(new URL('../../data/sites.json', import.meta.url), 'utf8'),
) as SitesFile;

// 统计快照缺失或损坏时降级为 null，页面不显示任何浏览数字
export const stats: StatsFile | null = (() => {
  try {
    return JSON.parse(
      readFileSync(new URL('../../data/stats.json', import.meta.url), 'utf8'),
    ) as StatsFile;
  } catch {
    return null;
  }
})();

export function getStats(): StatsFile | null {
  return stats;
}

export function getSiteStats(id: string): VisitSummary | null {
  return stats?.sites?.[id] ?? null;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  learn: '学习',
  data: '数据',
  tool: '工具',
  experience: '体验',
};

export const CATEGORY_ORDER: Category[] = ['learn', 'data', 'tool', 'experience'];

export function getSites(): SiteEntry[] {
  return [...data.sites]
    .sort((a, b) => {
      const categoryDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
      return categoryDiff || a.order - b.order || a.name.localeCompare(b.name);
    })
    .map((site) => ({ ...site, visits: getSiteStats(site.id) }));
}

export function getUpdatedAt(): string {
  return data.updatedAt;
}

export function summarize(sites: SiteEntry[]) {
  const counts = { ok: 0, warn: 0, error: 0, unknown: 0 };
  for (const site of sites) counts[site.status] += 1;
  return counts;
}

export function groupByCategory(sites: SiteEntry[]) {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    sites: sites.filter((site) => site.category === category),
  })).filter((group) => group.sites.length > 0);
}

export function categoryCounts(sites: SiteEntry[]) {
  return groupByCategory(sites).map((group) => ({
    id: group.category,
    label: group.label,
    count: group.sites.length,
  }));
}
