import { freshness } from '../lib/freshness.mjs';
import { STATUS_LABELS } from '../lib/status.mjs';

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
      statusLabel: STATUS_LABELS.unknown,
      statusDetail: '缺少 health.json 汇总数据',
      summary: null,
    };
  }

  const total = Number(summary.total ?? 0);
  const ok = Number(summary.ok ?? 0);
  const failed = Number(summary.failed ?? 0);
  const today = Number(summary.todayCount ?? 0);

  // status 决定颜色，statusDetail 说明原因，summary 放数字，三者不重复。
  let status = 'ok';
  let statusDetail = null;

  if (total === 0) {
    status = 'error';
    statusDetail = '无可用信息源';
  } else if (failed > 0) {
    status = 'warn';
    statusDetail = `${ok}/${total} 源正常，${failed} 个失败`;
  }

  const age = freshness(updatedAt, 7, 30, now);
  if (status === 'ok' && age !== 'ok') {
    status = age;
    statusDetail = age === 'warn' ? '数据超过 7 天未更新' : '数据超过 30 天未更新';
  }

  return {
    lastCommitAt: pushedAt ?? null,
    dataUpdatedAt: updatedAt,
    status,
    statusLabel: STATUS_LABELS[status],
    statusDetail,
    summary: { label: `${ok}/${total} 源正常`, detail: `今日 ${today} 条` },
  };
}
