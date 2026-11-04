import { freshness } from '../lib/freshness.mjs';
import { STATUS_LABELS } from '../lib/status.mjs';

// 版本雷达已改成「自己输版本、实时对比」，清单里不再有「当前版本」，
// 所以门户这里只反映站点自身健康度（数据是否新鲜、抓取是否成功），
// 不再统计「几项技术需升级」——那个数字已经没有含义了。
export function adaptTechRadar({ pushedAt, files }, now = new Date()) {
  const catalog = files?.['data/catalog.json'] ?? null;
  const updatedAt = catalog?.updatedAt ?? null;

  if (!catalog || !Array.isArray(catalog.items)) {
    return {
      lastCommitAt: pushedAt ?? null,
      dataUpdatedAt: updatedAt,
      status: 'unknown',
      statusLabel: STATUS_LABELS.unknown,
      statusDetail: '缺少 catalog.json',
      summary: null,
    };
  }

  const items = catalog.items;
  const withLifecycle = items.filter((item) => Array.isArray(item.cycles) && item.cycles.length > 0).length;
  const withVulns = items.filter((item) => item.osv).length;
  const missing = items.filter((item) => !item.latest).length;
  const stale = items.filter((item) => item.stale).length;
  const brokenSources = Object.values(catalog.sources ?? {}).filter((state) => state !== 'ok').length;

  let status = 'ok';
  let statusDetail = null;

  const age = freshness(updatedAt, 3, 7, now);
  if (age !== 'ok') {
    status = age === 'unknown' ? 'warn' : age;
    statusDetail =
      age === 'warn' ? '数据超过 3 天未更新' : age === 'error' ? '数据超过 7 天未更新' : '缺少更新时间';
  } else if (missing > 0) {
    status = 'error';
    statusDetail = `${missing} 项未取到版本数据`;
  } else if (brokenSources > 0) {
    status = 'warn';
    statusDetail = `${brokenSources} 个数据源异常`;
  } else if (stale > 0) {
    status = 'warn';
    statusDetail = `${stale} 项沿用上次数据`;
  }

  return {
    lastCommitAt: pushedAt ?? null,
    dataUpdatedAt: updatedAt,
    status,
    statusLabel: STATUS_LABELS[status],
    statusDetail,
    summary: {
      label: `${items.length} 项技术`,
      detail: withLifecycle > 0 ? `${withLifecycle} 项有 EOL · ${withVulns} 项可查漏洞` : `${withVulns} 项可查漏洞`,
    },
  };
}
