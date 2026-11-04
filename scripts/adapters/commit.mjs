import { daysBetween } from '../lib/freshness.mjs';
import { STATUS_LABELS } from '../lib/status.mjs';

/**
 * 提交时间只能证明仓库可读，不能证明站点可用，也不代表内容过时。
 * 停更这件事交给卡片上的「最近更新 08-18」直接表达，不升级为告警。
 */
export function adaptCommit({ pushedAt }, now = new Date()) {
  const days = pushedAt ? daysBetween(now, pushedAt) : null;
  if (days === null) {
    return {
      lastCommitAt: pushedAt ?? null,
      dataUpdatedAt: null,
      status: 'unknown',
      statusLabel: STATUS_LABELS.unknown,
      statusDetail: '无法获取仓库提交时间',
      summary: null,
    };
  }
  return {
    lastCommitAt: pushedAt,
    dataUpdatedAt: null,
    status: 'ok',
    statusLabel: STATUS_LABELS.ok,
    statusDetail: null,
    summary: null,
  };
}
