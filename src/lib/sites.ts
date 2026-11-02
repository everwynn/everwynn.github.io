import { readFileSync } from 'node:fs';

export type Category = 'learn' | 'data' | 'tool' | 'experience';
export type SiteStatus = 'ok' | 'warn' | 'error' | 'unknown';

export interface SiteEntry {
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

interface SitesFile {
  updatedAt: string;
  sites: SiteEntry[];
}

const data = JSON.parse(
  readFileSync(new URL('../../data/sites.json', import.meta.url), 'utf8'),
) as SitesFile;

export const CATEGORY_LABELS: Record<Category, string> = {
  learn: '学习',
  data: '数据',
  tool: '工具',
  experience: '体验',
};

export const CATEGORY_ORDER: Category[] = ['learn', 'data', 'tool', 'experience'];

export function getSites(): SiteEntry[] {
  return [...data.sites].sort((a, b) => {
    const categoryDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    return categoryDiff || a.order - b.order || a.name.localeCompare(b.name);
  });
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
