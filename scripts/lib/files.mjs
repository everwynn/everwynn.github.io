import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { STATUS_LABELS } from './status.mjs';

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
    // 可见性由本轮探测得出，不能被上一轮的快照覆盖，否则防抖计数永远停在 0
    visibility: nextSite.visibility ?? previous.visibility,
    privateRounds: nextSite.privateRounds ?? previous.privateRounds,
    status: 'unknown',
    statusLabel: STATUS_LABELS.unknown,
    statusDetail: nextSite.statusDetail ?? previous.statusDetail ?? '本轮未获取到数据',
  };
}
