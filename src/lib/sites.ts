import { readFileSync } from 'node:fs';

export type Category = 'learn' | 'data' | 'tool' | 'experience';
export type SiteStatus = 'ok' | 'warn' | 'error' | 'unknown';
export type SiteVisibility = 'public' | 'private';

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
  /** 连续两轮确认仓库不可公开访问后为 private，此时不对外展示 */
  visibility?: SiteVisibility;
  /** 连续判定为不可见的轮数，达到阈值后 visibility 才转为 private */
  privateRounds?: number;
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
  // 顺序完全由 config 的 order 决定：各站不再按分类聚在一起，分类只用于筛选。
  // private 表示仓库已连续两轮不可访问（转私有、删除或改名），对访客不再有入口意义。
  return [...data.sites]
    .filter((site) => site.visibility !== 'private')
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
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
