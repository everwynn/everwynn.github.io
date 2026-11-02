import { freshness } from '../lib/freshness.mjs';

export function adaptPulse({ pushedAt, files }, now = new Date()) {
  const health = files?.['data/health.json'] ?? null;
  const index = files?.['data/index.json'] ?? null;
  const updatedAt = health?.updatedAt ?? index?.updatedAt ?? null;
  const summary = health?.summary ?? null;

  if (!summary) {
    return {
      lastCommitAt: pushedAt ?? null,
      dataUpdatedAt: updatedAt,
      status: 'unknown',
      statusLabel: '未知',
      statusDetail: '缺少 health.json 汇总数据',
      summary: null,
    };
  }

  const total = Number(summary.total ?? 0);
  const ok = Number(summary.ok ?? 0);
  const failed = Number(summary.failed ?? 0);
  const today = Number(summary.todayCount ?? 0);

  let status = 'ok';
  let statusLabel = `${ok}/${total} 源正常`;

  if (total === 0) {
    status = 'error';
    statusLabel = '无可用信息源';
  } else if (failed > 0) {
    status = 'warn';
    statusLabel = `${failed} 个源失败`;
  }

  const age = freshness(updatedAt, 7, 30, now);
  if (status === 'ok' && age !== 'ok') {
    status = age;
    statusLabel = age === 'warn' ? '数据偏旧' : '数据过期';
  }

  return {
    lastCommitAt: pushedAt ?? null,
    dataUpdatedAt: updatedAt,
    status,
    statusLabel,
    statusDetail: failed > 0 ? `${ok}/${total} 源正常，${failed} 个失败` : null,
    summary: { label: `${ok}/${total} 源正常`, detail: `今日 ${today} 条` },
  };
}
