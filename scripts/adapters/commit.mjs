import { daysBetween } from '../lib/freshness.mjs';

export function adaptCommit({ pushedAt }, now = new Date()) {
  const days = pushedAt ? daysBetween(now, pushedAt) : null;
  if (days === null) {
    return {
      lastCommitAt: pushedAt ?? null,
      dataUpdatedAt: null,
      status: 'unknown',
      statusLabel: '未知',
      statusDetail: '无法获取仓库提交时间',
      summary: null,
    };
  }
  const stale = days > 90;
  return {
    lastCommitAt: pushedAt,
    dataUpdatedAt: null,
    status: stale ? 'warn' : 'ok',
    statusLabel: stale ? `${days} 天未更新` : '正常',
    statusDetail: null,
    summary: null,
  };
}
