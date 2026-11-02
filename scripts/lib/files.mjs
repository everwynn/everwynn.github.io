import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export function readJson(file, fallback = null) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export function writeJsonIfChanged(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  const next = `${JSON.stringify(data, null, 2)}\n`;
  const previous = existsSync(file) ? readFileSync(file, 'utf8') : null;
  if (previous === next) return false;
  writeFileSync(file, next, 'utf8');
  return true;
}

export function mergeSites(previousSites, nextSite) {
  if (nextSite.status !== 'unknown') return nextSite;
  const previous = previousSites.find((site) => site.id === nextSite.id);
  if (!previous) return nextSite;
  return {
    ...previous,
    status: 'unknown',
    statusLabel: '未知',
    statusDetail: nextSite.statusDetail ?? previous.statusDetail ?? '本轮未获取到数据',
  };
}
